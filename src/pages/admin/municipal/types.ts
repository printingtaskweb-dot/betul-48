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

export type ViewTab =
  | 'overview'
  | 'analytics'
  | 'complaints'
  | 'departments'
  | 'wards'
  | 'team'
  | 'ward-manager'
  | 'location-viewer';
