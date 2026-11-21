// src/lib/wardTypes.ts
export interface Ward {
  id: string;
  ward_number: number;
  name: string;
  name_hindi: string | null;
  description: string | null;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number;
  pincode: string | null;
  is_active: boolean;
  boundary_coordinates?: [number, number][] | null;
  area_sq_meters?: number | null;
  assigned_department_id?: string | null;
  assigned_head_id?: string | null;
  assigned_supervisor_id?: string | null;
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

/** Haversine distance in meters. Pure JS, no DB call. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
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

/**
 * Geodesic area calculation for polygon coordinates on Earth (in square meters)
 */
export function calculateGeodesicArea(coords: [number, number][]): number {
  if (!coords || coords.length < 3) return 0;
  const RADIUS = 6378137; // Earth's radius in meters
  let total = 0;
  const len = coords.length;

  for (let i = 0; i < len; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % len];
    const lat1 = (p1[0] * Math.PI) / 180;
    const lon1 = (p1[1] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const lon2 = (p2[1] * Math.PI) / 180;

    total += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  return Math.abs((total * RADIUS * RADIUS) / 2.0);
}

/**
 * Ray-Casting Point-in-Polygon test for geographic coordinates [lat, lon]
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  if (!polygon || polygon.length < 3) return false;
  const [lat, lon] = point;
  let inside = false;
  const len = polygon.length;

  for (let i = 0, j = len - 1; i < len; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lon !== yj > lon &&
      lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

export function findWardForPoint(
  lat: number,
  lon: number,
  wards: Ward[],
): Ward | null {
  // 1. First priority: Check exact polygon boundaries
  for (const w of wards) {
    if (!w.is_active) continue;
    if (w.boundary_coordinates && Array.isArray(w.boundary_coordinates) && w.boundary_coordinates.length >= 3) {
      if (isPointInPolygon([lat, lon], w.boundary_coordinates)) {
        return w;
      }
    }
  }

  // 2. Second priority: Fall back to Haversine radius from center point
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

/** Reverse-geocode via OpenStreetMap Nominatim (free, no key). */
export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (
      data?.display_name ||
      data?.address?.suburb ||
      data?.address?.neighbourhood ||
      data?.address?.city_district ||
      null
    );
  } catch {
    return null;
  }
}
