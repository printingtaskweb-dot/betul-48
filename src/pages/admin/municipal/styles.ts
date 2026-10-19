import type React from 'react';
import { BORDER, PRIMARY } from './constants';

export const card: React.CSSProperties = {
  background: 'var(--theme-component, #d9d9d9)',
  border: BORDER,
  borderRadius: 'var(--radius-lg, 12px)',
};

export const field: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 'var(--radius-md, 8px)',
  border: BORDER,
  background: 'var(--theme-bg, #F6F1F1)',
  fontSize: '0.84rem',
  boxSizing: 'border-box',
};

export const primaryBtn: React.CSSProperties = {
  background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-sm, 6px)',
  padding: '7px 14px',
  fontSize: '0.78rem',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

export const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'var(--theme-bg, #F6F1F1)',
  color: PRIMARY,
  border: `1.5px solid ${PRIMARY}`,
};
