import React from 'react';
import { card } from '../styles';
import { BORDER, PRIMARY } from '../constants';
import type { DeptMetric, AreaHotspot } from '../types';
import { DepartmentServiceIcon } from '../../../../components/common/DepartmentServiceIcon';

interface Props {
  deptMetrics: DeptMetric[];
  areaHotspots: AreaHotspot[];
  slaMetrics: { fastCount: number; standardCount: number; overdueCount: number };
  onDeptClick: (deptId: string) => void;
  onAreaClick: (area: AreaHotspot) => void;
  isDeputyOrHigher: boolean;
}

export const OverviewTab: React.FC<Props> = ({
  deptMetrics, areaHotspots, slaMetrics, onDeptClick, onAreaClick, isDeputyOrHigher,
}) => {
  const maxTotal = Math.max(1, ...deptMetrics.map((d) => d.total));
  const maxAreaTotal = Math.max(1, ...areaHotspots.map((a) => a.total));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ── Bar Chart: Department Workload ── */}
      <div style={{ ...card, padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--gray-900)' }}>
              📊 Department Workload Bar Chart
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
              Horizontal bars show completed vs remaining complaints per department, ranked by total volume.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', fontWeight: 700 }}>
            <LegendDot color="#15803d" label="Resolved" />
            <LegendDot color="var(--burgundy)" label="In Progress" />
            <LegendDot color="var(--status-pending)" label="Pending" />
            <LegendDot color="#991b1b" label="Overdue" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {deptMetrics.map((m) => {
            const widthPct = (m.total / maxTotal) * 100;
            return (
              <div
                key={m.dept.id}
                onClick={() => isDeputyOrHigher && onDeptClick(m.dept.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(140px, 200px) 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  cursor: isDeputyOrHigher ? 'pointer' : 'default',
                  padding: '4px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 700 }}>
                  <DepartmentServiceIcon slugOrName={m.dept.slug || m.dept.name} size={24} iconSize={13} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.dept.name}
                  </span>
                </div>

                <div style={{ position: 'relative', height: 22, background: 'rgba(0,0,0,0.05)', borderRadius: 6 }}>
                  <div style={{ display: 'flex', height: '100%', width: `${widthPct}%`, borderRadius: 6, overflow: 'hidden', transition: 'width 0.4s ease' }}>
                    {m.resolved > 0 && <div style={{ width: `${(m.resolved / m.total) * 100}%`, background: '#15803d' }} />}
                    {m.inProgress > 0 && <div style={{ width: `${(m.inProgress / m.total) * 100}%`, background: 'var(--burgundy)' }} />}
                    {m.pending > 0 && <div style={{ width: `${(m.pending / m.total) * 100}%`, background: 'var(--status-pending)' }} />}
                  </div>
                  {m.overdue > 0 && (
                    <div
                      title={`${m.overdue} overdue`}
                      style={{
                        position: 'absolute', right: -4, top: -4, bottom: -4, width: 3,
                        background: '#991b1b', borderRadius: 2,
                      }}
                    />
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                  <b style={{ color: PRIMARY }}>{m.total}</b>
                  <span style={{ color: '#15803d' }}>✓ {m.resolved}</span>
                  <span style={{ color: 'var(--status-pending)' }}>⌛ {m.pending}</span>
                  {m.overdue > 0 && <span style={{ color: '#991b1b', fontWeight: 800 }}>⚠ {m.overdue}</span>}
                  <span style={{ color: 'var(--gray-600)' }}>({m.rate}%)</span>
                </div>
              </div>
            );
          })}

          {deptMetrics.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              No department data available yet.
            </div>
          )}
        </div>
      </div>

      {/* ── Area Hotspot Ranking ── */}
      <div style={{ ...card, padding: '20px 22px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900, color: 'var(--gray-900)' }}>
          🗺️ Area Hotspot Ranking
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
          Wards / areas with highest complaint density. Click any row to filter complaints in that area.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {areaHotspots.map((a, idx) => {
            const intensity = a.total / maxAreaTotal;
            const bg = intensity > 0.66 ? '#fee2e2' : intensity > 0.33 ? '#fef3c7' : '#dcfce7';
            const fg = intensity > 0.66 ? '#991b1b' : intensity > 0.33 ? '#854d0e' : '#166534';

            return (
              <div
                key={a.key}
                onClick={() => isDeputyOrHigher && onAreaClick(a)}
                style={{
                  padding: '12px 14px', borderRadius: 10,
                  border: BORDER, background: bg,
                  cursor: isDeputyOrHigher ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: fg, color: '#fff', fontWeight: 900,
                      fontSize: '0.68rem', padding: '2px 7px', borderRadius: 10,
                    }}>#{idx + 1}</span>
                    <b style={{ fontSize: '0.86rem', color: 'var(--gray-900)' }}>{a.label}</b>
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: fg }}>{a.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: fg, fontWeight: 700 }}>
                  <span>✓ Resolved: {a.resolved}</span>
                  <span>⌛ Pending: {a.pending}</span>
                </div>
                {a.topDepartment && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-700)' }}>
                    🔥 Top dept: <b>{a.topDepartment}</b>
                  </div>
                )}
              </div>
            );
          })}

          {areaHotspots.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              No area hotspots detected yet.
            </div>
          )}
        </div>
      </div>

      {/* ── SLA ── */}
      <div style={{ ...card, padding: '20px 22px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 900, color: 'var(--gray-900)' }}>
          ⏱️ Turnaround Timing & SLA Resolution Compliance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <SlaCard title="⚡ Fast Resolution (< 24h)" value={slaMetrics.fastCount} subtitle="Complaints resolved within 24 hours" bg="#dcfce7" border="#86efac" fg="#166534" />
          <SlaCard title="⏳ Standard Resolution (24 - 72h)" value={slaMetrics.standardCount} subtitle="Resolved within regular SLA threshold" bg="#fef3c7" border="#fde047" fg="#854d0e" />
          <SlaCard title="🚨 Overdue / SLA Breached (> 72h)" value={slaMetrics.overdueCount} subtitle="Requires urgent head intervention" bg="#fee2e2" border="#fca5a5" fg="#991b1b" />
        </div>
      </div>
    </div>
  );
};

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
    <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block' }} />
    {label}
  </span>
);

const SlaCard: React.FC<{
  title: string; value: number; subtitle: string;
  bg: string; border: string; fg: string;
}> = ({ title, value, subtitle, bg, border, fg }) => (
  <div style={{ padding: '12px 14px', borderRadius: 8, background: bg, border: `1.5px solid ${border}` }}>
    <b style={{ fontSize: '0.86rem', color: fg }}>{title}</b>
    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: fg, marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: '0.72rem', color: fg, marginTop: 2 }}>{subtitle}</div>
  </div>
);
