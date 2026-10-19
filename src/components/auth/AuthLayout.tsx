import React from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
  language: 'en' | 'hi';
  onLanguageChange: (l: 'en' | 'hi') => void;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<Props> = ({
  language,
  onLanguageChange,
  children,
}) => (
  <div style={{ minHeight: '100vh', background: 'var(--page-background)' }}>
    <div
      style={{
        background:
          'var(--header-gradient, linear-gradient(135deg, #0E526F 0%, #146C94 50%, #0E526F 100%))',
        padding: '40px 24px 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -70,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }}
      />
      <div style={{ fontSize: 44, marginBottom: 10 }}>🏛️</div>
      <h1
        style={{
          color: '#fff',
          fontSize: 26,
          fontWeight: 900,
          margin: 0,
          letterSpacing: 1,
        }}
      >
        IMC 311
      </h1>
      <p
        style={{
          color: 'rgba(255,255,255,0.75)',
          marginTop: 4,
          fontSize: 13,
        }}
      >
        Indore Municipal Corporation
      </p>
      <LanguageSwitcher value={language} onChange={onLanguageChange} />
    </div>
    {children}
  </div>
);
