import { useMemo, useState } from 'react';
import { getWardPolygons, type Ward } from '../../../../lib/wardTypes';
import type { ComplaintRecord, NearbyComplaint } from '../types';
import { haversineMeters } from '../utils/haversine';
import { isComplaintInWard } from '../utils/complaintWard';

export const useRadarScanner = (
  scopedComplaints: ComplaintRecord[],
  wards: Ward[]
) => {
  const [showRadar, setShowRadar] = useState(false);
  const [wardId, setWardId] = useState<string>('');
  const [nearby, setNearby] = useState<NearbyComplaint[]>([]);
  const [radarMsg, setRadarMsg] = useState<string | null>(null);

  const selectedWard = useMemo(
    () => wards.find((w) => w.id === wardId) || null,
    [wards, wardId]
  );

  const runRadar = () => {
    setRadarMsg(null);
    const w = selectedWard;
    if (!w) {
      setNearby([]);
      setRadarMsg('Please select a ward.');
      return;
    }

    const hasPolygon = getWardPolygons(w.boundary_coordinates).length > 0;
    if (!hasPolygon && (w.center_latitude == null || w.center_longitude == null)) {
      setNearby([]);
      setRadarMsg('Please select a ward with boundary polygon or GPS center coordinates.');
      return;
    }
    const radius = w.radius_meters || 2000;

    const list = scopedComplaints
      .filter((c) => {
        if (hasPolygon) return isComplaintInWard(c, w);
        return (
          c.latitude != null &&
          c.longitude != null &&
          haversineMeters(
            w.center_latitude!,
            w.center_longitude!,
            c.latitude,
            c.longitude
          ) <= radius
        );
      })
      .map((c) => {
        const dist =
          c.latitude != null &&
          c.longitude != null &&
          w.center_latitude != null &&
          w.center_longitude != null
            ? Math.round(
                haversineMeters(
                  w.center_latitude,
                  w.center_longitude,
                  c.latitude,
                  c.longitude
                )
              )
            : 0;
        return {
          id: c.id,
          ticket_number: c.ticket_number,
          description: c.description,
          address: c.address,
          status: c.status,
          distance_meters: dist,
        };
      })
      .sort((a, b) => a.distance_meters - b.distance_meters);

    setNearby(list);
    if (!list.length) {
      setRadarMsg(
        hasPolygon
          ? `No complaints found inside Ward ${w.ward_number} · ${w.name} boundary.`
          : `No complaints found within ${radius} m of Ward ${w.ward_number} · ${w.name}.`
      );
    }
  };

  return {
    showRadar, setShowRadar,
    wardId, setWardId,
    selectedWard,
    nearby,
    radarMsg,
    runRadar,
  };
};
