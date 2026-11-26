import React from 'react';
import { Landmark, RefreshCw, ShieldCheck } from 'lucide-react';
import { TIER_LABEL } from '../../../../lib/hierarchy';

interface Props {
  myTier: number;
  loading: boolean;
  onRefresh: () => void;
}

export const ExecutiveHeader: React.FC<Props> = ({ myTier, loading, onRefresh }) => {
  const roleBadge = TIER_LABEL[myTier] || TIER_LABEL[0];

  const title =
    myTier === 0
      ? 'Municipal Executive Command'
      : myTier === 1
      ? 'Deputy Commissioner Executive Portal'
      : 'Department Operational Head Dashboard';

  return (
    <>
      <style>{`
        .exec-header-strip {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .exec-header-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
        }
        .exec-header-title {
          font-size: 1.28rem;
        }
        .exec-header-sub {
          font-size: 0.78rem;
        }
        .exec-header-badge {
          padding: 5px 11px;
          font-size: 0.74rem;
        }
        .exec-header-btn {
          padding: 7px 12px;
          font-size: 0.75rem;
        }

        @media (max-width: 768px) {
          .exec-header-strip {
            gap: 8px !important;
            background: #ffffff;
            border: 1px solid #e6e2d8;
            border-radius: 12px;
            padding: 10px 12px;
            box-shadow: 0 1px 4px rgba(15, 37, 49, 0.04);
          }
          .exec-header-icon {
            width: 34px !important;
            height: 34px !important;
            border-radius: 10px !important;
          }
          .exec-header-title {
            font-size: 0.96rem !important;
            line-height: 1.2 !important;
          }
          .exec-header-sub {
            font-size: 0.66rem !important;
            margin-top: 2px !important;
            line-height: 1.25 !important;
          }
          .exec-header-badge {
            padding: 3px 8px !important;
            font-size: 0.66rem !important;
          }
          .exec-header-btn {
            padding: 5px 10px !important;
            font-size: 0.7rem !important;
          }
        }
      `}</style>

      <div className="exec-header-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            className="exec-header-icon"
            style={{
              background: 'linear-gradient(135deg, #146C94, #0E526F)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(20, 108, 148, 0.2)',
              flexShrink: 0,
            }}
          >
            <Landmark size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1
              className="exec-header-title"
              style={{
                margin: 0,
                fontWeight: 900,
                color: '#0f2531',
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h1>
            <p className="exec-header-sub" style={{ margin: '2px 0 0', color: '#64748b', fontWeight: 500 }}>
              Nagar Palika Parishad Betul • Real-time SLA Governance & Cascading Task Delegation
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            className="exec-header-badge"
            style={{
              borderRadius: 999,
              background: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <ShieldCheck size={13} />
            <span>{roleBadge.en}</span>
          </span>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="exec-header-btn"
            style={{
              background: '#ffffff',
              color: '#146C94',
              border: '1px solid #e6e2d8',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 3px rgba(15, 37, 49, 0.04)',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Syncing…' : 'Sync Telemetry'}</span>
          </button>
        </div>
      </div>
    </>
  );
};
