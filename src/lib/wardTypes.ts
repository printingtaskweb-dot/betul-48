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

export function findWardForPoint(
  lat: number,
  lon: number,
  wards: Ward[],
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
