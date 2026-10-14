export interface Ward {
  id: string;
  city_id: string | null;
  zone_id: string | null;
  ward_number: number;
  name: string;
  name_hindi: string | null;
  description: string | null;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number;
  pincode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Area {
  id: string;
  ward_id: string;
  name: string;
  name_hindi: string | null;
  description: string | null;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number;
  pincode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Haversine distance in meters — pure JS, no DB call. */
export function distanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Find nearest ward that contains the given GPS point. */
export function findWardForPoint(
  lat: number, lon: number, wards: Ward[],
): Ward | null {
  let best: Ward | null = null;
  let bestDist = Infinity;
  for (const w of wards) {
    if (!w.is_active || w.center_latitude == null || w.center_longitude == null) continue;
    const d = distanceMeters(lat, lon, w.center_latitude, w.center_longitude);
    if (d <= (w.radius_meters || 2000) && d < bestDist) {
      best = w;
      bestDist = d;
    }
  }
  return best;
}

/** Find nearest area inside a ward (or anywhere if ward unknown). */
export function findAreaForPoint(
  lat: number, lon: number, areas: Area[], wardId?: string | null,
): Area | null {
  let best: Area | null = null;
  let bestDist = Infinity;
  for (const a of areas) {
    if (!a.is_active || a.center_latitude == null || a.center_longitude == null) continue;
    if (wardId && a.ward_id !== wardId) continue;
    const d = distanceMeters(lat, lon, a.center_latitude, a.center_longitude);
    if (d <= (a.radius_meters || 500) && d < bestDist) {
      best = a;
      bestDist = d;
    }
  }
  return best;
}
