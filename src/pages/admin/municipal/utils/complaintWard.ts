import {
  getWardPolygons,
  isPointInWardBoundary,
  type Ward,
} from '../../../../lib/wardTypes';
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
  if (complaint.ward_id) return complaint.ward_id === ward.id;
  if (complaint.area?.ward_id) return complaint.area.ward_id === ward.id;
  if (ward.is_active === false) return false;

  if (complaint.latitude != null && complaint.longitude != null) {
    if (getWardPolygons(ward.boundary_coordinates).length > 0) {
      return isPointInWardBoundary(
        [complaint.latitude, complaint.longitude],
        ward.boundary_coordinates,
      );
    }
    if (
      ward.area_sq_meters !== 0 &&
      ward.center_latitude != null &&
      ward.center_longitude != null
    ) {
      return (
        haversineMeters(
          ward.center_latitude,
          ward.center_longitude,
          complaint.latitude,
          complaint.longitude,
        ) <= (ward.radius_meters || 1000)
      );
    }
  }

  const wardMatch =
    complaint.address?.match(/\bward\s*0*(\d+)\b/i) ||
    complaint.description.match(/\bward\s*0*(\d+)\b/i);
  if (wardMatch && Number(wardMatch[1]) === ward.ward_number) return true;

  return false;
}