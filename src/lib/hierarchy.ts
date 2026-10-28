// src/lib/hierarchy.ts
// Comprehensive, single source of truth for Municipal Hierarchy across the portal.
// Hierarchy Order:
// Tier 0: Municipal / Organisation Head & Super Admin (Highest Designation)
// Tier 1: Deputy Commissioner
// Tier 2: Department Head
// Tier 3: Area Officer
// Tier 4: Supervisor
// Tier 5: Operational Staff / Field Employee (Executor, CANNOT allot or reassign)
// Tier 6: View Only / Citizen

export interface StaffMember {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
  staff_code: string | null;
  linked_department_id: string | null;
  assigned_ward_id?: string | null;
  ward_number?: string | null;
  authority_role?: string | null;
  hierarchy_code?: string | null;
}

export interface Viewer {
  id: string;
  role: string | null;
  linked_department_id: string | null;
  hierarchy_code?: string | null;
  authority_role?: string | null;
  is_admin?: boolean;
}

/**
 * 0 = Municipal / Organisation Head & Admin (City-wide purview, full control except news approval)
 * 1 = Deputy Commissioner (Oversees all lower department tasks, Power BI metrics, timings)
 * 2 = Department Head (Strictly isolated to their own department, allocates to Area Officer)
 * 3 = Area Officer (Oversees designated area/ward for department, allocates to Supervisor)
 * 4 = Supervisor (Field supervisor, allocates to Operational Staff)
 * 5 = Operational Staff / Field Worker (Executes work, CANNOT allot or reassign)
 * 6 = View only / Citizen
 */
export function getTier(
  role?: string | null,
  hierarchyCode?: string | null,
  authorityRole?: string | null
): number {
  const code = (hierarchyCode || authorityRole || role || '').toLowerCase().trim();

  // Tier 0: Municipal / Organisation Head & Platform Admin
  if (
    code === 'admin' ||
    code === 'municipal_administrator' ||
    code === 'municipal_commissioner' ||
    code === 'commissioner' ||
    code === 'organisation_head'
  ) {
    return 0;
  }

  // Tier 1: Deputy Commissioner
  if (code === 'deputy_commissioner' || code.includes('deputy_comm')) {
    return 1;
  }

  // Tier 2: Department Head
  if (code === 'department_head' || code === 'dept_head') {
    return 2;
  }

  // Tier 3: Area Officer
  if (
    code === 'area_officer' ||
    code.includes('area_officer') ||
    code.includes('zone_officer') ||
    code.includes('ward_officer') ||
    code === 'area_inspector'
  ) {
    return 3;
  }

  // Tier 4: Supervisor
  if (code === 'supervisor' || code.includes('supervisor')) {
    return 4;
  }

  // Tier 5: Operational Staff / Field Employee
  if (
    code === 'operational_staff' ||
    code === 'field_employee' ||
    code === 'dept_staff' ||
    code.includes('worker') ||
    code.includes('crew')
  ) {
    return 5;
  }

  return 6;
}

export const FLOW_STEPS = [0, 1, 2, 3, 4, 5];

export const TIER_LABEL: Record<
  number,
  { en: string; hi: string; short: string; badgeColor: string; icon: string }
> = {
  0: {
    en: 'Municipal / Organisation Head',
    hi: 'नगर पालिका / संगठन प्रमुख',
    short: 'Municipal Head',
    badgeColor: '#146C94',
    icon: 'admin_panel_settings',
  },
  1: {
    en: 'Deputy Commissioner',
    hi: 'उपायुक्त (डिप्टी कमिश्नर)',
    short: 'Deputy Comm.',
    badgeColor: '#7c2d12',
    icon: 'account_balance',
  },
  2: {
    en: 'Department Head',
    hi: 'विभाग प्रमुख',
    short: 'Dept Head',
    badgeColor: '#1e3a8a',
    icon: 'apartment',
  },
  3: {
    en: 'Area Officer',
    hi: 'क्षेत्र अधिकारी',
    short: 'Area Officer',
    badgeColor: '#065f46',
    icon: 'pin_drop',
  },
  4: {
    en: 'Supervisor',
    hi: 'पर्यवेक्षक',
    short: 'Supervisor',
    badgeColor: '#854d0e',
    icon: 'engineering',
  },
  5: {
    en: 'Operational Staff',
    hi: 'परिचालन / मैदानी कर्मचारी',
    short: 'Field Worker',
    badgeColor: '#374151',
    icon: 'construction',
  },
  6: {
    en: 'View Only / Citizen',
    hi: 'केवल दर्शक / नागरिक',
    short: 'Viewer',
    badgeColor: '#6b7280',
    icon: 'person',
  },
};

export function roleLabel(role: string | null | undefined, language: 'en' | 'hi') {
  const tier = getTier(role);
  return TIER_LABEL[tier][language];
}

interface ComplaintLike {
  department_id?: string | null;
  assigned_to?: string | null;
  address?: string | null;
}

/**
 * Strict Data Visibility & Department Isolation:
 * - Municipal Head (Tier 0) & Deputy Commissioner (Tier 1) have city-wide visibility across all departments and wards.
 * - Department Head (Tier 2) can ONLY see their own department's complaints and staff!
 * - Area Officer (Tier 3) & Supervisor (Tier 4) can only see complaints within their own department and designated area.
 * - Operational Staff (Tier 5) can ONLY see complaints assigned to them.
 */
