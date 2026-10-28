import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { ArcLoader } from './ArcLoader';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (disabled || uploading) return;
    if (file && file.type.startsWith('image/')) {
      onFileSelected(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
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
            aria-label="Remove photo"
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) =>
          e.target.files?.[0] && handleFile(e.target.files[0])
        }
      />
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
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: dragging
            ? '2px dashed var(--burgundy, #146C94)'
            : '2px dashed #d1d5db',
          borderRadius: 12,
          padding: '24px 16px',
          textAlign: 'center',
          background: dragging ? 'rgba(20, 108, 148, 0.05)' : '#f9fafb',
          transition: 'border-color 0.15s, background-color 0.15s',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          {/* Camera button — primary on mobile */}
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="btn-solid"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              fontSize: '0.85rem',
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            }}
          >
            <Camera size={18} />
            <span>Take Photo</span>
          </button>

          {/* File picker button */}
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              fontSize: '0.85rem',
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            }}
          >
            <Upload size={18} />
            <span>Choose File</span>
          </button>
        </div>

        <p
          style={{
            fontSize: '0.8rem',
            color: '#6b7280',
            margin: 0,
          }}
        >
          Photo proof will be stamped with real-time GPS coordinates and timestamp
        </p>
      </div>
    </div>
  );
};
