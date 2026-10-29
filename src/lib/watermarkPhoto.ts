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

const MAX_DIMENSION = 1200; // Optimized: saves ~44% canvas RAM & ~40% rasterization time
const JPEG_QUALITY = 0.80; // Optimized: cuts file size by ~35-45% for 2x faster uploads
const MAX_OUTPUT_BYTES = 2.5 * 1024 * 1024; // 2.5 MB maximum
const MAP_FETCH_TIMEOUT = 3500;
const OLC_ALPHABET = '23456789CFGHJMPQRVWX';

/**
 * Burns a GPS-Map-Camera style watermark into the photo.
 * Returns the ORIGINAL file if anything catastrophically fails.
 */
export async function watermarkPhoto(
  file: File,
  opts: WatermarkOptions
): Promise<File> {
  let canvas: HTMLCanvasElement | null = null;
  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(file);

    // Pre-fetch a static map tile (best-effort; may be null)
    let mapImg: HTMLImageElement | null = null;
    if (opts.latitude != null && opts.longitude != null) {
      mapImg = await loadStaticMap(opts.latitude, opts.longitude).catch(
        () => null
      );
    }

    canvas = drawWatermarked(img, opts, mapImg);

    // Release source image memory early once rasterized to canvas
    try {
      img.src = '';
    } catch {
      // ignore
    }

    let blob = await canvasToBlob(canvas, JPEG_QUALITY);
    if (!blob) {
      blob = dataUrlToBlob(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    }
    if (!blob || blob.size === 0) {
      console.warn('[watermark] empty blob — using original');
      return file;
    }

    // Quality-reduction loop
    let finalBlob = blob;
    let quality = JPEG_QUALITY;
    while (finalBlob.size > MAX_OUTPUT_BYTES && quality > 0.5) {
      quality = Math.max(0.5, quality - 0.1);
      const retry = await canvasToBlob(canvas, quality);
      if (retry && retry.size > 0) {
        finalBlob = retry;
      } else {
        break;
      }
    }

    // Explicitly release GPU canvas texture buffer to prevent memory leaks
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }

    if (finalBlob.size > MAX_OUTPUT_BYTES) {
      console.warn(
        `[watermark] still ${finalBlob.size} bytes after reduction — using original`
      );
      return file;
    }

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
    return file;
  } finally {
    if (canvas && (canvas.width > 0 || canvas.height > 0)) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

/* ─────────────────────────────────────────────────────────
   MAIN DRAW
   ───────────────────────────────────────────────────────── */

function drawWatermarked(
  img: HTMLImageElement,
  opts: WatermarkOptions,
  mapImg: HTMLImageElement | null
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

  // Fill black (protects PNG-with-transparency → JPEG conversion)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  drawGpsPanel(ctx, width, height, mapImg, opts);

  return canvas;
}

/* ─────────────────────────────────────────────────────────
   GPS PANEL (GPS Map Camera style)
   ───────────────────────────────────────────────────────── */

function drawGpsPanel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mapImg: HTMLImageElement | null,
  opts: WatermarkOptions
) {
  const ts = opts.timestamp ?? new Date();

  // ── Panel geometry ────────────────────────────────────
  const sideMargin = Math.round(width * 0.025);
  const bottomMargin = Math.round(width * 0.025);
  const panelWidth = width - sideMargin * 2;
  const panelHeight = Math.min(
    Math.round(height * 0.26),
    Math.round(panelWidth * 0.42)
  );
  const panelTop = height - panelHeight - bottomMargin;
  const panelLeft = sideMargin;
  const panelRadius = Math.round(panelHeight * 0.09);
  const innerPad = Math.round(panelHeight * 0.09);

  // ── Draw panel background ────────────────────────────
  ctx.save();
  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  roundRect(ctx, panelLeft, panelTop, panelWidth, panelHeight, panelRadius);
  ctx.fill();
  ctx.restore();

  // ── Map thumbnail (left) ─────────────────────────────
  const mapSize = panelHeight - innerPad * 2;
  const mapLeft = panelLeft + innerPad;
  const mapTop = panelTop + innerPad;
  const mapRadius = Math.round(mapSize * 0.08);

  ctx.save();
  roundRect(ctx, mapLeft, mapTop, mapSize, mapSize, mapRadius);
  ctx.clip();

  if (mapImg && mapImg.width > 0) {
    // Cover-fit the tile into the square
    const scale = Math.max(mapSize / mapImg.width, mapSize / mapImg.height);
    const w = mapImg.width * scale;
    const h = mapImg.height * scale;
    const dx = mapLeft + (mapSize - w) / 2;
    const dy = mapTop + (mapSize - h) / 2;
    ctx.drawImage(mapImg, dx, dy, w, h);
  } else {
    // Fallback: light gray tile
    ctx.fillStyle = '#e8eaed';
    ctx.fillRect(mapLeft, mapTop, mapSize, mapSize);
    ctx.fillStyle = '#c9ccd1';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(
        mapLeft + (i * mapSize) / 5,
        mapTop,
        1,
        mapSize
      );
      ctx.fillRect(
        mapLeft,
        mapTop + (i * mapSize) / 5,
        mapSize,
        1
      );
    }
  }

  // Red pin at center
  drawMapPin(ctx, mapLeft + mapSize / 2, mapTop + mapSize / 2, mapSize * 0.13);

  ctx.restore();

  // Map border
  ctx.save();
  roundRect(ctx, mapLeft, mapTop, mapSize, mapSize, mapRadius);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = Math.max(1, Math.round(mapSize * 0.012));
  ctx.stroke();
  ctx.restore();

  // ── Info column (right) ──────────────────────────────
  const infoLeft = mapLeft + mapSize + innerPad * 0.9;
  const infoRight = panelLeft + panelWidth - innerPad;
  const infoWidth = infoRight - infoLeft;
  const infoTop = panelTop + innerPad;

  // Split address into city / area / country
  const { city, country, area } = splitAddress(opts.address);

  // Fonts (scaled to panel height)
  const fsCity = Math.max(13, Math.round(panelHeight * 0.135));
  const fsArea = Math.max(11, Math.round(panelHeight * 0.095));
  const fsCoords = Math.max(10, Math.round(panelHeight * 0.085));
  const fsDate = Math.max(10, Math.round(panelHeight * 0.09));
  const fsTime = Math.max(11, Math.round(panelHeight * 0.1));
  const fsFooter = Math.max(9, Math.round(panelHeight * 0.062));

  const fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  // Row 1: pin icon + flag + "City, Country" ......... time
  let y = infoTop + fsCity;

  // Pin icon
  const iconSize = fsCity * 1.05;
  drawPinIcon(ctx, infoLeft + iconSize / 2, infoTop + fsCity * 0.42, iconSize * 0.42, '#ff4d4d');
  let cursorX = infoLeft + iconSize * 1.05;

  // India flag (or generic flag)
  const flagW = fsCity * 1.5;
  const flagH = fsCity * 1.0;
  drawFlag(ctx, cursorX, infoTop + (fsCity - flagH) / 2 + fsCity * 0.08, flagW, flagH, country);
  cursorX += flagW + fsCity * 0.4;

  // City, Country (bold white)
  ctx.font = `800 ${fsCity}px ${fontFamily}`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  const cityText = [city, country].filter(Boolean).join(', ') || 'Location';
  ctx.fillText(cityText, cursorX, y);

  // Time (right-aligned, bold)
  ctx.font = `800 ${fsTime}px ${fontFamily}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  const timeText = ts.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  ctx.fillText(timeText, infoRight, y);
  ctx.textAlign = 'left';

  // Row 2: area / locality (light gray, smaller)
  y += fsArea * 1.55;
  ctx.font = `500 ${fsArea}px ${fontFamily}`;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  const areaText = area || '—';
  ctx.fillText(truncate(ctx, areaText, infoWidth), infoLeft, y);

  // Row 3: coordinates + plus code
  y += fsCoords * 1.85;
  const coordsText =
    opts.latitude != null && opts.longitude != null
      ? `${formatLat(opts.latitude)}, ${formatLon(opts.longitude)}`
      : '';
  const plusCode =
    opts.latitude != null && opts.longitude != null
      ? encodePlusCode(opts.latitude, opts.longitude).short
      : '';

  ctx.font = `600 ${fsCoords}px ${fontFamily}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(coordsText, infoLeft, y);

  if (plusCode) {
    // Plus code on the right side of the coords row
    ctx.font = `700 ${fsCoords}px ${fontFamily}`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'right';
    ctx.fillText(plusCode, infoRight, y);
    ctx.textAlign = 'left';
  }

  // Row 4: date with calendar icon
  y += fsDate * 1.85;
  const calSize = fsDate * 1.05;
  drawCalendarIcon(
    ctx,
    infoLeft + calSize / 2,
    y - fsDate * 0.62,
    calSize * 0.9
  );
  const dateText = ts.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  ctx.font = `600 ${fsDate}px ${fontFamily}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(dateText, infoLeft + calSize + fsDate * 0.35, y);

  // ── Footer strip: "GPS MAP CAMERA" ────────────────
  const footerHeight = Math.max(16, Math.round(fsFooter * 2.1));
  const footerTop = panelTop + panelHeight - footerHeight;
  ctx.save();
  roundRect(
    ctx,
    panelLeft,
    footerTop,
    panelWidth,
    footerHeight,
    0
  );
  ctx.clip();
  // Re-rounded bottom corners
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  roundRect(
    ctx,
    panelLeft,
    footerTop,
    panelWidth,
    footerHeight + panelRadius,
    panelRadius
  );
  ctx.fill();
  ctx.restore();

  // Separator line above footer
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelLeft + 6, footerTop);
  ctx.lineTo(panelLeft + panelWidth - 6, footerTop);
  ctx.stroke();

  // Footer text centered
  ctx.font = `700 ${fsFooter}px ${fontFamily}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const footerY = footerTop + footerHeight / 2;

  const label = 'GPS MAP CAMERA';
  const camSize = fsFooter * 1.3;
  // Measure combined width
  const labelW = ctx.measureText(label).width;
  const totalW = labelW + camSize + fsFooter * 0.5;
  const startX = panelLeft + panelWidth / 2 - totalW / 2;

  ctx.textAlign = 'left';
  ctx.fillText(label, startX, footerY);
  drawCameraIcon(
    ctx,
    startX + labelW + fsFooter * 0.5,
    footerY,
    camSize
  );

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/* ─────────────────────────────────────────────────────────
   ICONS
   ───────────────────────────────────────────────────────── */