export function canViewComplaint(viewer: Viewer, c: ComplaintLike): boolean {
  const t = getTier(viewer.role, viewer.hierarchy_code, viewer.authority_role);
  if (t <= 1) return true; // City-wide purview (Municipal Head & Deputy Commissioner)

  // Strict department isolation: cannot see other departments' data!
  if (!viewer.linked_department_id || viewer.linked_department_id !== c.department_id) {
    return false;
  }

  // Operational staff can only see their assigned complaints
  if (t === 5) {
    return c.assigned_to === viewer.id;
  }

  return true;
}

/**
 * Cascading Allotment Authority:
 * - Municipal Head (Tier 0) & Deputy Commissioner (Tier 1) can allot complaints city-wide.
 * - Department Head (Tier 2) can allot tasks in their department to Area Officers or lower staff.
 * - Area Officer (Tier 3) can allot tasks in their area to Supervisors.
 * - Supervisor (Tier 4) can allot tasks to Operational Staff.
 * - Operational Staff (Tier 5) CANNOT ALLOT and CANNOT REASSIGN tasks under any circumstances!
 */
export function canAllotComplaint(viewer: Viewer, complaintDeptId?: string | null): boolean {
  const t = getTier(viewer.role, viewer.hierarchy_code, viewer.authority_role);
  // Lower operational staff (Tier 5+) CANNOT allot or reassign!
  if (t > 4) return false;

  // City-wide allotment authority for Municipal Head & Deputy Commissioner
  if (t <= 1) return true;

  // Must belong to the complaint's department
  return !!viewer.linked_department_id && viewer.linked_department_id === complaintDeptId;
}

/**
 * Resolution Authority:
 * Operational staff can mark resolved if assigned to them. Higher tiers in that department can also resolve.
 */
export function canResolveComplaint(viewer: Viewer, c: ComplaintLike): boolean {
  const t = getTier(viewer.role, viewer.hierarchy_code, viewer.authority_role);
  if (t <= 1) return true;
  if (t > 5) return false;
  if (!viewer.linked_department_id || viewer.linked_department_id !== c.department_id) return false;
  if (t === 5) return c.assigned_to === viewer.id;
  return true;
}

/**
 * Get Department Heads (Tier 2)
 */
export function getDepartmentHeads(deptId: string | null, staffList: StaffMember[]): StaffMember[] {
  return staffList.filter((s) => {
    const isDept = !deptId || s.linked_department_id === deptId;
    return isDept && getTier(s.role, s.hierarchy_code, s.authority_role) === 2;
  });
}

/**
 * Get Area Officers (Tier 3)
 */
export function getAreaOfficers(
  deptId: string | null,
  staffList: StaffMember[],
  ward?: string | null
): StaffMember[] {
  return staffList.filter((s) => {
    const isDept = !deptId || s.linked_department_id === deptId;
    const isTier = getTier(s.role, s.hierarchy_code, s.authority_role) === 3;
    const isWard = !ward || ward === 'all' || s.ward_number === ward;
    return isDept && isTier && isWard;
  });
}

/**
 * Get Supervisors (Tier 4)
 */
export function getDepartmentSupervisors(
  deptId: string | null,
  staffList: StaffMember[],
  ward?: string | null
): StaffMember[] {
  return staffList.filter((s) => {
    const isDept = !deptId || s.linked_department_id === deptId;
    const isTier = getTier(s.role, s.hierarchy_code, s.authority_role) === 4;
    const isWard = !ward || ward === 'all' || s.ward_number === ward;
    return isDept && isTier && isWard;
  });
}

/**
 * Get Operational Staff / Field Employees (Tier 5)
 */
export function getDepartmentFieldEmployees(
  deptId: string | null,
  staffList: StaffMember[],
  ward?: string | null
): StaffMember[] {
  return staffList.filter((s) => {
    const isDept = !deptId || s.linked_department_id === deptId;
    const isTier = getTier(s.role, s.hierarchy_code, s.authority_role) === 5;
    const isWard = !ward || ward === 'all' || s.ward_number === ward;
    return isDept && isTier && isWard;
  });
}

/**
 * Get staff by specific tier for stepped allocation dropdowns
 */
export function getStaffByTier(
  deptId: string | null,
  staffList: StaffMember[],
  targetTier: number,
  ward?: string | null
): StaffMember[] {
  return staffList.filter((s) => {
    const isDept = !deptId || s.linked_department_id === deptId;
    const isTier = getTier(s.role, s.hierarchy_code, s.authority_role) === targetTier;
    const isWard = !ward || ward === 'all' || s.ward_number === ward;
    return isDept && isTier && isWard;
  });
}

/**
 * Legacy helper maintained for backward compatibility
 */
export function getAssignableStaff(
  viewer: Viewer,
  complaintDeptId: string | null,
  staff: StaffMember[]
): { targetTier: number | null; list: StaffMember[]; skippedLevel: boolean } {
  const myTier = getTier(viewer.role, viewer.hierarchy_code, viewer.authority_role);
  if (myTier > 4) return { targetTier: null, list: [], skippedLevel: false };

  const pool = staff.filter(
    (s) => s.id !== viewer.id && (!complaintDeptId || s.linked_department_id === complaintDeptId)
  );

  for (let t = myTier + 1; t <= 5; t++) {
    const list = pool.filter((s) => getTier(s.role, s.hierarchy_code, s.authority_role) === t);
    if (list.length > 0) return { targetTier: t, list, skippedLevel: t !== myTier + 1 };
  }
  return { targetTier: null, list: [], skippedLevel: false };
}
