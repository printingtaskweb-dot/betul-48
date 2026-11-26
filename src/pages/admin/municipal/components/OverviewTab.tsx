import React, { useState } from 'react';
import type { DeptMetric, AreaHotspot } from '../types';
import {
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DepartmentServiceIcon } from '../../../../components/common/DepartmentServiceIcon';
import { card } from '../styles';

interface Props {
  deptMetrics: DeptMetric[];
  areaHotspots: AreaHotspot[];
  slaMetrics: { fastCount: number; standardCount: number; overdueCount: number };
  onDeptClick: (deptId: string) => void;
  onAreaClick: (area: AreaHotspot) => void;
  isDeputyOrHigher: boolean;
}

export const OverviewTab: React.FC<Props> = ({
  deptMetrics,
  areaHotspots,
  slaMetrics,
  onDeptClick,
  onAreaClick,
  isDeputyOrHigher,
}) => {
  const [showIdleDepts, setShowIdleDepts] = useState(false);

  // Separate active caseload divisions from idle divisions
  const activeDepts = [...deptMetrics]
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);
  const idleDepts = deptMetrics.filter((d) => d.total === 0);

  const maxTotal = Math.max(1, ...deptMetrics.map((d) => d.total));
  const maxAreaTotal = Math.max(1, ...areaHotspots.map((a) => a.total));

  const totalAllComplaints = deptMetrics.reduce((acc, d) => acc + d.total, 0);

  const renderDeptRow = (m: DeptMetric) => {
    const widthPct = Math.max(4, (m.total / maxTotal) * 100);

    return (
      <div
        key={m.dept.id}
        onClick={() => isDeputyOrHigher && onDeptClick(m.dept.id)}
        className="workload-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px, 220px) 1fr 60px 60px 60px 80px 70px',
          gap: 16,
          alignItems: 'center',
          padding: '10px 14px',
          borderRadius: 8,
          cursor: isDeputyOrHigher ? 'pointer' : 'default',
          borderBottom: '1px solid #f1f5f9',
          transition: 'background 0.15s ease',
        }}
      >
        {/* Department Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <DepartmentServiceIcon slugOrName={m.dept.slug || m.dept.name} size={28} iconSize={14} />
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#0f2531',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={m.dept.name}
          >
            {m.dept.name}
          </span>
        </div>

        {/* Proportional Segmented Progress Bar */}
        <div>
          <div
            style={{
              position: 'relative',
              height: 10,
              background: '#f3f1ec',
              borderRadius: 999,
              overflow: 'hidden',
              border: '1px solid #e6e2d8',
            }}
          >
            {m.total > 0 ? (
              <div
                style={{
                  display: 'flex',
                  height: '100%',
                  width: `${widthPct}%`,
                  borderRadius: 999,
                  overflow: 'hidden',
                  transition: 'width 0.4s ease',
                }}
              >
                {m.resolved > 0 && (
                  <div
                    title={`${m.resolved} Resolved (${Math.round((m.resolved / m.total) * 100)}%)`}
                    style={{
                      height: '100%',
                      width: `${(m.resolved / m.total) * 100}%`,
                      background: '#10b981',
                      borderRight: m.inProgress > 0 || m.pending > 0 ? '1px solid #ffffff' : 'none',
                    }}
                  />
                )}
                {m.inProgress > 0 && (
                  <div
                    title={`${m.inProgress} In Progress (${Math.round((m.inProgress / m.total) * 100)}%)`}
                    style={{
                      height: '100%',
                      width: `${(m.inProgress / m.total) * 100}%`,
                      background: '#146C94',
                      borderRight: m.pending > 0 ? '1px solid #ffffff' : 'none',
                    }}
                  />
                )}
                {m.pending > 0 && (
                  <div
                    title={`${m.pending} Pending (${Math.round((m.pending / m.total) * 100)}%)`}
                    style={{
                      height: '100%',
                      width: `${(m.pending / m.total) * 100}%`,
                      background: '#f59e0b',
                    }}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Total Count */}
        <span
          style={{
            fontSize: '0.84rem',
            fontWeight: 800,
            color: '#0f2531',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {m.total}
        </span>

        {/* Resolved Count */}
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: m.resolved > 0 ? '#059669' : '#94a3b8',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {m.resolved}
        </span>

        {/* Pending Count */}
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: m.pending > 0 ? '#b45309' : '#94a3b8',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {m.pending}
        </span>

        {/* Overdue Count */}
        <div style={{ textAlign: 'right' }}>
          {m.overdue > 0 ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#dc2626',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              <AlertTriangle size={11} /> {m.overdue}
            </span>
          ) : (
            <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
          )}
        </div>

        {/* Resolution Rate */}
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color:
                m.rate >= 80 ? '#059669' : m.rate >= 50 ? '#0369a1' : m.total === 0 ? '#64748b' : '#b45309',
              background:
                m.rate >= 80 ? '#dcfce7' : m.rate >= 50 ? '#e0f2fe' : m.total === 0 ? '#f3f1ec' : '#fef3c7',
              padding: '2px 7px',
              borderRadius: 999,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {m.rate}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        .workload-row:hover {
          background: #faf9f6 !important;
        }
        .overview-hotspot-card:hover {
          background: #f3f1ec !important;
          border-color: #146C94 !important;
        }
        .workload-desktop-table {
          display: flex;
          flex-direction: column;
        }
        .workload-mobile-list {
          display: none;
        }
        @media (max-width: 900px) {
          .workload-desktop-table {
            display: none !important;
          }
          .workload-mobile-list {
            display: flex !important;
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>

      {/* ── 1. Department Caseload & SLA Ledger ── */}
      <div style={{ ...card, padding: '20px 24px' }}>
        {/* Header with Title, Stats & Legend */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: 'linear-gradient(135deg, #f0f7f9, #d9ecf1)',
                border: '1px solid #b7dae4',
                color: '#146C94',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={19} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#0f2531',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Department Caseload & Resolution Velocity
                </h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: '#0369a1',
                    background: '#e0f2fe',
                    border: '1px solid #bae6fd',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {activeDepts.length} Active Divisions • {totalAllComplaints} Total Cases
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Workload volume, progress distribution, and SLA resolution compliance across municipal departments.
              </p>
            </div>
          </div>

          {/* Clean Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: '0.74rem',
              color: '#475569',
              fontWeight: 600,
              flexWrap: 'wrap',
            }}
          >
            <LegendItem color="#10b981" label="Resolved" />
            <LegendItem color="#146C94" label="In Progress" />
            <LegendItem color="#f59e0b" label="Pending" />
            <LegendItem color="#dc2626" label="SLA Overdue" />
          </div>
        </div>

        {/* ── Desktop Structured Table ── */}
        <div className="workload-desktop-table">
          {/* Table Column Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 220px) 1fr 60px 60px 60px 80px 70px',
              gap: 16,
              padding: '8px 14px',
              background: '#faf9f6',
              border: '1px solid #e6e2d8',
              borderRadius: 10,
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 4,
            }}
          >
            <span>Department</span>
            <span>Volume Proportion & SLA Split</span>
            <span style={{ textAlign: 'right' }}>Total</span>
            <span style={{ textAlign: 'right', color: '#059669' }}>Resolved</span>
            <span style={{ textAlign: 'right', color: '#b45309' }}>Pending</span>
            <span style={{ textAlign: 'right', color: '#dc2626' }}>Overdue</span>
            <span style={{ textAlign: 'right' }}>Rate</span>
          </div>

          {/* Active Department Rows */}
          {activeDepts.map(renderDeptRow)}

          {activeDepts.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              No active department grievances logged.
            </div>
          )}

          {/* Collapsible Idle / Zero-Volume Divisions */}
          {idleDepts.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowIdleDepts(!showIdleDepts)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#faf9f6',
                  border: '1px solid #e6e2d8',
                  color: '#475569',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 8,
                  transition: 'background 0.15s ease',
                }}
              >
                <span>
                  {showIdleDepts ? 'Hide' : 'Show'} {idleDepts.length} departments with 0 active cases
                </span>
                {showIdleDepts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showIdleDepts && (
                <div style={{ opacity: 0.72, marginTop: 6 }}>
                  {idleDepts.map(renderDeptRow)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Mobile Compact List ── */}
        <div className="workload-mobile-list">
          {deptMetrics
            .filter((d) => d.total > 0 || showIdleDepts)
            .map((m) => {
              const widthPct = Math.max(5, (m.total / maxTotal) * 100);

              return (
                <div
                  key={m.dept.id}
                  onClick={() => isDeputyOrHigher && onDeptClick(m.dept.id)}
                  style={{
                    background: '#faf9f6',
                    border: '1px solid #e6e2d8',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <DepartmentServiceIcon slugOrName={m.dept.slug || m.dept.name} size={26} iconSize={13} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f2531' }}>
                        {m.dept.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f2531' }}>
                      {m.total} cases
                    </span>
                  </div>

                  {/* Mobile Bar */}
                  <div
                    style={{
                      height: 8,
                      background: '#e6e2d8',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    {m.total > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          height: '100%',
                          width: `${widthPct}%`,
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        {m.resolved > 0 && (
                          <div style={{ width: `${(m.resolved / m.total) * 100}%`, background: '#10b981' }} />
                        )}
                        {m.inProgress > 0 && (
                          <div style={{ width: `${(m.inProgress / m.total) * 100}%`, background: '#146C94' }} />
                        )}
                        {m.pending > 0 && (
                          <div style={{ width: `${(m.pending / m.total) * 100}%`, background: '#f59e0b' }} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Breakdown Meta */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: '#059669' }}>✓ {m.resolved}</span>
                      <span style={{ color: '#146C94' }}>● {m.inProgress}</span>
                      <span style={{ color: '#b45309' }}>⏳ {m.pending}</span>
                      {m.overdue > 0 && <span style={{ color: '#dc2626' }}>▲ {m.overdue}</span>}
                    </div>
                    <span style={{ color: '#0f2531', fontWeight: 700 }}>{m.rate}% rate</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── 2. Area Hotspot Density Ranking ── */}
      <div style={{ ...card, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: 'linear-gradient(135deg, #f0f7f9, #d9ecf1)',
              border: '1px solid #b7dae4',
              color: '#146C94',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MapPin size={19} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#0f2531',
                letterSpacing: '-0.01em',
              }}
            >
              Ward Hotspot Density Ranking
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Municipal wards and residential zones ranked by active complaint volume. Click any row to filter grievances.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {areaHotspots.map((a, idx) => {
            const intensity = a.total / maxAreaTotal;

            return (
              <div
                key={a.key}
                className="overview-hotspot-card"
                onClick={() => isDeputyOrHigher && onAreaClick(a)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '1px solid #e6e2d8',
                  background: '#faf9f6',
                  cursor: isDeputyOrHigher ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        background: '#0f2531',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f2531' }}>
                      {a.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: intensity > 0.66 ? '#dc2626' : intensity > 0.33 ? '#d97706' : '#146C94',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {a.total} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>cases</span>
                  </span>
                </div>

                {/* Progress bar for area density */}
                <div style={{ height: 6, background: '#e6e2d8', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(a.total / maxAreaTotal) * 100}%`,
                      background: intensity > 0.66 ? '#dc2626' : intensity > 0.33 ? '#f59e0b' : '#146C94',
                      borderRadius: 999,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: '#64748b',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: '#059669' }}>Resolved: {a.resolved}</span>
                  <span style={{ color: '#b45309' }}>Pending: {a.pending}</span>
                </div>

                {a.topDepartment && (
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#475569',
                      borderTop: '1px solid #e6e2d8',
                      paddingTop: 6,
                    }}
                  >
                    Lead department: <span style={{ fontWeight: 700, color: '#0f2531' }}>{a.topDepartment}</span>
                  </div>
                )}
              </div>
            );
          })}

          {areaHotspots.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              No area hotspots detected yet.
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Turnaround Timing & SLA Resolution Compliance ── */}
      <div style={{ ...card, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: 'linear-gradient(135deg, #f0f7f9, #d9ecf1)',
              border: '1px solid #b7dae4',
              color: '#146C94',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={19} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#0f2531',
                letterSpacing: '-0.01em',
              }}
            >
              Turnaround Timing & SLA Resolution Compliance
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Resolution dispatch speed tracked against Betul citizen charter benchmarks.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <SlaCard
            title="Fast Resolution (< 24h)"
            value={slaMetrics.fastCount}
            subtitle="Closed within 24 hours of citizen reporting"
            statusColor="#10b981"
            icon={<CheckCircle2 size={16} />}
          />
          <SlaCard
            title="Standard Resolution (24 - 72h)"
            value={slaMetrics.standardCount}
            subtitle="Resolved within standard departmental SLA"
            statusColor="#f59e0b"
            icon={<Clock size={16} />}
          />
          <SlaCard
            title="Overdue / SLA Breached (> 72h)"
            value={slaMetrics.overdueCount}
            subtitle="Requires immediate administrative intervention"
            statusColor="#dc2626"
            icon={<AlertTriangle size={16} />}
          />
        </div>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span style={{ width: 8, height: 8, background: color, borderRadius: 2, display: 'inline-block' }} />
    <span>{label}</span>
  </span>
);

const SlaCard: React.FC<{
  title: string;
  value: number;
  subtitle: string;
  statusColor: string;
  icon: React.ReactNode;
}> = ({ title, value, subtitle, statusColor, icon }) => (
  <div
    style={{
      padding: '16px 18px',
      borderRadius: 12,
      background: '#faf9f6',
      border: '1px solid #e6e2d8',
      borderTop: `3px solid ${statusColor}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f2531' }}>{title}</span>
      <span style={{ color: statusColor }}>{icon}</span>
    </div>
    <div
      style={{
        fontSize: '1.6rem',
        fontWeight: 900,
        color: '#0f2531',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35 }}>{subtitle}</div>
  </div>
);
