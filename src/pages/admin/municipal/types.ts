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
  department?: { name: string; icon: string } | null;
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
  role: string;
  hierarchy_code: string | null;
  authority_role: string | null;
  linked_department_id: string | null;
  ward_number: string | null;
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
