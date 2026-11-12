import { GoogleIcon } from '../../../../components/common/GoogleIcon';
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
    <>
      <style>{`
        .exec-header-card {
          padding: 20px 24px;
        }
        .exec-header-title {
          font-size: 1.4rem;
        }
        .exec-header-sub {
          font-size: 0.82rem;
        }
        .exec-header-badge {
          padding: 6px 14px;
          font-size: 0.78rem;
        }
        .exec-header-btn {
          padding: 8px 14px;
          font-size: 0.8rem;
        }

        @media (max-width: 768px) {
          .exec-header-card {
            padding: 10px 12px !important;
            gap: 8px !important;
            border-radius: 12px !important;
          }
          .exec-header-title {
            font-size: 0.94rem !important;
            line-height: 1.2 !important;
          }
          .exec-header-sub {
            font-size: 0.68rem !important;
            margin-top: 2px !important;
            line-height: 1.25 !important;
          }
          .exec-header-badge {
            padding: 3px 8px !important;
            font-size: 0.68rem !important;
          }
          .exec-header-btn {
            padding: 4px 10px !important;
            font-size: 0.72rem !important;
          }
        }
      `}</style>
      <div
        className="exec-header-card"
        style={{
          ...card,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GoogleIcon name={roleBadge.icon} size={22} />
            <div>
              <h1 className="exec-header-title" style={{ margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }}>
                {myTier === 0
                  ? 'Municipal & Organisation Administration'
                  : myTier === 1
                  ? 'Deputy Commissioner Executive Portal'
                  : 'Department Operational Head Dashboard'}
              </h1>
              <p className="exec-header-sub" style={{ margin: '4px 0 0', opacity: 0.9 }}>
                IMC Betul 311 Municipal Portal • Real-time SLA Governance & Cascading Task Delegation
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            className="exec-header-badge"
            style={{
              borderRadius: 20,
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <GoogleIcon name={roleBadge.icon} size={13} />
            <span>{roleBadge.en}</span>
          </span>

          <button
            onClick={onRefresh}
            className="exec-header-btn"
            style={{
              background: 'var(--theme-bg, #F6F1F1)',
              color: PRIMARY,
              border: 'none',
              borderRadius: 'var(--radius-sm, 6px)',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>
    </>
  );
};
