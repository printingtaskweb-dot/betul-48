import type { Ward } from '../../../../lib/wardTypes';
import { haversineMeters } from './haversine';

interface WardComplaint {
  ward_id?: string | null;
  area?: { ward_id?: string | null } | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  description: string;
}

export function isComplaintInWard(complaint: WardComplaint, ward: Ward): boolean {
  if (complaint.ward_id === ward.id || complaint.area?.ward_id === ward.id) return true;

  const wardMatch = complaint.address?.match(/ward\s*(\d+)/i)
    || complaint.description.match(/ward\s*(\d+)/i);
  if (wardMatch && Number(wardMatch[1]) === ward.ward_number) return true;

  if (
    complaint.latitude == null || complaint.longitude == null ||
    ward.center_latitude == null || ward.center_longitude == null
  ) return false;

  return haversineMeters(
    ward.center_latitude,
    ward.center_longitude,
    complaint.latitude,
    complaint.longitude,
  ) <= (ward.radius_meters || 2000);
}