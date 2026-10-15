import { useMemo, useState } from 'react';
import type { Ward } from '../../../../lib/wardTypes';
import type { ComplaintRecord, NearbyComplaint } from '../types';
import { haversineMeters } from '../utils/haversine';

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
    if (!w || w.center_latitude == null || w.center_longitude == null) {
      setNearby([]);
      setRadarMsg('Please select a ward with GPS center coordinates.');
      return;
    }
    const radius = w.radius_meters || 2000;

    const list = scopedComplaints
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => {
        const dist = haversineMeters(
          w.center_latitude!,
          w.center_longitude!,
          c.latitude!,
          c.longitude!
        );
        return {
          id: c.id,
          ticket_number: c.ticket_number,
          description: c.description,
          address: c.address,
          status: c.status,
          distance_meters: dist,
        };
      })
      .filter((c) => c.distance_meters <= radius)
      .sort((a, b) => a.distance_meters - b.distance_meters);

    setNearby(list);
    if (!list.length) {
      setRadarMsg(
        `No complaints found within ${radius} m of Ward ${w.ward_number} · ${w.name}.`
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
