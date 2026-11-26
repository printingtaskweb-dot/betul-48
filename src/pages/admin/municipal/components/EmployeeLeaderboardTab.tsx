import React, { useMemo, useState } from 'react';
import { Award, BadgeCheck, Phone } from 'lucide-react';
import { card, field } from '../styles';
import { BORDER, PRIMARY } from '../constants';
import { TIER_LABEL } from '../../../../lib/hierarchy';
import type { StaffMember } from '../../../../lib/hierarchy';
import type { DepartmentRow } from '../types';

interface PerfRow extends StaffMember {
  tier: number;
  assignedCount: number;
  solvedCount: number;
  pendingCount: number;
  rate: number;
}

interface Props {
  employees: PerfRow[];
  departments: DepartmentRow[];
}

const ROLE_FILTERS = [
  { value: 'all', label: 'All Roles' },
  { value: 'department_head', label: 'Dept Heads' },
  { value: 'supervisor', label: 'Supervisors' },
  { value: 'field_employee', label: 'Field Employees' },
  { value: 'control_room', label: 'Control Room' },
  { value: 'management_viewer', label: 'Management Viewers' },
];

export const EmployeeLeaderboardTab: React.FC<Props> = ({ employees, departments }) => {
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const okRole = roleFilter === 'all' || e.role === roleFilter;
      const okDept = deptFilter === 'all' || e.linked_department_id === deptFilter;
      return okRole && okDept;
    });
  }, [employees, roleFilter, deptFilter]);

  return (
    <div style={{ ...card, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        .leaderboard-row:hover {
          background: #faf9f6 !important;
        }
      `}</style>

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
            <Award size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#0f2531' }}>
              Employee Performance Leaderboard
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
              Every officer on the platform, ranked by resolved ticket count.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
            {ROLE_FILTERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
            <option value="all">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: '#faf9f6', borderBottom: BORDER, borderTop: BORDER, textAlign: 'left', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <th style={{ padding: '10px 12px' }}>#</th>
              <th style={{ padding: '10px 12px' }}>Employee</th>
              <th style={{ padding: '10px 12px' }}>Role / Tier</th>
              <th style={{ padding: '10px 12px' }}>Department</th>
              <th style={{ padding: '10px 12px' }}>Ward</th>
              <th style={{ padding: '10px 12px' }}>Assigned</th>
              <th style={{ padding: '10px 12px' }}>Resolved</th>
              <th style={{ padding: '10px 12px' }}>Pending</th>
              <th style={{ padding: '10px 12px' }}>Completion Rate</th>
              <th style={{ padding: '10px 12px' }}>Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp, idx) => {
              const deptObj = departments.find((d) => d.id === emp.linked_department_id);
              const tierBadge = TIER_LABEL[emp.tier] || TIER_LABEL[5];

              return (
                <tr key={emp.id} className="leaderboard-row" style={{ borderBottom: BORDER, background: '#ffffff', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 900, color: PRIMARY, fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f2531' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BadgeCheck size={15} color={PRIMARY} />
                      <span>{emp.full_name || 'Staff Member'}</span>
                    </div>
                    {emp.staff_code && (
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginLeft: 21 }}>{emp.staff_code}</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 999,
                      background: '#f0f7f9', border: '1px solid #b7dae4', color: tierBadge.badgeColor || PRIMARY,
                    }}>{tierBadge.short}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>{deptObj?.name || 'City-wide'}</td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>
                    {emp.ward_number ? `Ward ${emp.ward_number}` : 'All Wards'}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f2531', fontVariantNumeric: 'tabular-nums' }}>{emp.assignedCount}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{emp.solvedCount}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>{emp.pendingCount}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 60, height: 6, borderRadius: 999, background: '#e6e2d8', overflow: 'hidden' }}>
                        <div style={{
                          width: `${emp.rate}%`, height: '100%',
                          background: emp.rate >= 75 ? '#10b981' : emp.rate >= 40 ? '#146C94' : '#f59e0b',
                        }} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.74rem', color: '#0f2531', fontVariantNumeric: 'tabular-nums' }}>{emp.rate}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {emp.phone ? (
                      <a
                        href={`tel:${emp.phone}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: PRIMARY,
                          background: '#faf9f6',
                          border: '1px solid #e6e2d8',
                          borderRadius: 999,
                          padding: '2px 8px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          fontSize: '0.72rem',
                        }}
                      >
                        <Phone size={11} />
                        <span>{emp.phone}</span>
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                  No employees match current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
