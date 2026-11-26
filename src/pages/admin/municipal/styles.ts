import type React from 'react';

export const card: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e6e2d8',
  borderRadius: '16px',
  boxShadow: '0 2px 8px rgba(15, 37, 49, 0.04)',
};

export const field: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '10px',
  border: '1px solid #e6e2d8',
  background: '#faf9f6',
  color: '#0f2531',
  fontSize: '0.84rem',
  boxSizing: 'border-box',
};

export const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #146C94, #0E526F)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  padding: '8px 16px',
  fontSize: '0.8rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  boxShadow: '0 2px 8px rgba(20, 108, 148, 0.2)',
};

export const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#ffffff',
  color: '#146C94',
  border: '1px solid #b7dae4',
  padding: '8px 14px',
  boxShadow: '0 1px 3px rgba(15, 37, 49, 0.04)',
};