function drawMapPin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
) {
  // Red teardrop pin
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = size * 0.4;
  ctx.shadowOffsetY = size * 0.15;

  const topY = cy - size * 1.1;
  const botY = cy + size * 0.9;
  const r = size;

  ctx.beginPath();
  ctx.moveTo(cx, botY);
  ctx.bezierCurveTo(
    cx - r * 1.05,
    cy - r * 0.1,
    cx - r,
    topY,
    cx,
    topY
  );
  ctx.bezierCurveTo(
    cx + r,
    topY,
    cx + r * 1.05,
    cy - r * 0.1,
    cx,
    botY
  );
  ctx.closePath();
  ctx.fillStyle = '#ea4335';
  ctx.fill();
  ctx.restore();

  // White inner circle
  ctx.beginPath();
  ctx.arc(cx, topY + r * 0.55, r * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function drawPinIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy + size);
  ctx.bezierCurveTo(
    cx - size,
    cy,
    cx - size,
    cy - size * 1.2,
    cx,
    cy - size * 1.2
  );
  ctx.bezierCurveTo(
    cx + size,
    cy - size * 1.2,
    cx + size,
    cy,
    cx,
    cy + size
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.4, size * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

function drawFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  country: string
) {
  ctx.save();
  // Rounded clip
  roundRect(ctx, x, y, w, h, h * 0.15);
  ctx.clip();

  const isIndia = /india/i.test(country);

  if (isIndia) {
    // Saffron / White / Green
    ctx.fillStyle = '#FF9933';
    ctx.fillRect(x, y, w, h / 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y + h / 3, w, h / 3);
    ctx.fillStyle = '#138808';
    ctx.fillRect(x, y + (h * 2) / 3, w, h / 3);

    // Blue chakra
    const ccx = x + w / 2;
    const ccy = y + h / 2;
    const r = h * 0.14;
    ctx.strokeStyle = '#000080';
    ctx.lineWidth = Math.max(0.7, h * 0.025);
    ctx.beginPath();
    ctx.arc(ccx, ccy, r, 0, Math.PI * 2);
    ctx.stroke();
    // Spokes
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(ccx, ccy);
      ctx.lineTo(ccx + Math.cos(a) * r, ccy + Math.sin(a) * r);
      ctx.stroke();
    }
  } else {
    // Generic globe-ish icon for other countries
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, h * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Thin border
  ctx.save();
  roundRect(ctx, x, y, w, h, h * 0.15);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(1, h * 0.06);
  ctx.stroke();
  ctx.restore();
}

function drawCalendarIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
) {
  ctx.save();
  const w = size;
  const h = size * 0.92;
  const x = cx - w / 2;
  const y = cy - h / 2 + size * 0.08;
  const r = size * 0.15;

  // Body
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Top bar (red)
  ctx.save();
  roundRect(ctx, x, y, w, h * 0.32, r);
  ctx.clip();
  ctx.fillStyle = '#ea4335';
  ctx.fillRect(x, y, w, h * 0.32);
  ctx.restore();

  // Header dots
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y + h * 0.42, w, Math.max(0.8, size * 0.06));
  ctx.fillRect(x + w * 0.25, y + h * 0.6, w * 0.5, Math.max(0.8, size * 0.06));

  ctx.restore();
}

function drawCameraIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  cy: number,
  size: number
) {
  const w = size;
  const h = size * 0.75;
  const y = cy - h / 2;

  // Body
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, w, h, size * 0.15);
  ctx.fill();

  // Top bump
  ctx.fillRect(x + w * 0.3, y - size * 0.1, w * 0.4, size * 0.12);

  // Lens
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, size * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#4b9cd3';
  ctx.fill();
}

/* ─────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────── */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + '…';
}

function formatLat(lat: number): string {
  const dir = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(4)}°${dir}`;
}

function formatLon(lon: number): string {
  const dir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lon).toFixed(4)}°${dir}`;
}

/**
 * Heuristically split a Nominatim display_name into
 *   { city, country, area }
 */
function splitAddress(address: string | null | undefined): {
  city: string;
  country: string;
  area: string;
} {
  if (!address) return { city: '', country: '', area: '' };
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return { city: '', country: '', area: '' };

  const country = parts[parts.length - 1];
  const nonNumeric = parts.filter((p) => !/^\d{3,}$/.test(p));
  const nonCountry = nonNumeric.filter((p) => p !== country);
  const city = nonCountry[nonCountry.length - 1] || '';
  const area = nonCountry[0] || '';
  return { city, country, area };
}

/* ─────────────────────────────────────────────────────────
   PLUS CODE (Open Location Code)
   ───────────────────────────────────────────────────────── */

