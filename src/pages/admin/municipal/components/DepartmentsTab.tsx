import React from 'react';
import { card } from '../styles';
import { BORDER, PRIMARY } from '../constants';
import { isDone } from '../utils/statusStyle';
import { getTier } from '../../../../lib/hierarchy';
import type { StaffMember } from '../../../../lib/hierarchy';
import type { ComplaintRecord, DepartmentRow, ViewTab } from '../types';

interface Props {
  visibleDepartments: DepartmentRow[];
  scopedComplaints: ComplaintRecord[];
  staff: StaffMember[];
  deptFilter: string;
  setDeptFilter: (v: string) => void;
  setActiveTab: (t: ViewTab) => void;
  isDeputyOrHigher: boolean;
}

export const DepartmentsTab: React.FC<Props> = ({
  visibleDepartments, scopedComplaints, staff,
  deptFilter, setDeptFilter, setActiveTab, isDeputyOrHigher,
}) => {
  const headOf = (deptId: string) =>
    staff.find(
      (s) =>
        s.linked_department_id === deptId &&
        getTier(s.role, s.hierarchy_code, s.authority_role) === 2
    );

  return (
    <div style={{ ...card, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--gray-900)' }}>
          🏢 Municipal Departments & Operational Head Directory
        </h3>
        <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
          Complete list of municipal departments with designated department heads.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {visibleDepartments.map((d) => {
          const deptComps = scopedComplaints.filter((c) => c.department_id === d.id);
          const open = deptComps.filter((c) => !isDone(c.status)).length;
          const head = headOf(d.id);
          const isSelected = deptFilter === d.id;

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
                background: isSelected ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                border: isSelected ? `2px solid ${PRIMARY}` : BORDER,
                cursor: isDeputyOrHigher ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.4rem' }}>{d.icon}</span>
                <b style={{ fontSize: '0.95rem', color: 'var(--gray-900)' }}>{d.name}</b>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--gray-700)', margin: '4px 0' }}>
                Head: <b>{head?.full_name || 'Not assigned'}</b>
                {head?.phone && <span style={{ display: 'block' }}>📞 {head.phone}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                <span>Total Complaints: <b>{deptComps.length}</b></span>
                <span style={{ color: '#b45309' }}>Open: <b>{open}</b></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
