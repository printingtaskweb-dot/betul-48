import { GoogleIcon } from '../../../../components/common/GoogleIcon';
import React from 'react';
import { card } from '../styles';
import { BORDER, PRIMARY } from '../constants';
import type { DeptMetric, ViewTab } from '../types';

interface Props {
  deptMetrics: DeptMetric[];
  deptFilter: string;
  setDeptFilter: (v: string) => void;
  setActiveTab: (t: ViewTab) => void;
  isDeputyOrHigher: boolean;
}

export const DepartmentsTab: React.FC<Props> = ({
  deptMetrics, deptFilter, setDeptFilter, setActiveTab, isDeputyOrHigher,
}) => {
  const maxTotal = Math.max(1, ...deptMetrics.map((d) => d.total));

  return (
    <div style={{ ...card, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--gray-900)' }}>
          Department Performance Chart & Head Directory
        </h3>
        <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
          Bar length = total workload. Colors = resolution breakdown. Click any row to filter complaints.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {deptMetrics.map((m) => {
          const d = m.dept;
          const isSelected = deptFilter === d.id;
          const widthPct = (m.total / maxTotal) * 100;

          return (
            <div
              key={d.id}
              onClick={() => {
                if (isDeputyOrHigher) {
                  setDeptFilter(isSelected ? 'all' : d.id);
                  setActiveTab('complaints');
                }
              }}
              style={{
                padding: '14px 16px', borderRadius: 10,
                background: isSelected ? 'var(--theme-bg, #F6F1F1)' : 'rgba(255,255,255,0.4)',
                border: isSelected ? `2px solid ${PRIMARY}` : BORDER,
                cursor: isDeputyOrHigher ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GoogleIcon name={d.icon} size={28} />
                  <div>
                    <b style={{ fontSize: '0.95rem', color: 'var(--gray-900)' }}>{d.name}</b>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-600)' }}>
                      Head: <b>{m.head?.full_name || 'Not assigned'}</b>
                      {m.head?.phone && <span> · <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 4 }}>call</span>{m.head.phone}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: '0.74rem', fontWeight: 700, flexWrap: 'wrap' }}>
                  <span style={{ color: PRIMARY }}>Total: {m.total}</span>
                  <span style={{ color: '#15803d' }}><span className="material-symbols-rounded" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 2 }}>check</span>{m.resolved}</span>
                  <span style={{ color: 'var(--burgundy)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><GoogleIcon name="play_arrow" size={13} />{m.inProgress}</span>
                  <span style={{ color: 'var(--status-pending)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><GoogleIcon name="hourglass_bottom" size={13} />{m.pending}</span>
                  {m.overdue > 0 && <span style={{ color: '#991b1b', fontWeight: 900 }}><span className="material-symbols-rounded" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 2 }}>warning</span>{m.overdue}</span>}
                  <span style={{ color: 'var(--gray-600)' }}>({m.rate}%)</span>
                </div>
              </div>

              <div style={{ height: 14, background: 'rgba(0,0,0,0.05)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ display: 'flex', height: '100%', width: `${widthPct}%`, transition: 'width 0.4s ease' }}>
                  {m.resolved > 0 && <div style={{ width: `${(m.resolved / m.total) * 100}%`, background: '#15803d' }} />}
                  {m.inProgress > 0 && <div style={{ width: `${(m.inProgress / m.total) * 100}%`, background: 'var(--burgundy)' }} />}
                  {m.pending > 0 && <div style={{ width: `${(m.pending / m.total) * 100}%`, background: 'var(--status-pending)' }} />}
                </div>
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
  );
};
