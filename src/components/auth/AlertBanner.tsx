import React from 'react';

type AlertType = 'error' | 'success' | 'info';

interface Props {
  type: AlertType;
  message: string;
}

const STYLES: Record<AlertType, React.CSSProperties> = {
  error: {
    background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626',
  },
  success: {
    background: 'var(--green-50)', border: '1px solid var(--green-200)',
    color: 'var(--green-700)',
  },
  info: {
    background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb',
  },
};

const ICONS: Record<AlertType, React.ReactNode> = {
  error: <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#dc2626' }}>warning</span>,
  success: <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#16a34a' }}>check_circle</span>,
  info: <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#0284c7' }}>info</span>,
};

export const AlertBanner: React.FC<Props> = ({ type, message }) => {
  if (!message) return null;
  return (
    <div
      style={{
        ...STYLES[type],
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 13,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {ICONS[type]}
      <span>{message}</span>
    </div>
  );
};
