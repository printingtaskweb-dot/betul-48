import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '../lib/supabase';
import { isPointInPolygon } from '../lib/wardTypes';

export interface WardArea {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number; // e.g. 1500 meters (1.5 km)
  boundaryCoords?: [number, number][] | null;
  departmentName?: string | null;
}

export interface StaffTrackingState {
  isTracking: boolean;
  assignedWard: WardArea | null;
  lastPosition: { lat: number; lng: number; timestamp: number } | null;
  isOutsideArea: boolean;
  distanceFromCenterMeters: number | null;
}

let activeWatchId: string | null = null;
let currentTrackingState: StaffTrackingState = {
  isTracking: false,
  assignedWard: null,
  lastPosition: null,
  isOutsideArea: false,
  distanceFromCenterMeters: null,
};

const listeners = new Set<(state: StaffTrackingState) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...currentTrackingState }));
}

/**
 * Haversine formula to compute distance in meters between two GPS coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Trigger an instant high-priority native notification if outside assigned ward or department boundary
 */
async function triggerGeofenceAlert(wardName: string, distanceMeters: number, deptName?: string | null) {
  try {
    const alertTitle = '⚠️ Duty Boundary Breach Alert';
    const alertBody = deptName
      ? `You have stepped outside the operational boundary for ${wardName} (${deptName}). Please return to your assigned sector immediately.`
      : `You are outside your assigned duty area for ${wardName}. Please return to your operational sector immediately.`;

    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.requestPermissions();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 9901,
            title: alertTitle,
            body: alertBody,
            schedule: { at: new Date(Date.now() + 200) },
            sound: 'beep.wav',
            actionTypeId: '',
            extra: { wardName, distanceMeters, deptName },
          },
        ],
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(alertTitle, {
        body: alertBody,
      });
    }
  } catch (err) {
    console.warn('Could not trigger notification:', err);
  }
}

/**
 * Handle new incoming GPS position
 */
async function handlePositionUpdate(pos: Position | GeolocationPosition, ward: WardArea) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const distance = calculateDistanceMeters(lat, lng, ward.centerLat, ward.centerLng);

  // Check polygon boundary first if defined; otherwise fallback to circular radius
  const hasPolygon =
    ward.boundaryCoords &&
    Array.isArray(ward.boundaryCoords) &&
    ward.boundaryCoords.length >= 3;

  const isOutside = hasPolygon
    ? !isPointInPolygon([lat, lng], ward.boundaryCoords!)
    : distance > ward.radiusMeters;

  const previousOutside = currentTrackingState.isOutsideArea;

  currentTrackingState = {
    ...currentTrackingState,
    lastPosition: { lat, lng, timestamp: pos.timestamp },
    distanceFromCenterMeters: distance,
    isOutsideArea: isOutside,
  };

  notifyListeners();

  // If newly stepped outside allocated zone, trigger alert
  if (isOutside && !previousOutside) {
    await triggerGeofenceAlert(ward.name, distance, ward.departmentName);
  }

  // Persist location breadcrumb & breach status to Supabase
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      await supabase.from('staff_locations').insert({
        staff_id: authData.user.id,
        ward_id: ward.id,
        ward_name: ward.name,
        latitude: lat,
        longitude: lng,
        accuracy: pos.coords.accuracy || null,
        distance_from_center: distance,
        is_outside_area: isOutside,
        recorded_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    // Non-blocking log persistence
    console.debug('Failed to log staff location breadcrumb:', err);
  }
}

/**
 * Start operational staff duty location tracking
 */
export async function startStaffTracking(ward: WardArea): Promise<{ success: boolean; error?: string }> {
  try {
    if (Capacitor.isNativePlatform()) {
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== 'granted') {
        return { success: false, error: 'Location permission denied by user.' };
      }

      currentTrackingState = {
        isTracking: true,
        assignedWard: ward,
        lastPosition: null,
        isOutsideArea: false,
        distanceFromCenterMeters: null,
      };
      notifyListeners();

      // Initial fix
      const initialPos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      await handlePositionUpdate(initialPos, ward);

      // Continuous Watcher
      activeWatchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        (position) => {
          if (position) {
            handlePositionUpdate(position, ward);
          }
        }
      );
    } else {
      // Browser fallback
      if (!('geolocation' in navigator)) {
        return { success: false, error: 'Geolocation not supported on this browser.' };
      }

      currentTrackingState = {
        isTracking: true,
        assignedWard: ward,
        lastPosition: null,
        isOutsideArea: false,
        distanceFromCenterMeters: null,
      };
      notifyListeners();

      const watchId = navigator.geolocation.watchPosition(
        (position) => handlePositionUpdate(position, ward),
        (err) => console.warn('Browser geolocation error:', err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
      activeWatchId = String(watchId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to start location tracking.' };
  }
}

/**
 * Stop operational staff duty location tracking
 */
export async function stopStaffTracking() {
  if (activeWatchId !== null) {
    if (Capacitor.isNativePlatform()) {
      await Geolocation.clearWatch({ id: activeWatchId });
    } else {
      navigator.geolocation.clearWatch(Number(activeWatchId));
    }
    activeWatchId = null;
  }

  currentTrackingState = {
    isTracking: false,
    assignedWard: null,
    lastPosition: null,
    isOutsideArea: false,
    distanceFromCenterMeters: null,
  };
  notifyListeners();
}

/**
 * Subscribe to staff tracking state changes
 */
export function subscribeStaffTracking(listener: (state: StaffTrackingState) => void): () => void {
  listeners.add(listener);
  listener({ ...currentTrackingState });
  return () => {
    listeners.delete(listener);
  };
}

export function getStaffTrackingState(): StaffTrackingState {
  return { ...currentTrackingState };
}
