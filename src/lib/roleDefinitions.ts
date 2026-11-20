// src/lib/roleDefinitions.ts
// Comprehensive, production-grade definition and capability matrix for the 9 Municipal Roles.

export type MunicipalRole =
  | 'platform_owner'
  | 'municipal_administrator'
  | 'department_head'
  | 'supervisor'
  | 'field_employee'
  | 'control_room'
  | 'verification_officer'
  | 'management_viewer'
  | 'citizen';

export interface RoleMetadata {
  id: MunicipalRole;
  titleEn: string;
  titleHi: string;
  shortTitle: string;
  tier: number;
  badgeColor: string;
  icon: string;
  descriptionEn: string;
  descriptionHi: string;
  allowedChannels: ('mobile' | 'web')[];
  canAllot: boolean;
  canDirectClose: boolean;
  canViewPhone: boolean;
  canExport: boolean;
}

export const MUNICIPAL_ROLES: Record<MunicipalRole, RoleMetadata> = {
  platform_owner: {
    id: 'platform_owner',
    titleEn: 'Platform Owner',
    titleHi: 'प्लेटफ़ॉर्म स्वामी / तकनीकी व्यवस्थापक',
    shortTitle: 'Platform Owner',
    tier: -1,
    badgeColor: '#4f46e5', // indigo
    icon: 'settings_suggest',
    descriptionEn: 'Company Technical & Tenant Admin. Municipality onboarding, system health, failed job retries, and technical support.',
    descriptionHi: 'कंपनी तकनीकी और किरायेदार व्यवस्थापक। नगर पालिका ऑनबोर्डिंग, सिस्टम स्वास्थ्य और तकनीकी सहायता।',
    allowedChannels: ['web'],
    canAllot: false,
    canDirectClose: false,
    canViewPhone: false,
    canExport: true,
  },
  municipal_administrator: {
    id: 'municipal_administrator',
    titleEn: 'Municipal Administrator',
    titleHi: 'नगर पालिका प्रशासक',
    shortTitle: 'Municipal Admin',
    tier: 0,
    badgeColor: '#0284c7', // sky
    icon: 'admin_panel_settings',
    descriptionEn: 'Overseeing municipal settings, department heads, control room, master data, SLA escalation policies, public notices, and verifiers.',
    descriptionHi: 'नगर पालिका सेटिंग्स, विभाग प्रमुखों, मास्टर डेटा, एसएलए नीतियां, सार्वजनिक सूचनाएं और सत्यापनकर्ताओं का पर्यवेक्षण।',
    allowedChannels: ['web'],
    canAllot: true,
    canDirectClose: true,
    canViewPhone: true,
    canExport: true,
  },
  department_head: {
    id: 'department_head',
    titleEn: 'Department Head',
    titleHi: 'विभाग प्रमुख',
    shortTitle: 'Dept Head',
    tier: 2,
    badgeColor: '#1d4ed8', // blue
    icon: 'apartment',
    descriptionEn: 'Managing ward supervisors, departmental complaints, reassignment exceptions, priority changes, and approving formal SLA pause & material requests.',
    descriptionHi: 'वार्ड पर्यवेक्षकों, विभागीय शिकायतों, प्राथमिकता परिवर्तन और कार्य-अवरोधक/सामग्री अनुरोधों की स्वीकृति का प्रबंधन।',
    allowedChannels: ['web'],
    canAllot: true,
    canDirectClose: true,
    canViewPhone: true,
    canExport: true,
  },
  supervisor: {
    id: 'supervisor',
    titleEn: 'Supervisor',
    titleHi: 'पर्यवेक्षक',
    shortTitle: 'Supervisor',
    tier: 4,
    badgeColor: '#d97706', // amber
    icon: 'engineering',
    descriptionEn: 'Managing field staff across assigned wards/departments, allocating tasks, helpers, deadlines, reviewing before/after evidence, and approving or returning work.',
    descriptionHi: 'मैदानी कर्मचारियों का प्रबंधन, कार्य आवंटन, समय-सीमा निर्धारण, साक्ष्य समीक्षा, और कार्य स्वीकृति या पुनरावृत्ति।',
    allowedChannels: ['mobile', 'web'],
    canAllot: true,
    canDirectClose: false, // Accepts resolution which triggers citizen verification / verifier
    canViewPhone: true,
    canExport: false,
  },
  field_employee: {
    id: 'field_employee',
    titleEn: 'Field Employee / Worker',
    titleHi: 'मैदानी कर्मचारी / परिचालक',
    shortTitle: 'Field Worker',
    tier: 5,
    badgeColor: '#475569', // slate
    icon: 'construction',
    descriptionEn: 'Executing assigned on-site tasks, 1-tap accept, logging start GPS, submitting interim updates, requesting materials, and uploading completion photos for supervisor review.',
    descriptionHi: 'आवंटित कार्यों का निष्पादन, प्रारंभ जीपीएस लॉग, प्रगति अद्यतन, सामग्री अनुरोध, और पर्यवेक्षक समीक्षा हेतु कार्य समापन फोटो प्रस्तुत करना।',
    allowedChannels: ['mobile'],
    canAllot: false,
    canDirectClose: false,
    canViewPhone: true,
    canExport: false,
  },
  control_room: {
    id: 'control_room',
    titleEn: 'Control Room Officer',
    titleHi: 'कंट्रोल रूम अधिकारी',
    shortTitle: 'Control Room',
    tier: 3,
    badgeColor: '#059669', // emerald
    icon: 'support_agent',
    descriptionEn: 'Citizen intake via telephone/counter, triage for tickets with missing wards/categories, citizen callbacks, and external agency referrals. Cannot mark citizens as satisfied.',
    descriptionHi: 'टेलीफोन/काउंटर के माध्यम से नागरिक शिकायत दर्ज करना, वार्ड/श्रेणी सुधार, नागरिक कॉलबैक और बाहरी विभाग संदर्भ।',
    allowedChannels: ['web'],
    canAllot: true, // Can route/triage tickets to departments
    canDirectClose: false,
    canViewPhone: true,
    canExport: false,
  },
  verification_officer: {
    id: 'verification_officer',
    titleEn: 'Verifier / Appeals Officer',
    titleHi: 'सत्यापन / अपील अधिकारी',
    shortTitle: 'Verifier',
    tier: 1,
    badgeColor: '#9333ea', // purple
    icon: 'fact_check',
    descriptionEn: 'Independently verifying resolutions for dissatisfied citizens, 72h no-response timeouts, and officer-requested checks. Binding decisions: Resolved, Rework, Info, or Transfer. Cannot review own cases.',
    descriptionHi: 'नागरिक असंतोष, 72 घंटे की समय-सीमा समाप्ति और अपीलों का निष्पक्ष सत्यापन। अपने स्वयं के मामलों की समीक्षा प्रतिबंधित।',
    allowedChannels: ['web'],
    canAllot: false,
    canDirectClose: true, // Binding verification can close or send for rework
    canViewPhone: true,
    canExport: false,
  },
  management_viewer: {
    id: 'management_viewer',
    titleEn: 'Management Viewer',
    titleHi: 'प्रबंधन दर्शक',
    shortTitle: 'Management Viewer',
    tier: 6,
    badgeColor: '#64748b', // cool gray
    icon: 'visibility',
    descriptionEn: 'Strictly read-only oversight of reports and timeliness metrics for authorized municipalities and wards. Citizen phone numbers are masked. Export is disabled unless explicitly permitted.',
    descriptionHi: 'अधिकृत नगर पालिकाओं और वार्डों की रिपोर्टों की केवल-पठन निगरानी। नागरिक फोन नंबर गुप्त रखे जाते हैं।',
    allowedChannels: ['web'],
    canAllot: false,
    canDirectClose: false,
    canViewPhone: false, // Must be masked!
    canExport: false, // Default false, requires can_export_data = true
  },
  citizen: {
    id: 'citizen',
    titleEn: 'Citizen',
    titleHi: 'नागरिक',
    shortTitle: 'Citizen',
    tier: 7,
    badgeColor: '#14b8a6', // teal
    icon: 'person',
    descriptionEn: 'Register via Mobile OTP, submit complaints with up to 5 photos and map pin, track timeline, append notes before work starts, confirm fix (1-5 stars) or appeal within 7 days, view notices and directory.',
    descriptionHi: 'मोबाइल ओटीपी लॉगिन, फोटो और मानचित्र के साथ शिकायत दर्ज, समयरेखा ट्रैकिंग, समाधान पुष्टि (1-5 स्टार) या 7 दिनों में अपील।',
    allowedChannels: ['mobile', 'web'],
    canAllot: false,
    canDirectClose: false, // Can confirm satisfaction or appeal
    canViewPhone: false,
    canExport: false,
  },
};

