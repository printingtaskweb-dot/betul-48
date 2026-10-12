// src/lib/watermarkPhoto.ts

export interface WatermarkOptions {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  address?: string | null;
  timestamp?: Date;
  departmentName?: string | null;
  appName?: string;
}

/**
 * Max long-edge dimension. 1280 is plenty for a complaint photo,
 * keeps file size small so we never have to silently downgrade to
 * the un-watermarked original.
 */
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024; // 4 MB hard cap
const MIN_QUALITY = 0.5;

/**
 * Burns a GPS-camera style watermark into the photo.
 * Always returns a JPEG File. If absolutely everything fails,
 * returns the ORIGINAL file so the upload never breaks — but this
 * is logged loudly so you can spot it in the console.
 */
export async function watermarkPhoto(
  file: File,
  opts: WatermarkOptions
): Promise<File> {
  try {
    const img = await loadImage(file);
    const canvas = drawWatermarked(img, opts);

    // First attempt at default quality
    let blob = await canvasToBlob(canvas, JPEG_QUALITY);

    if (!blob) {
      // Fallback for iOS Safari where toBlob can be flaky
      blob = dataUrlToBlob(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    }

    if (!blob || blob.size === 0) {
      console.warn('[watermark] empty blob — using original');
      return file;
    }

    // If output is too large, re-encode at progressively lower quality.
    // We never silently return the un-watermarked original unless even
    // MIN_QUALITY can't get us under the cap.
    let finalBlob = blob;
    let quality = JPEG_QUALITY;

    while (finalBlob.size > MAX_OUTPUT_BYTES && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.1);
      const retry = await canvasToBlob(canvas, quality);
      if (retry && retry.size > 0) {
        finalBlob = retry;
      } else {
        try {
          finalBlob = dataUrlToBlob(
            canvas.toDataURL('image/jpeg', quality)
          );
        } catch {
          break;
        }
      }
    }

    if (!finalBlob || finalBlob.size === 0) {
      console.warn('[watermark] empty final blob — using original');
      return file;
    }

    if (finalBlob.size > MAX_OUTPUT_BYTES) {
      console.warn(
        `[watermark] still ${finalBlob.size} bytes after quality reduction — using original`
      );
      return file;
    }

    // ✅ Always output as .jpg so upload MIME + extension match
    const safeName = sanitizeName(file.name || 'photo.jpg');
    const jpgName = safeName.replace(/\.(png|webp|heic|heif|gif)$/i, '.jpg');
    const finalName = jpgName.toLowerCase().endsWith('.jpg')
      ? jpgName
      : `${jpgName}.jpg`;

    const out = new File([finalBlob], finalName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    console.log(
      `[watermark] ok: ${file.name} (${file.size}b) → ${out.name} (${out.size}b @ q=${quality.toFixed(2)})`
    );
    return out;
  } catch (err) {
    console.warn('[watermark] failed — uploading original', err);
    return file; // 🔑 never block the upload
  }
}

/* ---------- internals ---------- */

function drawWatermarked(
  img: HTMLImageElement,
  opts: WatermarkOptions
): HTMLCanvasElement {
  let { width, height } = img;
  if (!width || !height) {
    width = 800;
    height = 600;
  }
  if (Math.max(width, height) > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not available');

  // White background (protects PNG with transparency → JPEG)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const ts = opts.timestamp ?? new Date();
  const pad = Math.round(width * 0.028);
  const mainSize = Math.max(16, Math.round(width * 0.038));
  const smallSize = Math.max(12, Math.round(mainSize * 0.72));
  const lineGap = Math.round(mainSize * 1.35);

  const dateStr = ts
    .toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();

  const timeStr = ts.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  type Line = { text: string; size: number; weight: string };
  const lines: Line[] = [];

  lines.push({
    text: `${dateStr}  ${timeStr}`,
    size: mainSize,
    weight: '800',
  });

  if (opts.latitude != null && opts.longitude != null) {
    const acc =
      opts.accuracy != null && Number.isFinite(opts.accuracy)
        ? `   ±${Math.round(opts.accuracy)}m`
        : '';
    lines.push({
      text: `Lat ${opts.latitude.toFixed(6)}°  Long ${opts.longitude.toFixed(
        6
      )}°${acc}`,
      size: smallSize,
      weight: '700',
    });
  }

  if (opts.address) {
    const wrapped = wrapText(ctx, opts.address, width - pad * 2, smallSize);
    for (const w of wrapped.slice(0, 3)) {
      lines.push({ text: w, size: smallSize, weight: '500' });
    }
  }

  const tag = [opts.appName, opts.departmentName].filter(Boolean).join(' · ');
  if (tag) {
    lines.push({ text: tag, size: smallSize, weight: '700' });
  }

  let bannerHeight = pad + lines.length * lineGap;
  bannerHeight += Math.round(pad * 0.5);

  const bannerTop = height - bannerHeight;

  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, bannerTop, width, bannerHeight);

  const accentHeight = Math.max(3, Math.round(width * 0.006));
  ctx.fillStyle = '#660033';
  ctx.fillRect(0, bannerTop, width, accentHeight);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;

  let y = bannerTop + accentHeight + pad + Math.round(mainSize * 0.85);

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    ctx.font = `${l.weight} ${l.size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = i === 0 ? '#ffffff' : 'rgba(255,255,255,0.94)';
    ctx.fillText(l.text, pad, y);
    y += lineGap;
  }

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  return canvas;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load timed out'));
    }, 15000);

    img.onload = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number = JPEG_QUALITY
): Promise<Blob | null> {
  return new Promise((resolve) => {
    // Some browsers callback with null — we resolve it, caller handles fallback
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(meta)?.[1] || 'image/jpeg';
  const bin = atob(b64);
  const len = bin.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

function sanitizeName(name: string): string {
  // Keep letters, digits, dash, underscore, dot. Replace anything else.
  return (
    name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'photo.jpg'
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  const words = text.split(/\s+/);
  const out: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      out.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) out.push(current);
  return out;
}
