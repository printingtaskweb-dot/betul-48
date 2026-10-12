import React from 'react';
import { Navigation, Loader2, MapPin, AlertCircle } from 'lucide-react';

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

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  loading,
  error,
  onDetect,
  language = 'en',
}) => {
  const locationReady =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  /* ─── Status pill config ─── */
  type StatusType = 'detected' | 'detecting' | 'error';

  const status: StatusType = loading
    ? 'detecting'
    : locationReady
    ? 'detected'
    : 'error';

  const pillConfig: Record<
    StatusType,
    { icon: React.ReactNode; label: string; bg: string; color: string; border: string }
  > = {
    detected: {
      icon: <MapPin size={15} />,
      label: language === 'hi' ? '📍 GPS प्राप्त हुआ' : '📍 GPS Detected',
      bg: '#d1fae5',
      color: '#065f46',
      border: '#6ee7b7',
    },
    detecting: {
      icon: <Loader2 size={15} className="spin" />,
      label: language === 'hi' ? '⏳ स्थान पहचान रहा है...' : '⏳ Detecting...',
      bg: '#fef3c7',
      color: '#92400e',
      border: '#fcd34d',
    },
    error: {
      icon: <AlertCircle size={15} />,
      label:
        language === 'hi'
          ? '❌ स्थान त्रुटि – पुनः प्रयास करें'
          : '❌ Location Error – Tap to retry',
      bg: '#fee2e2',
      color: '#991b1b',
      border: '#fca5a5',
    },
  };

  const pill = pillConfig[status];

  const infoNote =
    language === 'hi'
      ? 'GPS निर्देशांक फोटो पर स्वयं अंकित होंगे'
      : 'Your GPS coordinates will be stamped on the photo automatically';

  return (
    <div
      style={{
        background: 'var(--theme-component, #d9d9d9)',
        border: '1px solid var(--theme-component-border, #bfbfbf)',
        borderRadius: 'var(--radius-md, 10px)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Row: status pill + refresh button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {/* Status pill – clickable when in error state */}
        <button
          type="button"
          onClick={status === 'error' ? onDetect : undefined}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 14px',
            borderRadius: 999,
            border: `1.5px solid ${pill.border}`,
            background: pill.bg,
            color: pill.color,
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: status === 'error' ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
          aria-live="polite"
        >
          {pill.icon}
          {pill.label}
        </button>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onDetect}
          disabled={loading}
          aria-label={language === 'hi' ? 'GPS रीफ्रेश करें' : 'Refresh GPS location'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 13px',
            borderRadius: 'var(--radius-sm, 6px)',
            border: 'none',
            background: 'var(--theme-primary, #660033)',
            color: '#fff',
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '0.78rem',
            opacity: loading ? 0.65 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          <Navigation size={14} />
          {language === 'hi' ? 'रीफ्रेश' : 'Refresh'}
        </button>
      </div>

      {/* Error detail if present */}
      {error && !loading && !locationReady && (
        <p
          style={{
            margin: 0,
            fontSize: '0.74rem',
            color: '#dc2626',
            lineHeight: 1.4,
          }}
        >
          ⚠️ {error}
        </p>
      )}

      {/* Info note */}
      <p
        style={{
          margin: 0,
          fontSize: '0.75rem',
          color: 'var(--gray-500, #6b7280)',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
        ℹ️ {infoNote}
      </p>
    </div>
  );
};
