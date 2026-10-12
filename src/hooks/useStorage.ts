import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function useStorage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhoto = async (file: File): Promise<string | null> => {
    setUploading(true);
    setError(null);

    // 🔑 Force .jpg extension — watermarkPhoto always outputs image/jpeg
    //    so the extension must match the MIME type or Supabase serves
    //    the wrong Content-Type and browsers can cache mismatched bytes.
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.jpg`;
    const filePath = `complaints/${fileName}`;

    // Re-wrap the blob to guarantee a clean JPEG file object.
    // This also strips any filename weirdness the browser handed us.
    const jpegFile =
      file.type === 'image/jpeg'
        ? file
        : new File([file], fileName, { type: 'image/jpeg' });

    const { error: uploadError } = await supabase.storage
      .from('complaint-photos')
      .upload(filePath, jpegFile, {
        cacheControl: '31536000', // 1 year — cache-busting via unique name
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return null;
    }

    const { data } = supabase.storage
      .from('complaint-photos')
      .getPublicUrl(filePath);

    setUploading(false);
    return data.publicUrl;
  };

  return { uploadPhoto, uploading, error };
}
