import React from 'react';
import { card } from '../styles';
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

export const EmployeeLeaderboardTab: React.FC<Props> = ({ employees, departments }) => (
  <div style={{ ...card, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div>
      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--gray-900)' }}>
        🏆 Municipal Employee Performance & Task Execution Leaderboard
      </h3>
      <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
        Individual employee performance metrics, resolution percentages, and workload distribution.
      </p>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ borderBottom: BORDER, textAlign: 'left', color: 'var(--gray-700)' }}>
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
          {employees.map((emp) => {
            const deptObj = departments.find((d) => d.id === emp.linked_department_id);
            const tierBadge = TIER_LABEL[emp.tier] || TIER_LABEL[5];

            return (
              <tr key={emp.id} style={{ borderBottom: '1px solid var(--theme-component-border, #bfbfbf)', background: 'rgba(255,255,255,0.2)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--gray-900)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{tierBadge.icon}</span>
                    <span>{emp.full_name || 'Staff Member'}</span>
                  </div>
                  {emp.staff_code && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--gray-500)', display: 'block' }}>{emp.staff_code}</span>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 12,
                    background: 'var(--theme-bg, #fff4e7)', border: BORDER, color: tierBadge.badgeColor,
                  }}>{tierBadge.short}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--gray-800)' }}>{deptObj?.name || 'City-wide'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--gray-700)' }}>
                  {emp.ward_number ? `Ward ${emp.ward_number}` : 'All Wards'}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 800 }}>{emp.assignedCount}</td>
                <td style={{ padding: '10px 12px', fontWeight: 800, color: '#15803d' }}>{emp.solvedCount}</td>
                <td style={{ padding: '10px 12px', fontWeight: 800, color: '#b45309' }}>{emp.pendingCount}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--theme-component-border, #bfbfbf)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${emp.rate}%`, height: '100%',
                        background: emp.rate >= 75 ? '#15803d' : emp.rate >= 40 ? '#b45309' : '#991b1b',
                      }} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.74rem' }}>{emp.rate}%</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {emp.phone ? (
                    <a href={`tel:${emp.phone}`} style={{ color: PRIMARY, fontWeight: 700, textDecoration: 'none', fontSize: '0.76rem' }}>
                      📞 {emp.phone}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--gray-400)' }}>N/A</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
