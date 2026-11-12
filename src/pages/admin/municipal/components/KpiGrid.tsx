import React from 'react';
import { card } from '../styles';
import { PRIMARY } from '../constants';
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
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }
      .kpi-grid-mobile-compact {
        display: none;
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

    {/* ── Desktop Full KPI Grid (as praised by user) ── */}
    {!compactMobileOnly && (
      <div className="kpi-grid-desktop">
        <KpiCard label="Total Complaints" value={total} color={PRIMARY}
          sub={`Across ${deptCount} departments · ${wardCount} wards`} />
        <KpiCard label="Pending Allotment" value={pending} color="var(--status-pending)"
          sub="Requires officer allocation" labelColor="var(--status-pending)" />
        <KpiCard label="In Progress / Dispatched" value={inProgress} color="var(--burgundy)"
          sub="Under field supervisor / worker action" labelColor="var(--burgundy)" />
        <KpiCard label="Resolved & Verified" value={resolved} color="#15803d"
          sub={<>Resolution efficiency: <b>{resolutionRate}%</b></>} labelColor="#15803d" />
        <KpiCard label="SLA Compliance" value={`${slaCompliant} / ${total || 1}`} color={PRIMARY}
          sub={<>Overdue (&gt;72h): <b>{slaOverdue}</b></>}
          subColor={slaOverdue > 0 ? '#991b1b' : '#15803d'} />
      </div>
    )}

    {/* ── Mobile Compact High-Density Summary Strip ── */}
    <div className={compactMobileOnly ? '' : 'kpi-grid-mobile-compact'}>
      {/* 2x2 Mini KPI Matrix */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 6,
        }}
      >
        {/* Total */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 10,
            padding: '6px 8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <div
            style={{
              width: 26, height: 26, borderRadius: 6,
              background: '#e0f2fe', color: '#0369a1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Activity size={13} />
          </div>
          <div>
            <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 1 }}>
              Total Complaints
            </div>
          </div>
        </div>

        {/* Pending */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 10,
            padding: '6px 8px',
            border: '1px solid #fed7aa',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <div
            style={{
              width: 26, height: 26, borderRadius: 6,
              background: '#fff7ed', color: '#c2410c',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={13} />
          </div>
          <div>
            <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#c2410c', lineHeight: 1 }}>{pending}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', marginTop: 1 }}>
              Pending Allot
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 10,
            padding: '6px 8px',
            border: '1px solid #e9d5ff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <div
            style={{
              width: 26, height: 26, borderRadius: 6,
              background: '#faf5ff', color: '#7e22ce',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={13} />
          </div>
          <div>
            <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#7e22ce', lineHeight: 1 }}>{inProgress}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', marginTop: 1 }}>
              In Progress
            </div>
          </div>
        </div>

        {/* Resolved */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 10,
            padding: '6px 8px',
            border: '1px solid #bbf7d0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <div
            style={{
              width: 26, height: 26, borderRadius: 6,
              background: '#f0fdf4', color: '#15803d',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={13} />
          </div>
          <div>
            <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>
              {resolved} <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>({resolutionRate}%)</span>
            </div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginTop: 1 }}>
              Resolved
            </div>
          </div>
        </div>
      </div>

      {/* Tiny SLA Status Pill on Mobile */}
      <div
        style={{
          background: 'rgba(255,255,255,0.85)',
          borderRadius: 8,
          padding: '4px 8px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.66rem',
          color: '#475569',
        }}
      >
        <span>
          Across <b>{deptCount}</b> depts · <b>{wardCount}</b> wards
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {slaOverdue > 0 ? (
            <span style={{ color: '#dc2626', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}>
              <ShieldAlert size={11} /> {slaOverdue} SLA Overdue
            </span>
          ) : (
            <span style={{ color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}>
              <CheckCircle2 size={11} /> SLA Compliant ({slaCompliant}/{total || 1})
            </span>
          )}
        </span>
      </div>
    </div>
  </>
);

const KpiCard: React.FC<{
  label: string; value: React.ReactNode; color: string;
  sub: React.ReactNode; labelColor?: string; subColor?: string;
}> = ({ label, value, color, sub, labelColor = 'var(--gray-600)', subColor = 'var(--gray-600)' }) => (
  <div style={{ ...card, padding: '16px 18px' }}>
    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: labelColor, textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{ fontSize: '1.7rem', fontWeight: 900, color, marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: '0.74rem', color: subColor, marginTop: 4 }}>{sub}</div>
  </div>
);
