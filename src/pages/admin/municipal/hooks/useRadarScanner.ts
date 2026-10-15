import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { ComplaintRecord, NearbyComplaint } from '../types';

export const useRadarScanner = (scopedComplaints: ComplaintRecord[]) => {
  const [showRadar, setShowRadar] = useState(false);
  const [lat, setLat] = useState(21.9015);
  const [lon, setLon] = useState(77.9018);
  const [radius, setRadius] = useState(5000);
  const [radarLoading, setRadarLoading] = useState(false);
  const [nearby, setNearby] = useState<NearbyComplaint[]>([]);
  const [radarMsg, setRadarMsg] = useState<string | null>(null);

  const runRadar = async () => {
    setRadarLoading(true);
    setRadarMsg(null);
    try {
      const { data, error } = await supabase.rpc('nearby_complaints', {
        user_lat: lat,
        user_lon: lon,
        radius_meters: radius,
      });
      if (!error) {
        setNearby(data || []);
        if (!data?.length) setRadarMsg('No complaints found in this radius.');
        return;
      }

      const R = 6371e3;
      const rad = (d: number) => (d * Math.PI) / 180;
      const list = scopedComplaints
        .filter((c) => c.latitude && c.longitude)
        .map((c) => {
          const a =
            Math.sin(rad(c.latitude! - lat) / 2) ** 2 +
            Math.cos(rad(lat)) *
              Math.cos(rad(c.latitude!)) *
              Math.sin(rad(c.longitude! - lon) / 2) ** 2;
          const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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
      if (!list.length)
        setRadarMsg(`No complaints within ${Math.round(radius / 1000)} km.`);
    } catch (e: any) {
      setRadarMsg(e.message || 'Radar scan failed.');
    } finally {
      setRadarLoading(false);
    }
  };

  return {
    showRadar, setShowRadar,
    lat, setLat,
    lon, setLon,
    radius, setRadius,
    radarLoading,
    nearby,
    radarMsg,
    runRadar,
  };
};
