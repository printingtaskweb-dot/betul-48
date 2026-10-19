import React from 'react';
import { RefreshCw } from 'lucide-react';
import { TIER_LABEL } from '../../../../lib/hierarchy';
import { card } from '../styles';
import { PRIMARY } from '../constants';

interface Props {
  myTier: number;
  loading: boolean;
  onRefresh: () => void;
}

export const ExecutiveHeader: React.FC<Props> = ({ myTier, loading, onRefresh }) => {
  const roleBadge = TIER_LABEL[myTier] || TIER_LABEL[0];

  return (
    <div
      style={{
        ...card,
        padding: '20px 24px',
        background:
          'var(--header-gradient, linear-gradient(135deg, #0E526F 0%, #146C94 50%, #0E526F 100%))',
        color: '#fff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: 'var(--shadow-md, 0 8px 24px rgba(102,0,51,0.25))',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.6rem' }}>{roleBadge.icon}</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
              {myTier === 0
                ? 'Municipal & Organisation Administration'
                : myTier === 1
                ? 'Deputy Commissioner Executive Portal'
                : 'Department Operational Head Dashboard'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
              IMC Betul 311 Municipal Portal • Real-time SLA Governance & Cascading Task Delegation
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.3)',
            fontSize: '0.78rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{roleBadge.icon}</span>
          <span>{roleBadge.en}</span>
        </span>

        <button
          onClick={onRefresh}
          style={{
            background: 'var(--theme-bg, #F6F1F1)',
            color: PRIMARY,
            border: 'none',
            borderRadius: 'var(--radius-sm, 6px)',
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </div>
  );
};
