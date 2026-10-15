import React from 'react';
import { card } from '../styles';
import { BORDER, PRIMARY } from '../constants';
import { isDone } from '../utils/statusStyle';
import { getTier } from '../../../../lib/hierarchy';
import type { StaffMember } from '../../../../lib/hierarchy';
import type { ComplaintRecord, DepartmentRow } from '../types';

interface Props {
  visibleDepartments: DepartmentRow[];
  scopedComplaints: ComplaintRecord[];
  staff: StaffMember[];
  deptFilter: string;
  setDeptFilter: (v: string) => void;
  isDeputyOrHigher: boolean;
  slaMetrics: { fastCount: number; standardCount: number; overdueCount: number };
}

export const OverviewTab: React.FC<Props> = ({
  visibleDepartments, scopedComplaints, staff,
  deptFilter, setDeptFilter, isDeputyOrHigher, slaMetrics,
}) => {
  const headOf = (deptId: string) =>
    staff.find(
      (s) =>
        s.linked_department_id === deptId &&
        getTier(s.role, s.hierarchy_code, s.authority_role) === 2
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ ...card, padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--gray-900)' }}>
              📊 Department Workload & Performance Comparison
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
              Comparative workload bars across municipal departments. Click any department bar to filter tasks.
            </p>
          </div>
          <span style={{
            fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: 12,
            background: 'var(--theme-bg, #fff4e7)', border: BORDER, color: PRIMARY,
          }}>
            Live Metrics
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visibleDepartments.map((dept) => {
            const deptComps = scopedComplaints.filter((c) => c.department_id === dept.id);
            const deptResolved = deptComps.filter((c) => isDone(c.status)).length;
            const deptInProgress = deptComps.filter((c) => c.status === 'in_progress').length;
            const deptPending = deptComps.filter((c) => c.status === 'pending').length;
            const deptTotal = deptComps.length;
            const rate = deptTotal > 0 ? Math.round((deptResolved / deptTotal) * 100) : 0;
            const head = headOf(dept.id);
            const isSelected = deptFilter === dept.id;

            return (
              <div
                key={dept.id}
                onClick={() => { if (isDeputyOrHigher) setDeptFilter(isSelected ? 'all' : dept.id); }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: isSelected ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                  border: isSelected ? `2px solid ${PRIMARY}` : BORDER,
                  cursor: isDeputyOrHigher ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.25rem' }}>{dept.icon}</span>
                    <b style={{ fontSize: '0.9rem', color: 'var(--gray-900)' }}>{dept.name}</b>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)' }}>
                      • Head: <b>{head?.full_name || 'Not assigned'}</b>
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#15803d', fontWeight: 800 }}>Resolved: {deptResolved}</span>
                    <span style={{ color: '#3730a3', fontWeight: 700 }}>In Progress: {deptInProgress}</span>
                    <span style={{ color: '#b45309', fontWeight: 700 }}>Pending: {deptPending}</span>
                    <span style={{ fontWeight: 900, color: PRIMARY, marginLeft: 4 }}>
                      Total: {deptTotal} ({rate}%)
                    </span>
                  </div>
                </div>

                <div style={{
                  height: 12, borderRadius: 6,
                  background: 'var(--theme-component-border, #bfbfbf)',
                  display: 'flex', overflow: 'hidden', width: '100%',
                }}>
                  {deptTotal > 0 ? (
                    <>
                      <div style={{ width: `${(deptResolved / deptTotal) * 100}%`, background: '#15803d', transition: 'width 0.4s ease' }} />
                      <div style={{ width: `${(deptInProgress / deptTotal) * 100}%`, background: '#3730a3', transition: 'width 0.4s ease' }} />
                      <div style={{ width: `${(deptPending / deptTotal) * 100}%`, background: '#b45309', transition: 'width 0.4s ease' }} />
                    </>
                  ) : (
                    <div style={{ width: '100%', background: 'rgba(0,0,0,0.06)' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...card, padding: '20px 22px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 900, color: 'var(--gray-900)' }}>
          ⏱️ Turnaround Timing & SLA Resolution Compliance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{ padding: '12px 14px', borderRadius: 8, background: '#dcfce7', border: '1.5px solid #86efac' }}>
            <b style={{ fontSize: '0.86rem', color: '#166534' }}>⚡ Fast Resolution (&lt; 24h)</b>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#166534', marginTop: 4 }}>{slaMetrics.fastCount}</div>
            <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: 2 }}>Complaints resolved within 24 hours</div>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 8, background: '#fef3c7', border: '1.5px solid #fde047' }}>
            <b style={{ fontSize: '0.86rem', color: '#854d0e' }}>⏳ Standard Resolution (24 - 72h)</b>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#854d0e', marginTop: 4 }}>{slaMetrics.standardCount}</div>
            <div style={{ fontSize: '0.72rem', color: '#854d0e', marginTop: 2 }}>Resolved within regular SLA threshold</div>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 8, background: '#fee2e2', border: '1.5px solid #fca5a5' }}>
            <b style={{ fontSize: '0.86rem', color: '#991b1b' }}>🚨 Overdue / SLA Breached (&gt; 72h)</b>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#991b1b', marginTop: 4 }}>{slaMetrics.overdueCount}</div>
            <div style={{ fontSize: '0.72rem', color: '#991b1b', marginTop: 2 }}>Requires urgent head intervention</div>
          </div>
        </div>
      </div>
    </div>
  );
};
