import React, { useRef } from 'react';
import { Camera, X, ShieldAlert } from 'lucide-react';
import { ArcLoader } from './ArcLoader';
import { useAuth } from '../../contexts/AuthContext';

interface PhotoUploaderProps {
  onFileSelected: (file: File) => void;
  preview?: string | null;
  onClear?: () => void;
  uploading?: boolean;
  uploadProgress?: number;
  uploadStatus?: string;
  photoCount?: { current: number; total: number } | string;
  disabled?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onFileSelected,
  preview,
  onClear,
  uploading,
  uploadProgress,
  uploadStatus,
  photoCount,
  disabled,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);

  let language = 'en';
  try {
    const auth = useAuth();
    if (auth?.language) language = auth.language;
  } catch {
    language = 'en';
  }

  const handleFile = (file: File) => {
    if (disabled || uploading) return;
    if (file && file.type.startsWith('image/')) {
      onFileSelected(file);
    }
  };

  if (preview) {
    return (
      <div
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
        }}
      >
        <img
          src={preview}
          alt="Selected"
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '80vh',
            objectFit: 'contain',
            display: 'block',
            borderRadius: 12,
            border: '2px solid #e5e7eb',
            background: '#000',
          }}
        />
        {onClear && !uploading && (
          <button
            onClick={onClear}
            aria-label="Retake photo"
            title={language === 'hi' ? 'फोटो दोबारा खींचें' : 'Retake Photo'}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              zIndex: 2,
            }}
          >
            <X size={18} color="#374151" />
          </button>
        )}
        {uploading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
              padding: 16,
            }}
          >
            <ArcLoader
              mode="inline"
              status={uploadStatus || 'Uploading Photo…'}
              subtitle="Optimizing bytes & syncing to municipal cloud"
              percent={uploadProgress}
              photoCount={photoCount}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Live camera capture input only (environment = rear camera on mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) =>
          e.target.files?.[0] && handleFile(e.target.files[0])
        }
      />

      <div
        style={{
          border: '2px dashed #cbd5e1',
          borderRadius: 14,
          padding: '24px 16px',
          textAlign: 'center',
          background: '#f8fafc',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          {/* Live Camera Button */}
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="btn-solid"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 24px',
              fontSize: '0.92rem',
              fontWeight: 600,
              borderRadius: 12,
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px -3px rgba(20, 108, 148, 0.35)',
            }}
          >
            <Camera size={20} />
            <span>
              {language === 'hi' ? 'लाइव फोटो लें (कैमरा)' : 'Take Live Photo (Camera)'}
            </span>
          </button>
        </div>

        <p
          style={{
            fontSize: '0.8rem',
            color: '#64748b',
            margin: '8px 0 0',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <ShieldAlert size={14} color="#146C94" style={{ flexShrink: 0 }} />
          <span>
            {language === 'hi'
              ? 'केवल कैमरे से खींची गई लाइव फोटो मान्य है। गैलरी से फ़ाइल अपलोड प्रतिबंधित है।'
              : 'Only live camera capture is accepted. Gallery & file uploads are disabled.'}
          </span>
        </p>
      </div>
    </div>
  );
};
