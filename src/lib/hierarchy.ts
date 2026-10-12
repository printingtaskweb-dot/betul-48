// src/lib/hierarchy.ts
// Single source of truth for "who can see / allot / resolve what"

export interface StaffMember {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
  staff_code: string | null;
  linked_department_id: string | null;
  ward_number?: string | null;
  authority_role?: string | null;
  hierarchy_code?: string | null;
}

export interface Viewer {
  id: string;
  role: string | null;
  linked_department_id: string | null;
}

/** 0 = Org level, 1 = Dept Head, 2 = Area Supervisor, 3 = Field Employee, 4 = View only */
export function getTier(role?: string | null): number {
  switch (role) {
    case 'admin':
    case 'municipal_administrator':
      return 0;
    case 'department_head':
      return 1;
    case 'supervisor':
      return 2;
    case 'field_employee':
    case 'dept_staff':
      return 3;
    default:
      return 4; // control_room, management_viewer, citizen...
  }
}

export const FLOW_STEPS = [0, 1, 2, 3];

export const TIER_LABEL: Record<number, { en: string; hi: string }> = {
  0: { en: 'Municipal Administrator', hi: 'नगर प्रशासक' },
  1: { en: 'Department Head', hi: 'विभाग प्रमुख' },
  2: { en: 'Area Supervisor', hi: 'क्षेत्र पर्यवेक्षक' },
  3: { en: 'Field Employee', hi: 'फील्ड कर्मचारी' },
  4: { en: 'View Only', hi: 'केवल देखने हेतु' },
};

export function roleLabel(role: string | null | undefined, language: 'en' | 'hi') {
  return TIER_LABEL[getTier(role)][language];
}

interface ComplaintLike {
  department_id?: string | null;
  assigned_to?: string | null;
}

/** Can this user see this complaint? */
export function canViewComplaint(viewer: Viewer, c: ComplaintLike): boolean {
  const t = getTier(viewer.role);
  if (t === 0) return true;
  if (!viewer.linked_department_id || viewer.linked_department_id !== c.department_id) return false;
  if (t === 3) return c.assigned_to === viewer.id; // field staff: only own tasks
  return true;
}

/** Only Admin / Dept Head / Supervisor can allot, and only inside their own department */
export function canAllotComplaint(viewer: Viewer, complaintDeptId?: string | null): boolean {
  const t = getTier(viewer.role);
  if (t > 2) return false;
  if (t === 0) return true;
  return !!viewer.linked_department_id && viewer.linked_department_id === complaintDeptId;
}

export function canResolveComplaint(viewer: Viewer, c: ComplaintLike): boolean {
  const t = getTier(viewer.role);
  if (t === 0) return true;
  if (t > 3) return false;
  if (!viewer.linked_department_id || viewer.linked_department_id !== c.department_id) return false;
  if (t === 3) return c.assigned_to === viewer.id;
  return true;
}

/**
 * Staff the viewer may allot to: the NEXT level down, in the complaint's department.
 * If the next level is empty, falls back to the following level.
 */
export function getAssignableStaff(
  viewer: Viewer,
  complaintDeptId: string | null,
  staff: StaffMember[]
): { targetTier: number | null; list: StaffMember[]; skippedLevel: boolean } {
  const myTier = getTier(viewer.role);
  if (myTier > 2) return { targetTier: null, list: [], skippedLevel: false };

  const pool = staff.filter(
    (s) => s.id !== viewer.id && (!complaintDeptId || s.linked_department_id === complaintDeptId)
  );

  for (let t = myTier + 1; t <= 3; t++) {
    const list = pool.filter((s) => getTier(s.role) === t);
    if (list.length > 0) return { targetTier: t, list, skippedLevel: t !== myTier + 1 };
  }
  return { targetTier: null, list: [], skippedLevel: false };
}
