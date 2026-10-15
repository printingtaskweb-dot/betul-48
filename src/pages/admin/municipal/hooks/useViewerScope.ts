import { useMemo } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { getTier, canViewComplaint } from '../../../../lib/hierarchy';
import type { Viewer } from '../../../../lib/hierarchy';
import type { ComplaintRecord, DepartmentRow } from '../types';

export const useViewerScope = (
  complaints: ComplaintRecord[],
  departments: DepartmentRow[]
) => {
  const { user, profile, isAdmin } = useAuth();

  const viewer: Viewer = useMemo(() => {
    const isMunicipalAdmin =
      !profile?.linked_department_id ||
      profile?.role === 'admin' ||
      profile?.role === 'municipal_administrator' ||
      profile?.role === 'deputy_commissioner' ||
      profile?.authority_role === 'deputy_commissioner' ||
      profile?.authority_role === 'municipal_commissioner';

    return {
      id: user?.id || '',
      role: isMunicipalAdmin
        ? profile?.role || 'municipal_administrator'
        : profile?.role || 'dept_staff',
      linked_department_id: isMunicipalAdmin
        ? null
        : profile?.linked_department_id || null,
      hierarchy_code: profile?.hierarchy_code || null,
      authority_role: profile?.authority_role || null,
      is_admin: isAdmin,
    };
  }, [user, profile, isAdmin]);

  const myTier = getTier(viewer.role, viewer.hierarchy_code, viewer.authority_role);
  const isDeputyOrHigher = myTier <= 1;

  const scopedComplaints = useMemo(() => {
    if (isDeputyOrHigher) return complaints;
    return complaints.filter((c) => canViewComplaint(viewer, c));
  }, [complaints, viewer, isDeputyOrHigher]);

  const visibleDepartments = useMemo(() => {
    if (isDeputyOrHigher) return departments;
    return departments.filter((d) => d.id === profile?.linked_department_id);
  }, [departments, isDeputyOrHigher, profile]);

  return { viewer, myTier, isDeputyOrHigher, scopedComplaints, visibleDepartments };
};
