import React from 'react';

const LANG_OPTIONS = [
  { code: 'en', label: 'English', flag: <span className="material-symbols-rounded" style={{ fontSize: 16 }}>language</span> },
  { code: 'hi', label: 'हिंदी', flag: <span className="material-symbols-rounded" style={{ fontSize: 16 }}>translate</span> },
] as const;

interface Props {
  value: 'en' | 'hi';
  onChange: (lang: 'en' | 'hi') => void;
}

export const LanguageSwitcher: React.FC<Props> = ({ value, onChange }) => (
  <div
    style={{
      display: 'inline-flex',
      gap: 0,
      background: 'rgba(255,255,255,0.15)',
      borderRadius: 24,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.25)',
      marginTop: 16,
    }}
  >
    {LANG_OPTIONS.map((opt) => (
      <button
        key={opt.code}
        onClick={() => onChange(opt.code)}
        style={{
          padding: '7px 18px',
          border: 'none',
          cursor: 'pointer',
          background:
            value === opt.code
              ? 'var(--theme-component, #d9d9d9)'
              : 'transparent',
          color:
            value === opt.code
              ? 'var(--theme-primary, #146C94)'
              : 'rgba(255,255,255,0.85)',
          fontWeight: value === opt.code ? 700 : 500,
          fontSize: 13,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        {opt.flag} {opt.label}
      </button>
    ))}
  </div>
);
