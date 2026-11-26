import React from 'react';
import {
  Building2,
  User,
  Phone,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Clock,
  PlayCircle,
} from 'lucide-react';
import { DepartmentServiceIcon } from '../../../../components/common/DepartmentServiceIcon';
import { card } from '../styles';
import type { DeptMetric, ViewTab } from '../types';

interface Props {
  deptMetrics: DeptMetric[];
  deptFilter: string;
  setDeptFilter: (v: string) => void;
  setActiveTab: (t: ViewTab) => void;
  isDeputyOrHigher: boolean;
}

const LegendChip: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
    <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
    <span>{label}</span>
  </span>
);

export const DepartmentsTab: React.FC<Props> = ({
  deptMetrics,
  deptFilter,
  setDeptFilter,
  setActiveTab,
  isDeputyOrHigher,
}) => {
  const maxTotal = Math.max(1, ...deptMetrics.map((d) => d.total));

  return (
    <div style={{ ...card, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        .dept-perf-row {
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .dept-perf-row:hover {
          background: #f3f1ec !important;
          border-color: #146C94 !important;
          box-shadow: 0 4px 12px rgba(20, 108, 148, 0.08);
        }
        .dept-perf-row.is-selected {
          background: #f0f7f9 !important;
          border-color: #146C94 !important;
        }
        .dept-phone-chip:hover {
          background: #f0f7f9 !important;
          border-color: #146C94 !important;
        }
      `}</style>

      {/* ── Section Header Matching Betul Civic Style ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f0f7f9, #d9ecf1)',
              border: '1px solid #b7dae4',
              color: '#146C94',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#0f2531', letterSpacing: '-0.01em' }}>
                Department Performance Chart & Head Directory
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#0369a1',
                  background: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {deptMetrics.length} {deptMetrics.length === 1 ? 'Portfolio' : 'Portfolios'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
              Bar length = total workload. Colors = resolution breakdown. Click any row to filter complaints.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#475569',
            background: '#faf9f6',
            border: '1px solid #e6e2d8',
            borderRadius: 10,
            padding: '6px 11px',
            flexWrap: 'wrap',
          }}
        >
          <LegendChip color="#10b981" label="Resolved" />
          <LegendChip color="#146C94" label="In Progress" />
          <LegendChip color="#f59e0b" label="Pending" />
          <LegendChip color="#dc2626" label="Overdue" />
        </div>
      </div>

      {/* ── Department Portfolio Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {deptMetrics.map((m) => {
          const d = m.dept;
          const isSelected = deptFilter === d.id;
          const widthPct = m.total > 0 ? Math.max(3, (m.total / maxTotal) * 100) : 0;

          const ratePalette =
            m.total === 0
              ? { color: '#64748b', bg: '#f3f1ec', border: '#e6e2d8' }
              : m.rate >= 80
              ? { color: '#059669', bg: '#dcfce7', border: '#bbf7d0' }
              : m.rate >= 50
              ? { color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd' }
              : { color: '#b45309', bg: '#fef3c7', border: '#fde68a' };

          return (
            <div
              key={d.id}
              onClick={() => {
                if (isDeputyOrHigher) {
                  setDeptFilter(isSelected ? 'all' : d.id);
                  setActiveTab('complaints');
                }
              }}
              className={`dept-perf-row ${isSelected ? 'is-selected' : ''}`}
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                background: isSelected ? '#f0f7f9' : '#faf9f6',
                border: isSelected ? '1.5px solid #146C94' : '1px solid #e6e2d8',
                cursor: isDeputyOrHigher ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                {/* Left: Department Service Icon + Title + Head */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 240px' }}>
                  <DepartmentServiceIcon slugOrName={d.slug || d.name} size={38} iconSize={19} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.94rem',
                        fontWeight: 800,
                        color: '#0f2531',
                        letterSpacing: '-0.01em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginTop: 3,
                        fontSize: '0.72rem',
                        color: '#64748b',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <User size={12} color={m.head?.full_name ? '#146C94' : '#94a3b8'} />
                        <span>Head:</span>
                        <b style={{ color: m.head?.full_name ? '#0f2531' : '#64748b', fontWeight: 700 }}>
                          {m.head?.full_name || 'Not assigned'}
                        </b>
                      </span>
                      {m.head?.phone && (
                        <a
                          href={`tel:${m.head.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="dept-phone-chip"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#ffffff',
                            border: '1px solid #e6e2d8',
                            borderRadius: 999,
                            padding: '1px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#146C94',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Phone size={11} />
                          <span>{m.head.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Clean Breakdown Pills */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    flexWrap: 'wrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span
                    style={{
                      color: m.total > 0 ? '#0369a1' : '#64748b',
                      background: m.total > 0 ? '#e0f2fe' : '#f3f1ec',
                      border: m.total > 0 ? '1px solid #bae6fd' : '1px solid #e6e2d8',
                      borderRadius: 999,
                      padding: '3px 9px',
                      fontWeight: 800,
                    }}
                  >
                    {m.total} {m.total === 1 ? 'case' : 'cases'}
                  </span>

                  <span
                    title="Resolved & Verified"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: m.resolved > 0 ? '#059669' : '#64748b',
                      background: m.resolved > 0 ? '#dcfce7' : '#ffffff',
                      border: m.resolved > 0 ? '1px solid #bbf7d0' : '1px solid #e6e2d8',
                      borderRadius: 999,
                      padding: '3px 8px',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    <span>{m.resolved}</span>
                  </span>

                  <span
                    title="In Progress / Dispatched"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: m.inProgress > 0 ? '#0369a1' : '#64748b',
                      background: m.inProgress > 0 ? '#e0f2fe' : '#ffffff',
                      border: m.inProgress > 0 ? '1px solid #bae6fd' : '1px solid #e6e2d8',
                      borderRadius: 999,
                      padding: '3px 8px',
                    }}
                  >
                    <PlayCircle size={12} />
                    <span>{m.inProgress}</span>
                  </span>

                  <span
                    title="Pending"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: m.pending > 0 ? '#b45309' : '#64748b',
                      background: m.pending > 0 ? '#fef3c7' : '#ffffff',
                      border: m.pending > 0 ? '1px solid #fde68a' : '1px solid #e6e2d8',
                      borderRadius: 999,
                      padding: '3px 8px',
                    }}
                  >
                    <Clock size={12} />
                    <span>{m.pending}</span>
                  </span>

                  {m.overdue > 0 && (
                    <span
                      title="SLA Overdue (> 72h)"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#dc2626',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 999,
                        padding: '3px 8px',
                        fontWeight: 800,
                      }}
                    >
                      <AlertTriangle size={12} />
                      <span>{m.overdue} overdue</span>
                    </span>
                  )}

                  <span
                    style={{
                      color: ratePalette.color,
                      background: ratePalette.bg,
                      border: `1px solid ${ratePalette.border}`,
                      borderRadius: 999,
                      padding: '3px 8px',
                      fontWeight: 800,
                    }}
                  >
                    {m.rate}%
                  </span>

                  {isDeputyOrHigher && <ChevronRight size={15} color="#94a3b8" />}
                </div>
              </div>

              {/* Sleek Pill Progress Track */}
              <div style={{ height: 8, background: '#e6e2d8', borderRadius: 999, overflow: 'hidden' }}>
                {m.total > 0 && (
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
                        style={{
                          width: `${(m.resolved / m.total) * 100}%`,
                          background: '#10b981',
                          borderRight: m.inProgress > 0 || m.pending > 0 ? '1px solid #ffffff' : 'none',
                        }}
                      />
                    )}
                    {m.inProgress > 0 && (
                      <div
                        style={{
                          width: `${(m.inProgress / m.total) * 100}%`,
                          background: '#146C94',
                          borderRight: m.pending > 0 ? '1px solid #ffffff' : 'none',
                        }}
                      />
                    )}
                    {m.pending > 0 && (
                      <div
                        style={{
                          width: `${(m.pending / m.total) * 100}%`,
                          background: '#f59e0b',
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {deptMetrics.length === 0 && (
          <div style={{ padding: 28, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No department data available yet.
          </div>
        )}
      </div>
    </div>
  );
};
