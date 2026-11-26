import React from 'react';
import { Activity, Clock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Props {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  resolutionRate: number;
  slaOverdue: number;
  slaCompliant: number;
  deptCount: number;
  wardCount: number;
  compactMobileOnly?: boolean;
}

export const KpiGrid: React.FC<Props> = ({
  total, pending, inProgress, resolved, resolutionRate,
  slaOverdue, slaCompliant, deptCount, wardCount, compactMobileOnly = false,
}) => (
  <>
    <style>{`
      .kpi-grid-desktop {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 12px;
      }
      .kpi-grid-mobile-compact {
        display: none;
      }
      .kpi-stat-card {
        background: #ffffff;
        border-radius: 14px;
        padding: 13px 15px;
        border: 1px solid #e6e2d8;
        box-shadow: 0 1px 4px rgba(15, 37, 49, 0.04);
        display: flex;
        align-items: flex-start;
        gap: 11px;
        transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
      }
      .kpi-stat-card:hover {
        box-shadow: 0 6px 18px rgba(20, 108, 148, 0.1);
        border-color: #b7dae4;
      }
      @media (max-width: 768px) {
        .kpi-grid-desktop {
          display: none !important;
        }
        .kpi-grid-mobile-compact {
          display: flex !important;
          flex-direction: column;
          gap: 8px;
        }
      }
    `}</style>

    {/* ── Desktop Betul Stat Cards ── */}
    {!compactMobileOnly && (
      <div className="kpi-grid-desktop">
        <KpiCard
          icon={<Activity size={17} />}
          color="#146C94"
          bgColor="#e0f2fe"
          label="Total Complaints"
          value={total}
          sub={`Across ${deptCount} departments · ${wardCount} wards`}
        />
        <KpiCard
          icon={<Clock size={17} />}
          color="#d97706"
          bgColor="#fef3c7"
          label="Pending Allotment"
          value={pending}
          badge={pending > 0 ? 'Action needed' : undefined}
          badgeColor="#b45309"
          badgeBg="#fef3c7"
          sub="Requires officer allocation"
        />
        <KpiCard
          icon={<AlertCircle size={17} />}
          color="#0369a1"
          bgColor="#f0f7f9"
          label="In Progress / Dispatched"
          value={inProgress}
          sub="Under field supervisor action"
        />
        <KpiCard
          icon={<CheckCircle2 size={17} />}
          color="#059669"
          bgColor="#dcfce7"
          label="Resolved & Verified"
          value={resolved}
          badge={`${resolutionRate}% rate`}
          badgeColor="#059669"
          badgeBg="#dcfce7"
          sub="Citizen & verifier closed"
        />
        <KpiCard
          icon={slaOverdue > 0 ? <ShieldAlert size={17} /> : <CheckCircle2 size={17} />}
          color={slaOverdue > 0 ? '#dc2626' : '#059669'}
          bgColor={slaOverdue > 0 ? '#fef2f2' : '#dcfce7'}
          label="SLA Compliance"
          value={`${slaCompliant} / ${total || 1}`}
          badge={slaOverdue > 0 ? `${slaOverdue} overdue` : 'On track'}
          badgeColor={slaOverdue > 0 ? '#dc2626' : '#059669'}
          badgeBg={slaOverdue > 0 ? '#fef2f2' : '#dcfce7'}
          sub={
            <>
              Overdue (&gt;72h): <b style={{ color: slaOverdue > 0 ? '#dc2626' : '#059669' }}>{slaOverdue}</b>
            </>
          }
        />
      </div>
    )}

    {/* ── Mobile Compact High-Density Summary Strip ── */}
    <div className={compactMobileOnly ? '' : 'kpi-grid-mobile-compact'}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 6,
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '7px 9px',
            border: '1px solid #e6e2d8',
            boxShadow: '0 1px 3px rgba(15, 37, 49, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#e0f2fe', color: '#146C94',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Activity size={14} />
          </div>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0f2531', lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>
              Total Complaints
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '7px 9px',
            border: '1px solid #e6e2d8',
            boxShadow: '0 1px 3px rgba(15, 37, 49, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#fef3c7', color: '#d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={14} />
          </div>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#b45309', lineHeight: 1 }}>{pending}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>
              Pending Allot
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '7px 9px',
            border: '1px solid #e6e2d8',
            boxShadow: '0 1px 3px rgba(15, 37, 49, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#f0f7f9', color: '#146C94',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={14} />
          </div>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#146C94', lineHeight: 1 }}>{inProgress}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>
              In Progress
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '7px 9px',
            border: '1px solid #e6e2d8',
            boxShadow: '0 1px 3px rgba(15, 37, 49, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#dcfce7', color: '#059669',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={14} />
          </div>
          <div>
            <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#059669', lineHeight: 1 }}>
              {resolved} <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>({resolutionRate}%)</span>
            </div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>
              Resolved
            </div>
          </div>
        </div>
      </div>

      {/* Tiny SLA Status Pill on Mobile */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 10,
          padding: '5px 9px',
          border: '1px solid #e6e2d8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.66rem',
          color: '#475569',
        }}
      >
        <span>
          Across <b style={{ color: '#0f2531' }}>{deptCount}</b> depts · <b style={{ color: '#0f2531' }}>{wardCount}</b> wards
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {slaOverdue > 0 ? (
            <span style={{ color: '#dc2626', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}>
              <ShieldAlert size={11} /> {slaOverdue} SLA Overdue
            </span>
          ) : (
            <span style={{ color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}>
              <CheckCircle2 size={11} /> SLA Compliant ({slaCompliant}/{total || 1})
            </span>
          )}
        </span>
      </div>
    </div>
  </>
);

const KpiCard: React.FC<{
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
}> = ({ icon, color, bgColor, label, value, sub, badge, badgeColor, badgeBg }) => (
  <div className="kpi-stat-card">
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: bgColor,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
        {badge && (
          <span
            style={{
              fontSize: '0.6rem',
              fontWeight: 800,
              color: badgeColor || color,
              background: badgeBg || `${color}15`,
              borderRadius: 999,
              padding: '1px 6px',
              lineHeight: 1.3,
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: '1.35rem',
          fontWeight: 900,
          color: '#0f2531',
          lineHeight: 1.05,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4, fontWeight: 500 }}>{sub}</div>
    </div>
  </div>
);
