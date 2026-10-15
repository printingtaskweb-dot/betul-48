import type { Area, Ward } from '../../../lib/wardTypes';

export interface ComplaintRecord {
  id: string;
  ticket_number: string;
  department_id: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  assigned_to: string | null;
  assignment_notes: string | null;
  ward_id: string | null;
  area_id: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  location?: unknown;
  department?: { name: string; icon: string } | null;
  ward?: Ward | null;
  area?: Area | null;
  assignee?: StaffMemberLite | null;
  assigner?: StaffMemberLite | null;
  resolutions?: ResolutionRecord[];
  verifications?: VerificationRecord[];
}

export interface ResolutionRecord {
  id: string;
  admin_note: string | null;
  resolution_photo_url: string | null;
  resolved_by: string;
  resolved_at: string | null;
}

export interface VerificationRecord {
  id: string;
  verified_by: string;
  is_satisfied: boolean;
  note: string | null;
  verified_at: string | null;
}

export interface DepartmentRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface NearbyComplaint {
  id: string;
  ticket_number: string;
  description: string;
  address: string | null;
  status: string;
  distance_meters: number;
}

export interface DeptMetric {
  dept: DepartmentRow;
  total: number;
  resolved: number;
  inProgress: number;
  pending: number;
  rate: number;
  overdue: number;
  head: StaffMemberLite | null;
}

export interface AreaHotspot {
  key: string;              // ward id or area id or 'unassigned'
  label: string;            // "Ward 12 · Kothi Bazaar" or "Unassigned"
  total: number;
  resolved: number;
  pending: number;
  topDepartment: string | null;
  center_lat: number | null;
  center_lon: number | null;
  radius_m: number | null;
}

export interface StaffMemberLite {
  id: string;
  full_name: string | null;
  phone: string | null;
  email?: string | null;
  role: string | null;
  hierarchy_code?: string | null;
  authority_role?: string | null;
  linked_department_id: string | null;
  ward_number?: string | null;
}

export type ViewTab =
  | 'overview'
  | 'analytics'
  | 'complaints'
  | 'departments'
  | 'wards'
  | 'team'
  | 'ward-manager'
  | 'location-viewer';
