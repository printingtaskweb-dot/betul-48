import { useMemo } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { getTier, canViewComplaint } from '../../../../lib/hierarchy';
import type { Viewer } from '../../../../lib/hierarchy';
import type { ComplaintRecord, DepartmentRow } from '../types';
import type { Ward } from '../../../../lib/wardTypes';
import { isComplaintInWard } from '../utils/complaintWard';

export const useViewerScope = (
  complaints: ComplaintRecord[],
  departments: DepartmentRow[],
  wards: Ward[],
) => {
  const { user, profile, isAdmin } = useAuth();

  const viewer: Viewer = useMemo(() => {
    const isMunicipalHead =
      isAdmin ||
      profile?.role === 'admin' ||
      profile?.role === 'municipal_administrator' ||
      profile?.authority_role === 'municipal_commissioner';
    const isDeputyCommissioner =
      profile?.role === 'deputy_commissioner' ||
      profile?.authority_role === 'deputy_commissioner';
    const hasCitywideRole = isMunicipalHead || isDeputyCommissioner;
    const isMunicipalAdmin =
      hasCitywideRole ||
      !profile?.linked_department_id ||
      profile?.authority_role === 'municipal_commissioner';

    return {
      id: user?.id || '',
      role: hasCitywideRole
        ? isDeputyCommissioner && !isMunicipalHead
          ? 'deputy_commissioner'
          : 'admin'
        : isMunicipalAdmin
          ? profile?.role || 'municipal_administrator'
          : profile?.role || 'dept_staff',
      linked_department_id: isMunicipalAdmin
        ? null
        : profile?.linked_department_id || null,
      hierarchy_code: hasCitywideRole ? null : profile?.hierarchy_code || null,
      authority_role: hasCitywideRole ? null : profile?.authority_role || null,
      is_admin: isAdmin,
    };
  }, [user, profile, isAdmin]);

  const myTier = getTier(viewer.role, viewer.hierarchy_code, viewer.authority_role);
  const isDeputyOrHigher = myTier <= 1;

  const scopedComplaints = useMemo(() => {
    const permitted = isDeputyOrHigher
      ? complaints
      : complaints.filter((complaint) => canViewComplaint(viewer, complaint));
    const assignedWard = wards.find((ward) => ward.id === profile?.assigned_ward_id);
    return assignedWard
      ? permitted.filter((complaint) => isComplaintInWard(complaint, assignedWard))
      : permitted;
  }, [complaints, viewer, isDeputyOrHigher, profile?.assigned_ward_id, wards]);

  const visibleDepartments = useMemo(() => {
    if (isDeputyOrHigher) return departments;
    return departments.filter((d) => d.id === profile?.linked_department_id);
  }, [departments, isDeputyOrHigher, profile]);

  return { viewer, myTier, isDeputyOrHigher, scopedComplaints, visibleDepartments };
};
