import { GoogleIcon } from '../common/GoogleIcon';
import React from 'react';
import type { Department } from '../../lib/supabase';

/**
 * DepartmentWrapper – thin component wrapping each department's public-facing
 * content. Add department-specific tips, FAQs or custom fields here.
 */
interface DepartmentWrapperProps {
  department: Department;
  children: React.ReactNode;
}

export const DepartmentWrapper: React.FC<DepartmentWrapperProps> = ({ department, children }) => {
  return (
    <div>
      <div style={{
        padding: '14px 16px',
        background: `${department.color}18`,
        border: `1px solid ${department.color}55`,
        borderRadius: 10,
        marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <GoogleIcon name={department.icon} size={28} />
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: 15 }}>{department.name} Department</p>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{department.description}</p>
        </div>
      </div>
      {children}
    </div>
  );
};

// Department-specific tip components — expand these per department
export const GreenDeptInfo: React.FC = () => (
  <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#166534', marginBottom: 10 }}>
    <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#f59e0b', verticalAlign: 'middle', marginRight: 4 }}>lightbulb</span><strong>Tip:</strong> For fallen trees or encroaching branches, include a wide-angle photo showing the full extent of the issue.
  </div>
);

export const WaterDeptInfo: React.FC = () => (
  <div style={{ padding: '10px 14px', background: 'var(--primary-100)', borderRadius: 8, fontSize: 13, color: 'var(--burgundy)', marginBottom: 10 }}>
    <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#f59e0b', verticalAlign: 'middle', marginRight: 4 }}>lightbulb</span><strong>Tip:</strong> For burst pipes, turn off nearby valves if accessible and include photo of the burst point.
  </div>
);

export const RainWaterDeptInfo: React.FC = () => (
  <div style={{ padding: '10px 14px', background: '#eef2ff', borderRadius: 8, fontSize: 13, color: '#4338ca', marginBottom: 10 }}>
    <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#f59e0b', verticalAlign: 'middle', marginRight: 4 }}>lightbulb</span><strong>Tip:</strong> Report flooding issues immediately. Include a photo showing water level and the blocked drain if visible.
  </div>
);

export const CnDDeptInfo: React.FC = () => (
  <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 8, fontSize: 13, color: '#92400e', marginBottom: 10 }}>
    <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#f59e0b', verticalAlign: 'middle', marginRight: 4 }}>lightbulb</span><strong>Tip:</strong> Include the construction site name or contractor name if visible on the waste material.
  </div>
);

export const CleanDeptInfo: React.FC = () => (
  <div style={{ padding: '10px 14px', background: '#ecfdf5', borderRadius: 8, fontSize: 13, color: '#065f46', marginBottom: 10 }}>
    <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#f59e0b', verticalAlign: 'middle', marginRight: 4 }}>lightbulb</span><strong>Tip:</strong> For garbage not collected for multiple days, mention the last pickup date in the description.
  </div>
);

// Map of slug → info component
export const DEPT_INFO_MAP: Record<string, React.FC> = {
  green: GreenDeptInfo,
  water: WaterDeptInfo,
  rainwater: RainWaterDeptInfo,
  cnd: CnDDeptInfo,
  clean: CleanDeptInfo,
};