/**
 * Standardize any legacy or variant role string into one of the 9 canonical roles.
 */
export function normalizeRole(roleString?: string | null): MunicipalRole {
  const r = (roleString || '').toLowerCase().trim();
  if (r === 'platform_owner' || r === 'super_admin' || r === 'company_admin') {
    return 'platform_owner';
  }
  if (r === 'municipal_administrator' || r === 'admin' || r === 'commissioner' || r === 'municipal_commissioner') {
    return 'municipal_administrator';
  }
  if (r === 'department_head' || r === 'dept_head' || r === 'deputy_commissioner') {
    return 'department_head';
  }
  if (r === 'supervisor' || r === 'area_officer') {
    return 'supervisor';
  }
  if (r === 'field_employee' || r === 'operational_staff' || r === 'dept_staff' || r === 'worker') {
    return 'field_employee';
  }
  if (r === 'control_room' || r === 'call_center') {
    return 'control_room';
  }
  if (r === 'verification_officer' || r === 'verifier' || r === 'appeals_officer') {
    return 'verification_officer';
  }
  if (r === 'management_viewer' || r === 'viewer' || r === 'observer') {
    return 'management_viewer';
  }
  return 'citizen';
}

/**
 * Mask citizen phone number for Management Viewers or unprivileged roles.
 * e.g., "9876543210" -> "98******10"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '—';
  const clean = phone.trim();
  if (clean.length < 6) return '******';
  const prefix = clean.slice(0, 2);
  const suffix = clean.slice(-2);
  return `${prefix}${'*'.repeat(Math.max(4, clean.length - 4))}${suffix}`;
}

/**
 * Check whether a verifier is legally allowed to verify a complaint.
 * Rule: Verifier CANNOT review cases they worked on or supervised themselves!
 */
export function canVerifyCase(
  verifierUserId: string,
  complaint: { assigned_to?: string | null; assigned_by?: string | null; supervisor_id?: string | null }
): boolean {
  if (!verifierUserId) return false;
  if (complaint.assigned_to === verifierUserId) return false;
  if (complaint.assigned_by === verifierUserId) return false;
  if (complaint.supervisor_id === verifierUserId) return false;
  return true;
}
