// src/lib/hierarchy.ts
// Single source of truth for "who can see / allot / resolve what" across the portal

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

/**
 * 0 = Municipal Administrator (City-wide purview)
 * 1 = Department Head (Manages complete department)
 * 2 = Area / Ward Supervisor (Manages area field teams)
 * 3 = Field Employee / Operative (Performs work, CANNOT allot or reassign)
 * 4 = View only / Others
 */
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
  0: { en: 'Municipal Administrator', hi: 'नगर प्रशासक (उच्च स्तर)' },
  1: { en: 'Department Head', hi: 'विभाग प्रमुख (Tier 1)' },
  2: { en: 'Area Supervisor', hi: 'क्षेत्र पर्यवेक्षक (Tier 2)' },
  3: { en: 'Field Employee', hi: 'फील्ड कर्मचारी (Tier 3 - निष्पादक)' },
  4: { en: 'View Only', hi: 'केवल देखने हेतु' },
};

export function roleLabel(role: string | null | undefined, language: 'en' | 'hi') {
  return TIER_LABEL[getTier(role)][language];
}

interface ComplaintLike {
  department_id?: string | null;
  assigned_to?: string | null;
}

/** 
 * Strict Department Isolation:
 * - Municipal Admin (Tier 0) sees all departments across city.
 * - Department Head (Tier 1) & Supervisor (Tier 2) can ONLY see their own department's complaints.
 * - Field Employee (Tier 3) can ONLY see complaints in their own department that are assigned to them.
 */
export function canViewComplaint(viewer: Viewer, c: ComplaintLike): boolean {
  const t = getTier(viewer.role);
  if (t === 0) return true; // Municipal admin sees all
  if (!viewer.linked_department_id || viewer.linked_department_id !== c.department_id) {
    return false; // Strictly isolated: different department cannot see other department's complaints!
  }
  if (t === 3) {
    return c.assigned_to === viewer.id; // Field employees only see their assigned complaints
  }
  return true;
}

/** 
 * Strict Allotment Authority:
 * - ONLY Higher Designations (Tier 0, 1, 2) can allot or reassign complaints.
 * - Lower designation staff (Tier 3: Field Employee / Dept Staff) CANNOT ALLOT and CANNOT REASSIGN!
 * - Must belong to the complaint's department (unless Municipal Admin).
 */
export function canAllotComplaint(viewer: Viewer, complaintDeptId?: string | null): boolean {
  const t = getTier(viewer.role);
  // Lower designation staff (Tier 3+) CANNOT allot or reassign!
  if (t > 2) return false;
  // Municipal Admin (Tier 0) can allot any complaint
  if (t === 0) return true;
  // Department Head & Supervisor can only allot inside their own department
  return !!viewer.linked_department_id && viewer.linked_department_id === complaintDeptId;
}

/**
 * Resolution Authority:
 * Field staff can resolve if assigned to them. Higher tiers can also mark resolved if in their department.
 */
export function canResolveComplaint(viewer: Viewer, c: ComplaintLike): boolean {
  const t = getTier(viewer.role);
  if (t === 0) return true;
  if (t > 3) return false;
  if (!viewer.linked_department_id || viewer.linked_department_id !== c.department_id) return false;
  if (t === 3) return c.assigned_to === viewer.id;
  return true;
}

/**
 * Get supervisors for a specific department
 */
export function getDepartmentSupervisors(deptId: string | null, staffList: StaffMember[]): StaffMember[] {
  return staffList.filter((s) => {
    const isDept = !deptId || s.linked_department_id === deptId;
    return isDept && getTier(s.role) === 2;
  });
}

/**
 * Get field employees for a specific department (optionally filtered by ward)
 */
export function getDepartmentFieldEmployees(
  deptId: string | null,
  staffList: StaffMember[],
  ward?: string | null
): StaffMember[] {
  return staffList.filter((s) => {
    const isDept = !deptId || s.linked_department_id === deptId;
    const isTier3 = getTier(s.role) === 3;
    const isWard = !ward || ward === 'all' || s.ward_number === ward;
    return isDept && isTier3 && isWard;
  });
}

/**
 * Legacy helper maintained for compatibility
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
