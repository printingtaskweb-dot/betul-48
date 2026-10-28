import React from 'react';
import { useNavigate } from 'react-router-dom';

import { t } from '../../lib/i18n';

interface Props {
  language: 'en' | 'hi';
}

export const GuestButton: React.FC<Props> = ({ language }) => {
  const navigate = useNavigate();

  return (
    <>
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>
          {t(language, 'orContinueAs')}
        </span>
      </div>
      <button
        onClick={() => navigate('/')}
        style={{
          width: '100%',
          padding: '11px 0',
          marginTop: 12,
          borderRadius: 10,
          border: '1.5px solid var(--gray-200)',
          background: 'var(--gray-50)',
          color: 'var(--gray-600)',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>person</span>{t(language, 'guestMode')}</span>
      </button>
    </>
  );
};
