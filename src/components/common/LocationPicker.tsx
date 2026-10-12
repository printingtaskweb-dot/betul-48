import React from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
  onDetect: () => void;
  language?: 'en' | 'hi';
}

/**
 * Silent GPS indicator.
 * Location data is burned into the photo watermark, so once GPS is locked
 * this component renders nothing — no pills, no coords, no refresh button.
 * Only a small "locking…" chip is shown while acquiring the fix.
 */
export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  loading,
  language = 'en',
}) => {
  const ready =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  // GPS locked → nothing to show, watermark speaks for itself
  if (ready) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 13px',
        borderRadius: 8,
        background: 'rgba(102,0,51,0.06)',
        border: '1px dashed rgba(102,0,51,0.25)',
        fontSize: '0.78rem',
        color: 'var(--gray-600, #4b5563)',
        fontWeight: 600,
      }}
    >
      {loading ? (
        <>
          <Loader2 size={14} className="spin" />
          <span>
            {language === 'hi' ? 'GPS लॉक हो रहा है…' : 'Locking GPS…'}
          </span>
        </>
      ) : (
        <>
          <MapPin size={14} />
          <span>
            {language === 'hi'
              ? 'स्थान की प्रतीक्षा…'
              : 'Waiting for GPS…'}
          </span>
        </>
      )}
    </div>
  );
};
