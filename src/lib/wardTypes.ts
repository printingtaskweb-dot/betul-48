// src/lib/wardTypes.ts
export type LatLngTuple = [number, number];
export type WardBoundaryGeometry = LatLngTuple[] | LatLngTuple[][];

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
  boundary_coordinates?: WardBoundaryGeometry | null;
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
 * Normalize single-polygon (`[lat, lng][]`) or multi-polygon (`[lat, lng][][]`)
 * into an array of closed coordinate rings with at least 3 valid vertices.
 */
export function getWardPolygons(boundary?: WardBoundaryGeometry | null): LatLngTuple[][] {
  if (!boundary || !Array.isArray(boundary) || boundary.length === 0) return [];
  const first = boundary[0] as unknown;
  if (!Array.isArray(first) || first.length === 0) return [];

  const isRing = (arr: unknown[]): arr is LatLngTuple[] =>
    arr.length >= 3 &&
    Array.isArray(arr[0]) &&
    typeof (arr[0] as unknown[])[0] === 'number' &&
    typeof (arr[0] as unknown[])[1] === 'number' &&
    Number.isFinite((arr[0] as number[])[0]) &&
    Number.isFinite((arr[0] as number[])[1]);

  if (typeof (first as unknown[])[0] === 'number') {
    return isRing(boundary as unknown[]) ? [boundary as LatLngTuple[]] : [];
  }

  return (boundary as unknown[][])
    .filter((piece): piece is LatLngTuple[] => Array.isArray(piece) && isRing(piece));
}

export function countBoundaryCorners(boundary?: WardBoundaryGeometry | null): number {
  return getWardPolygons(boundary).reduce((sum, ring) => sum + ring.length, 0);
}

export function calculateBoundaryAreaSqMeters(boundary?: WardBoundaryGeometry | null): number {
  return getWardPolygons(boundary).reduce((sum, ring) => sum + calculateGeodesicArea(ring), 0);
}

/**
 * Ray-Casting Point-in-Polygon test for geographic coordinates [lat, lon]
 */
export function isPointInPolygon(
  point: LatLngTuple,
  polygon: LatLngTuple[],
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

export function isPointInWardBoundary(
  point: LatLngTuple,
  boundary?: WardBoundaryGeometry | null,
): boolean {
  return getWardPolygons(boundary).some((ring) => isPointInPolygon(point, ring));
}

/**
 * Compute a guaranteed interior point for placing labels/markers inside a polygon ring.
 */
export function getRingLabelPoint(ring: LatLngTuple[]): LatLngTuple {
  if (!ring || ring.length === 0) return [21.909302, 77.901614];
  if (ring.length < 3) return ring[0];

  const len = ring.length;
  let a2 = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < len; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % len];
    const cross = x0 * y1 - x1 * y0;
    a2 += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  if (Math.abs(a2) > 1e-12) {
    const centroid: LatLngTuple = [cx / (3 * a2), cy / (3 * a2)];
    if (isPointInPolygon(centroid, ring)) {
      return centroid;
    }
  }

  // Fallback for concave polygons: widest horizontal scanline chord midpoint
  let minLat = ring[0][0];
  let maxLat = ring[0][0];
  for (let i = 1; i < len; i++) {
    if (ring[i][0] < minLat) minLat = ring[i][0];
    if (ring[i][0] > maxLat) maxLat = ring[i][0];
  }

  let best: LatLngTuple | null = null;
  let bestSpan = -1;

  for (let k = 1; k <= 15; k++) {
    const lat = minLat + ((maxLat - minLat) * k) / 16;
    const xs: number[] = [];

    for (let i = 0, j = len - 1; i < len; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((xi > lat) !== (xj > lat)) {
        const lng = yi + ((yj - yi) * (lat - xi)) / (xj - xi);
        xs.push(lng);
      }
    }

    xs.sort((a, b) => a - b);
    for (let m = 0; m + 1 < xs.length; m += 2) {
      const span = xs[m + 1] - xs[m];
      const mid = (xs[m] + xs[m + 1]) / 2;
      if (span > bestSpan && isPointInPolygon([lat, mid], ring)) {
        bestSpan = span;
        best = [lat, mid];
      }
    }
  }

  if (best) return best;

  let sumLat = 0;
  let sumLng = 0;
  for (let i = 0; i < len; i++) {
    sumLat += ring[i][0];
    sumLng += ring[i][1];
  }
  return [sumLat / len, sumLng / len];
}

/**
 * Return the preferred display coordinate for a ward (guaranteed inside polygon when mapped).
 */
export function getWardDisplayPoint(
  ward: Pick<Ward, 'center_latitude' | 'center_longitude' | 'boundary_coordinates'>,
): LatLngTuple | null {
  const rings = getWardPolygons(ward.boundary_coordinates);
  if (
    rings.length === 1 &&
    ward.center_latitude != null &&
    ward.center_longitude != null &&
    isPointInPolygon([ward.center_latitude, ward.center_longitude], rings[0])
  ) {
    return [ward.center_latitude, ward.center_longitude];
  }

  if (rings.length > 0) {
    let largestRing = rings[0];
    if (rings.length > 1) {
      let maxArea = calculateGeodesicArea(largestRing);
      for (let i = 1; i < rings.length; i++) {
        const area = calculateGeodesicArea(rings[i]);
        if (area > maxArea) {
          maxArea = area;
          largestRing = rings[i];
        }
      }
    }
    return getRingLabelPoint(largestRing);
  }

  if (ward.center_latitude != null && ward.center_longitude != null) {
    return [ward.center_latitude, ward.center_longitude];
  }

  return null;
}

export function findWardForPoint(
  lat: number,
  lon: number,
  wards: Ward[],
): Ward | null {
  // 1. First priority: Check exact polygon boundaries (supports multi-piece wards)
  for (const w of wards) {
    if (!w.is_active) continue;
    if (isPointInWardBoundary([lat, lon], w.boundary_coordinates)) {
      return w;
    }
  }

  // 2. Second priority: Fall back to Haversine radius from center point
  let best: Ward | null = null;
  let bestDist = Infinity;
  for (const w of wards) {
    if (
      !w.is_active ||
      w.center_latitude == null ||
      w.center_longitude == null ||
      (getWardPolygons(w.boundary_coordinates).length === 0 && w.area_sq_meters === 0)
    ) {
      continue;
    }
    const d = distanceMeters(lat, lon, w.center_latitude, w.center_longitude);
    if (d <= (w.radius_meters || 1000) && d < bestDist) {
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
