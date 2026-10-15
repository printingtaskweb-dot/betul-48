import React from 'react';
import { PRIMARY } from '../constants';

export const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '10px 16px',
      border: 'none',
      borderRadius: '8px 8px 0 0',
      fontWeight: 800,
      fontSize: '0.84rem',
      cursor: 'pointer',
      background: active ? 'var(--theme-component, #d9d9d9)' : 'transparent',
      color: active ? PRIMARY : 'var(--gray-700)',
      borderBottom: active ? `3px solid ${PRIMARY}` : 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      whiteSpace: 'nowrap',
    }}
  >
    {icon}
    <span>{label}</span>
  </button>
);
