import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';

interface PhotoUploaderProps {
  onFileSelected: (file: File) => void;
  preview?: string | null;
  onClear?: () => void;
  uploading?: boolean;
  disabled?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onFileSelected,
  preview,
  onClear,
  uploading,
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
            // Full natural aspect ratio — no cropping, so the GPS Map
            // Camera watermark panel at the bottom is always visible.
            height: 'auto',
            maxHeight: '80vh',
            objectFit: 'contain',
            display: 'block',
            borderRadius: 12,
            border: '2px solid #e5e7eb',
            background: '#000',
          }}
        />
        {onClear && (
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
              background: 'rgba(0,0,0,0.45)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <span style={{ color: '#fff', fontWeight: 700 }}>
              Uploading…
            </span>
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
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : '#d1d5db'}`,
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
          background: dragging ? '#eef2ff' : '#f9fafb',
          transition: 'all 0.2s',
        }}
      >
        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
          Drag & drop a photo, or use:
        </p>
        <div
          style={{ display: 'flex', gap: 12, justifyContent: 'center' }}
        >
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => cameraInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--primary-gradient, #146C94)',
              color: '#fff',
              fontWeight: 600,
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
              opacity: disabled || uploading ? 0.6 : 1,
              fontSize: 14,
            }}
          >
            <Camera size={16} /> Camera
          </button>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              borderRadius: 8,
              border:
                '1.5px solid var(--theme-component-border, #bfbfbf)',
              background: 'var(--theme-component, #d9d9d9)',
              color: 'var(--gray-800, #374151)',
              fontWeight: 600,
              cursor: disabled || uploading ? 'not-allowed' : 'pointer',
              opacity: disabled || uploading ? 0.6 : 1,
              fontSize: 14,
            }}
          >
            <Upload size={16} /> Gallery
          </button>
        </div>
      </div>
    </div>
  );
};
