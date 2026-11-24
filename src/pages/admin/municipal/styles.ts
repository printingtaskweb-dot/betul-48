import type React from 'react';

export const card: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
};

export const field: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  fontSize: '0.84rem',
  boxSizing: 'border-box',
};

export const primaryBtn: React.CSSProperties = {
  background: '#0284c7',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

export const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#ffffff',
  color: '#0284c7',
  border: '1px solid #0284c7',
};