function encodePlusCode(
  lat: number,
  lon: number
): { full: string; short: string } {
  const latC = Math.max(-90, Math.min(90 - 1e-9, lat));
  const lonC = Math.max(-180, Math.min(180 - 1e-9, lon));

  let la = latC + 90;
  let lo = lonC + 180;

  const digits: string[] = [];
  let latRes = 20;
  let lonRes = 20;

  for (let i = 0; i < 5; i++) {
    const latDigit = Math.floor(la / latRes);
    const lonDigit = Math.floor(lo / lonRes);
    digits.push(OLC_ALPHABET[latDigit], OLC_ALPHABET[lonDigit]);
    la -= latDigit * latRes;
    lo -= lonDigit * lonRes;
    latRes /= 20;
    lonRes /= 20;
  }

  const full =
    digits.slice(0, 8).join('') + '+' + digits.slice(8, 10).join('');
  const short =
    digits.slice(4, 8).join('') + '+' + digits.slice(8, 10).join('');

  return { full, short };
}

/* ─────────────────────────────────────────────────────────
   STATIC MAP TILE (CartoDB Voyager — CORS-enabled)
   ───────────────────────────────────────────────────────── */

function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) +
          1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

async function loadStaticMap(
  lat: number,
  lon: number,
  zoom = 16
): Promise<HTMLImageElement | null> {
  const x = lon2tile(lon, zoom);
  const y = lat2tile(lat, zoom);
  // CartoDB Voyager (Google-Maps-like). @2x for retina sharpness.
  const url = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}@2x.png`;
  return loadImageCrossOrigin(url, MAP_FETCH_TIMEOUT);
}

function loadImageCrossOrigin(
  url: string,
  timeoutMs: number
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => {
      reject(new Error('Image load timed out'));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

/* ─────────────────────────────────────────────────────────
   LOW-LEVEL LOADERS
   ───────────────────────────────────────────────────────── */

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
  return (
    name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'photo.jpg'
  );
}
