import { useState } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';

export interface UploadOptions {
  currentPhoto?: number;
  totalPhotos?: number;
  onProgress?: (percent: number, statusText: string) => void;
}

export function useStorage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [photoCount, setPhotoCount] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProgress = (pct: number, msg: string, cb?: (p: number, s: string) => void) => {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    setProgress(clamped);
    setStatusText(msg);
    if (cb) cb(clamped, msg);
  };

  const uploadPhoto = async (file: File, options?: UploadOptions): Promise<string | null> => {
    setUploading(true);
    setError(null);

    const current = options?.currentPhoto || 1;
    const total = options?.totalPhotos || 1;
    setPhotoCount({ current, total });

    updateProgress(
      15,
      `Preparing photo ${current} of ${total} for upload…`,
      options?.onProgress
    );

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const filePath = `complaints/${fileName}`;

    const jpegFile =
      file.type === 'image/jpeg'
        ? file
        : new File([file], fileName, { type: 'image/jpeg' });

    updateProgress(
      28,
      `Connecting to municipal cloud storage…`,
      options?.onProgress
    );

    // Try native XMLHttpRequest to get genuine byte-level upload progress
    const tryXhrUpload = (): Promise<boolean> => {
      return new Promise((resolve) => {
        try {
          const xhr = new XMLHttpRequest();
          const targetUrl = `${supabaseUrl}/storage/v1/object/complaint-photos/${filePath}`;
          xhr.open('POST', targetUrl);
          xhr.setRequestHeader('apikey', supabaseAnonKey);
          xhr.setRequestHeader('Authorization', `Bearer ${supabaseAnonKey}`);
          xhr.setRequestHeader('x-upsert', 'false');

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && e.total > 0) {
              const rawPct = (e.loaded / e.total) * 100;
              // Map byte progress from 30% to 92%
              const mapped = 30 + Math.round(rawPct * 0.62);
              updateProgress(
                mapped,
                `Uploading photo (${Math.round(rawPct)}%)…`,
                options?.onProgress
              );
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(true);
            } else {
              resolve(false);
            }
          };

          xhr.onerror = () => resolve(false);
          xhr.ontimeout = () => resolve(false);
          xhr.timeout = 25000;

          xhr.send(jpegFile);
        } catch {
          resolve(false);
        }
      });
    };

    const xhrSucceeded = await tryXhrUpload();

    if (!xhrSucceeded) {
      // Fallback to Supabase JS client
      updateProgress(45, `Uploading photo via secure channel…`, options?.onProgress);
      const { error: uploadError } = await supabase.storage
        .from('complaint-photos')
        .upload(filePath, jpegFile, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        updateProgress(0, `Upload failed: ${uploadError.message}`, options?.onProgress);
        return null;
      }
    }

    updateProgress(96, `Verifying public asset link…`, options?.onProgress);

    const { data } = supabase.storage
      .from('complaint-photos')
      .getPublicUrl(filePath);

    updateProgress(100, `Photo ${current} of ${total} uploaded successfully!`, options?.onProgress);
    setUploading(false);

    return data.publicUrl;
  };

  return {
    uploadPhoto,
    uploading,
    progress,
    statusText,
    photoCount,
    error,
  };
}
