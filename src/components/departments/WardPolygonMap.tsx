import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plus, Check, Layers, Compass, Trash2, Crosshair, RefreshCw, AlertTriangle, Database, MapPin
} from 'lucide-react';
import {
  calculateGeodesicArea,
  countBoundaryCorners,
  findWardForPoint,
  getRingLabelPoint,
  getWardDisplayPoint,
  getWardPolygons,
  type Ward
} from '../../lib/wardTypes';
import {
  BETUL_DISTRICT_BOUNDARY,
  BETUL_WARDS_SEED,
  isSyntheticSeedWardId,
  mergeWithOfficialBetulWards,
} from '../../data/betulWardBoundaries';
import type { MapComplaintItem } from '../maps/InteractiveWardComplaintMap';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Fix Leaflet marker icons in bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Department {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

interface StaffUser {
  id: string;
  full_name: string | null;
  role: string | null;
  linked_department_id: string | null;
}

interface WardPolygonMapProps {
  language?: 'en' | 'hi';
  onWardSaved?: () => void;
  complaints?: MapComplaintItem[];
  onSelectComplaint?: (complaint: MapComplaintItem) => void;
  onViewWardTasks?: (wardId: string) => void;
}

function escapePopupHtml(val: string | null | undefined): string {
  if (!val) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const DEFAULT_CENTER: [number, number] = [21.909302, 77.901614]; // Betul Municipality coordinates

export const WardPolygonMap: React.FC<WardPolygonMapProps> = ({
  language = 'en',
  onWardSaved,
  complaints = [],
  onSelectComplaint,
  onViewWardTasks,
}) => {
  const isHindi = language === 'hi';
  const { user, profile } = useAuth();

  // Admin visibility check: Ward registration is strictly restricted to Admins
  const isAdmin = Boolean(
    profile?.is_admin ||
    ['admin', 'municipal_administrator', 'platform_owner'].includes(profile?.role || '')
  );

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentPolygonLayerRef = useRef<L.Polygon | null>(null);
  const currentPolylineLayerRef = useRef<L.Polyline | null>(null);
  const cornerMarkersRef = useRef<L.CircleMarker[]>([]);
  const userGpsMarkerRef = useRef<L.Marker | null>(null);
  const existingWardsGroupRef = useRef<L.FeatureGroup | null>(null);
  const complaintsLayerRef = useRef<L.LayerGroup | null>(null);
  const isDrawingRef = useRef(false);
  const onSelectComplaintRef = useRef(onSelectComplaint);
  useEffect(() => {
    onSelectComplaintRef.current = onSelectComplaint;
    isDrawingRef.current = isDrawing;
  });

  // Map state
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Boundary Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [corners, setCorners] = useState<[number, number][]>([]);
  const [isBoundaryFinished, setIsBoundaryFinished] = useState(false);
  const [computedAreaSqM, setComputedAreaSqM] = useState<number | null>(null);

  // GPS Tracking State
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  const [currentGps, setCurrentGps] = useState<[number, number] | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Selected Ward for Detail Preview
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  // Responsive state
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      mapInstanceRef.current?.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Invalidate map size on mode switch or mobile change
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isDrawing, isMobile]);

  // New Ward Form State
  const [wardForm, setWardForm] = useState({
    wardNumber: '',
    name: '',
    nameHindi: '',
    description: '',
    pincode: '',
    departmentId: '',
    supervisorId: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [syncingBetul, setSyncingBetul] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch departments, staff, and registered wards
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wardsRes, deptRes, staffRes] = await Promise.all([
        supabase.from('wards').select('*').eq('is_active', true).order('ward_number', { ascending: true }),
        supabase.from('departments').select('id, name, color, icon').eq('is_active', true),
        supabase.from('user_profiles').select('id, full_name, role, linked_department_id').neq('role', 'citizen'),
      ]);

      if (wardsRes.data) setWards(wardsRes.data as Ward[]);
      if (deptRes.data) setDepartments(deptRes.data as Department[]);
      if (staffRes.data) setStaff(staffRes.data as StaffUser[]);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const wardsGroup = L.featureGroup().addTo(map);
    existingWardsGroupRef.current = wardsGroup;
    complaintsLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Handle map click to add corner points ONLY when in drawing mode
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isDrawingRef.current) return;
      setCorners((prev) => {
        const next: [number, number][] = [...prev, [e.latlng.lat, e.latlng.lng]];
        return next;
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      existingWardsGroupRef.current = null;
      complaintsLayerRef.current = null;
    };
  }, []);

  // Sync existing wards (and official Betul boundary previews when <30 wards mapped) onto OpenStreetMap
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = existingWardsGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (BETUL_DISTRICT_BOUNDARY.length >= 3) {
      L.polygon(BETUL_DISTRICT_BOUNDARY as L.LatLngExpression[], {
        color: '#0f172a',
        weight: 2,
        dashArray: '6 5',
        fill: false,
        interactive: false,
      }).addTo(group);
    }

    const deptColorMap: Record<string, string> = {
      default: '#146C94',
    };
    departments.forEach((d) => {
      if (d.color) deptColorMap[d.id] = d.color;
    });

    const mappedDbCount = wards.filter(
      (w) => getWardPolygons(w.boundary_coordinates).length > 0
    ).length;
    const renderWards =
      mappedDbCount < 30 ? mergeWithOfficialBetulWards(wards, true) : wards;
    const noPolygonsRendered = renderWards.every(
      (rw) => getWardPolygons(rw.boundary_coordinates).length === 0
    );

    const bounds: [number, number][] = [];

    renderWards.forEach((w) => {
      if (w.is_active === false) return;
      const isSeedPreview = isSyntheticSeedWardId(w.id);
      const color = (w.assigned_department_id && deptColorMap[w.assigned_department_id]) || '#146C94';
      const rings = getWardPolygons(w.boundary_coordinates);

      if (rings.length > 0) {
        const leafletRings =
          rings.length > 1
            ? (rings.map((ring) => [ring]) as unknown as L.LatLngExpression[][][])
            : (rings[0] as L.LatLngExpression[]);
        const poly = L.polygon(leafletRings, {
          color,
          weight: isSeedPreview ? 1.5 : 2,
          dashArray: isSeedPreview ? '4 4' : undefined,
          fillColor: color,
          fillOpacity: isSeedPreview ? 0.12 : 0.24,
        });

        const displayPt = getWardDisplayPoint(w) ?? rings[0][0];
        const cLat = displayPt[0];
        const cLng = displayPt[1];
        const osmUrl = `https://www.openstreetmap.org/?mlat=${cLat}&mlon=${cLng}#map=16/${cLat}/${cLng}`;
        const cornersCount = countBoundaryCorners(w.boundary_coordinates);
        const areaSqM = w.area_sq_meters || 0;

        poly.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.5;">
            <b style="font-size: 14px; color: #146C94;">Ward ${w.ward_number}: ${escapePopupHtml(w.name)}</b>${isSeedPreview ? ' <span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:999px;font-weight:700;">Preview</span>' : ''}<br/>
            ${w.name_hindi ? `<span style="color:#64748b;">${escapePopupHtml(w.name_hindi)}</span><br/>` : ''}
            <b>Area:</b> ${areaSqM ? `${(areaSqM / 1_000_000).toFixed(2)} km² (${(areaSqM / 10000).toFixed(2)} ha · ${(areaSqM / 4046.856).toFixed(1)} acres)` : '—'}<br/>
            <b>Corners:</b> ${cornersCount}${rings.length > 1 ? ` (${rings.length} pieces)` : ''}<br/>
            <b>Assigned Dept:</b> ${escapePopupHtml(departments.find((d) => d.id === w.assigned_department_id)?.name) || 'General Municipal'}<br/>
            ${w.pincode ? `<b>Pincode:</b> ${escapePopupHtml(w.pincode)}<br/>` : ''}
            <a href="${osmUrl}" target="_blank" rel="noreferrer" style="color:#146C94;font-weight:700;text-decoration:none;">Open in OpenStreetMap ↗</a>
          </div>
        `);

        poly.on('click', () => {
          setSelectedWard(w);
        });

        group.addLayer(poly);
        rings.forEach((ring) => ring.forEach((c) => bounds.push(c)));

        rings.forEach((ring, ringIdx) => {
          const [labelLat, labelLng] = getRingLabelPoint(ring);
          const pillText =
            rings.length > 1
              ? `W${w.ward_number}·${ringIdx + 1}`
              : `W${w.ward_number}`;
          const pill = L.divIcon({
            className: 'ward-polygon-num-pill',
            html: `<div style="pointer-events:none;transform:translate(-50%,-50%);padding:1px 5px;border-radius:999px;background:rgba(255,255,255,0.9);border:1px solid #cbd5e1;font-size:10px;font-weight:800;color:#0f172a;white-space:nowrap;">${pillText}</div>`,
            iconSize: [0, 0],
          });
          L.marker([labelLat, labelLng], {
            icon: pill,
            interactive: false,
          }).addTo(group);
        });
      } else if (
        noPolygonsRendered &&
        w.center_latitude != null &&
        w.center_longitude != null &&
        w.area_sq_meters == null &&
        !isSyntheticSeedWardId(w.id)
      ) {
        // Fallback only when no polygons exist anywhere on the map (prevents legacy circles overlapping Betul wards)
        const circle = L.circle([w.center_latitude, w.center_longitude], {
          radius: w.radius_meters || 1500,
          color,
          fillColor: color,
          fillOpacity: 0.15,
        });
        circle.bindPopup(`<b>Ward ${w.ward_number}: ${escapePopupHtml(w.name)}</b>`);
        group.addLayer(circle);
        bounds.push([w.center_latitude, w.center_longitude]);
      }
    });

    if (bounds.length > 0 && !isDrawing) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [wards, departments, isDrawing]);

  // Plot complaint pins on OpenStreetMap when passed
  useEffect(() => {
    const layer = complaintsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!complaints || complaints.length === 0) return;

    const matchWards = mergeWithOfficialBetulWards(wards, true);

    complaints.forEach((c) => {
      if (
        c.latitude == null ||
        c.longitude == null ||
        !Number.isFinite(c.latitude) ||
        !Number.isFinite(c.longitude)
      ) {
        return;
      }

      const color =
        c.status === 'resolved' || c.status === 'verified'
          ? '#16a34a'
          : c.status === 'in_progress'
          ? '#2563eb'
          : '#dc2626';

      const marker = L.circleMarker([c.latitude, c.longitude], {
        radius: 6.5,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.92,
      });

      const foundWard =
        (c.ward_id && matchWards.find((w) => w.id === c.ward_id)) ||
        findWardForPoint(c.latitude, c.longitude, matchWards);
      const osmHref = `https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=17/${c.latitude}/${c.longitude}`;
      const gmapHref = `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`;

      const pop = document.createElement('div');
      pop.style.cssText = 'font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.45; min-width: 200px;';
      pop.innerHTML = `
        <div style="font-weight:800;color:#146C94;">#${escapePopupHtml(c.ticket_number || c.id.slice(0, 8))} · ${escapePopupHtml(c.status.toUpperCase())}</div>
        ${foundWard ? `<div style="font-size:11px;font-weight:700;color:#0f172a;">Ward ${foundWard.ward_number} · ${escapePopupHtml(foundWard.name)}</div>` : ''}
        <div style="margin:4px 0;color:#334155;">${escapePopupHtml(c.description.slice(0, 110))}${c.description.length > 110 ? '…' : ''}</div>
        <div class="poly-pop-actions" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
          <a href="${osmHref}" target="_blank" rel="noreferrer" style="color:#146C94;font-weight:700;text-decoration:none;">OSM ↗</a>
          <a href="${gmapHref}" target="_blank" rel="noreferrer" style="color:#15803d;font-weight:700;text-decoration:none;">Navigate ↗</a>
        </div>
      `;

      if (onSelectComplaintRef.current) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'View Details';
        btn.style.cssText = 'background:#146C94;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer;';
        btn.addEventListener('click', () => onSelectComplaintRef.current?.(c));
        pop.querySelector('.poly-pop-actions')?.appendChild(btn);
      }

      marker.bindPopup(pop);
      layer.addLayer(marker);
    });
  }, [complaints, wards]);

  // Update live drawing layer when corners change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous temporary drawing markers and lines
    cornerMarkersRef.current.forEach((m) => map.removeLayer(m));
    cornerMarkersRef.current = [];

    if (currentPolylineLayerRef.current) {
      map.removeLayer(currentPolylineLayerRef.current);
      currentPolylineLayerRef.current = null;
    }

    if (currentPolygonLayerRef.current) {
      map.removeLayer(currentPolygonLayerRef.current);
      currentPolygonLayerRef.current = null;
    }

    // Render corner circle markers
    corners.forEach((coord, i) => {
      const marker = L.circleMarker(coord, {
        radius: 6,
        color: '#ef4444',
        fillColor: '#ffffff',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);

      marker.bindTooltip(`Corner ${i + 1}`, { permanent: false });
      cornerMarkersRef.current.push(marker);
    });

    if (corners.length >= 2) {
      if (isBoundaryFinished && corners.length >= 3) {
        const poly = L.polygon(corners, {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.35,
          weight: 3,
        }).addTo(map);
        currentPolygonLayerRef.current = poly;
      } else {
        const line = L.polyline(corners, {
          color: '#ef4444',
          dashArray: '6, 6',
          weight: 2.5,
        }).addTo(map);
        currentPolylineLayerRef.current = line;
      }
    }
  }, [corners, isBoundaryFinished]);

  // Live GPS Tracking Handler
  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your device/browser.');
      return;
    }

    setIsGpsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords: [number, number] = [lat, lng];

        setCurrentGps(coords);
        setGpsAccuracy(pos.coords.accuracy || null);

        const map = mapInstanceRef.current;
        if (map) {
          if (!userGpsMarkerRef.current) {
            userGpsMarkerRef.current = L.marker(coords, {
              icon: L.divIcon({
                className: 'custom-gps-pin',
                html: `<div style="background:#3b82f6; width:14px; height:14px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 10px rgba(59,130,246,0.8);"></div>`,
              }),
            }).addTo(map);
          } else {
            userGpsMarkerRef.current.setLatLng(coords);
          }
          map.setView(coords, Math.max(map.getZoom(), 16));
        }
      },
      (err) => {
        alert('GPS Tracking error: ' + err.message);
        setIsGpsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000 }
    );
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsTracking(false);
  };

  const addCurrentGpsCorner = () => {
    if (!currentGps) {
      alert('Waiting for GPS position fix…');
      return;
    }
    setCorners((prev) => [...prev, currentGps]);
  };

  const finishBoundary = () => {
    if (corners.length < 3) {
      alert('At least 3 corners are required to create a closed ward boundary.');
      return;
    }

    const areaSqM = calculateGeodesicArea(corners);
    setComputedAreaSqM(areaSqM);
    setIsBoundaryFinished(true);

    const map = mapInstanceRef.current;
    if (map && corners.length >= 3) {
      const bounds = L.latLngBounds(corners);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const resetDrawing = () => {
    setCorners([]);
    setIsBoundaryFinished(false);
    setComputedAreaSqM(null);
  };

  const handleSaveWard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardForm.wardNumber || !wardForm.name.trim()) {
      setStatusMessage({ type: 'error', text: 'Ward number and name are required.' });
      return;
    }

    if (corners.length < 3) {
      setStatusMessage({ type: 'error', text: 'Please draw at least 3 boundary corners on the map.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      // Calculate center centroid
      const centerLat = corners.reduce((acc, c) => acc + c[0], 0) / corners.length;
      const centerLng = corners.reduce((acc, c) => acc + c[1], 0) / corners.length;
      const areaSqM = computedAreaSqM || calculateGeodesicArea(corners);

      const payload = {
        ward_number: parseInt(wardForm.wardNumber, 10),
        name: wardForm.name.trim(),
        name_hindi: wardForm.nameHindi.trim() || null,
        description: wardForm.description.trim() || null,
        pincode: wardForm.pincode.trim() || null,
        center_latitude: centerLat,
        center_longitude: centerLng,
        radius_meters: Math.round(Math.sqrt(areaSqM / Math.PI)) || 1500,
        boundary_coordinates: corners,
        area_sq_meters: areaSqM,
        assigned_department_id: wardForm.departmentId || null,
        assigned_supervisor_id: wardForm.supervisorId || null,
        is_active: true,
        created_by: user?.id || null,
      };

      const existingWard = wards.find(
        (item) => item.ward_number === payload.ward_number,
      );

      if (existingWard) {
        const { error } = await supabase
          .from('wards')
          .update({
            name: payload.name,
            name_hindi: payload.name_hindi,
            description: payload.description,
            pincode: payload.pincode,
            center_latitude: payload.center_latitude,
            center_longitude: payload.center_longitude,
            radius_meters: payload.radius_meters,
            boundary_coordinates: payload.boundary_coordinates,
            area_sq_meters: payload.area_sq_meters,
            assigned_department_id:
              payload.assigned_department_id ||
              existingWard.assigned_department_id ||
              null,
            assigned_supervisor_id:
              payload.assigned_supervisor_id ||
              existingWard.assigned_supervisor_id ||
              null,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWard.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('wards').insert([payload]);
        if (error) throw error;
      }

      setStatusMessage({
        type: 'success',
        text: `Ward ${payload.ward_number} (${payload.name}) ${existingWard ? 'updated' : 'saved'} successfully with ${corners.length} boundary points!`,
      });

      // Reset form
      setWardForm({
        wardNumber: '',
        name: '',
        nameHindi: '',
        description: '',
        pincode: '',
        departmentId: '',
        supervisorId: '',
      });
      resetDrawing();
      setIsDrawing(false);
      await loadData();
      if (onWardSaved) onWardSaved();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save ward.';
      setStatusMessage({ type: 'error', text: errMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const removeCorner = (index: number) => {
    setCorners((prev) => prev.filter((_, i) => i !== index));
    if (isBoundaryFinished) setIsBoundaryFinished(false);
  };

  const handleSyncBetulWards = async () => {
    if (!isAdmin) return;
    setSyncingBetul(true);
    setStatusMessage(null);
    setSyncProgress('Preparing Betul Municipality 33-ward dataset…');

    try {
      const { data: existingRows, error: fetchErr } = await supabase
        .from('wards')
        .select('id, ward_number, boundary_coordinates, area_sq_meters, is_active, created_at')
        .order('created_at', { ascending: true });
      if (fetchErr) throw fetchErr;

      type ExistingWardSyncRow = {
        id: string;
        ward_number: number;
        boundary_coordinates?: Ward['boundary_coordinates'];
        area_sq_meters?: number | null;
        is_active?: boolean;
        created_at?: string;
      };
      const grouped = new Map<number, ExistingWardSyncRow[]>();
      (existingRows || []).forEach((row: ExistingWardSyncRow) => {
        const list = grouped.get(row.ward_number) || [];
        list.push(row);
        grouped.set(row.ward_number, list);
      });

      const byNumber = new Map<number, ExistingWardSyncRow>();
      const idsToDeactivate: string[] = [];

      grouped.forEach((rowsForNum, wardNo) => {
        if (wardNo >= 1 && wardNo <= 33) {
          const sorted = [...rowsForNum].sort((a, b) => {
            const aPoly = getWardPolygons(a.boundary_coordinates).length > 0 ? 1 : 0;
            const bPoly = getWardPolygons(b.boundary_coordinates).length > 0 ? 1 : 0;
            if (bPoly !== aPoly) return bPoly - aPoly;
            const aAct = a.is_active !== false ? 1 : 0;
            const bAct = b.is_active !== false ? 1 : 0;
            return bAct - aAct;
          });
          byNumber.set(wardNo, sorted[0]);
          for (let k = 1; k < sorted.length; k++) {
            if (sorted[k].is_active !== false) {
              idsToDeactivate.push(sorted[k].id);
            }
          }
        } else {
          rowsForNum.forEach((row) => {
            const hasPoly = getWardPolygons(row.boundary_coordinates).length > 0;
            if (!hasPoly && row.is_active !== false) {
              idsToDeactivate.push(row.id);
            }
          });
        }
      });

      let deactivatedCount = 0;
      if (idsToDeactivate.length > 0) {
        setSyncProgress(`Deactivating ${idsToDeactivate.length} legacy/duplicate round-radius ward(s)…`);
        const { error: deactErr } = await supabase
          .from('wards')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .in('id', idsToDeactivate);
        if (deactErr) throw new Error(`Legacy cleanup: ${deactErr.message}`);
        deactivatedCount = idsToDeactivate.length;
      }

      let updatedCount = 0;
      let insertedCount = 0;

      for (let i = 0; i < BETUL_WARDS_SEED.length; i++) {
        const seed = BETUL_WARDS_SEED[i];
        setSyncProgress(`Syncing ${i + 1}/${BETUL_WARDS_SEED.length} wards…`);

        const existingRow = byNumber.get(seed.ward_number);
        if (existingRow) {
          const preserveCustomPoly =
            seed.boundary_coordinates == null &&
            getWardPolygons(existingRow.boundary_coordinates).length > 0;

          const updatePayload: Record<string, unknown> = {
            pincode: seed.pincode,
            name_hindi: seed.name_hindi,
            is_active: true,
            updated_at: new Date().toISOString(),
          };
          if (!preserveCustomPoly) {
            updatePayload.center_latitude = seed.center_latitude;
            updatePayload.center_longitude = seed.center_longitude;
            updatePayload.radius_meters = seed.radius_meters;
            updatePayload.boundary_coordinates = seed.boundary_coordinates;
            updatePayload.area_sq_meters = seed.area_sq_meters;
          }

          const { error: updErr } = await supabase
            .from('wards')
            .update(updatePayload)
            .eq('id', existingRow.id);
          if (updErr) throw new Error(`Ward ${seed.ward_number}: ${updErr.message}`);
          updatedCount += 1;
        } else {
          const { error: insErr } = await supabase.from('wards').insert([
            {
              ward_number: seed.ward_number,
              name: seed.name,
              name_hindi: seed.name_hindi,
              description: seed.description,
              center_latitude: seed.center_latitude,
              center_longitude: seed.center_longitude,
              radius_meters: seed.radius_meters,
              pincode: seed.pincode,
              boundary_coordinates: seed.boundary_coordinates,
              area_sq_meters: seed.area_sq_meters,
              is_active: true,
              created_by: user?.id || null,
            },
          ]);
          if (insErr) throw new Error(`Ward ${seed.ward_number}: ${insErr.message}`);
          insertedCount += 1;
        }
      }

      setStatusMessage({
        type: 'success',
        text: `Synced 33 official Betul wards (30 polygons + 3 pending survey) to Supabase! (${insertedCount} inserted, ${updatedCount} updated${
          deactivatedCount > 0 ? `, ${deactivatedCount} legacy/duplicate round-radius ward(s) deactivated` : ''
        })`,
      });
      await loadData();
      if (onWardSaved) onWardSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync Betul wards.';
      setStatusMessage({
        type: 'error',
        text: `${msg} (If schema or RLS blocks writes, run supabase/migrations/20261125_betul_ward_boundaries.sql in Supabase SQL Editor.)`,
      });
    } finally {
      setSyncProgress(null);
      setSyncingBetul(false);
    }
  };

  const mappedPolygonCount = wards.filter(
    (w) => getWardPolygons(w.boundary_coordinates).length > 0
  ).length;
  const legacyRoundRadiusWards = (() => {
    const mappedBetulWardNums = new Set(
      BETUL_WARDS_SEED.filter((s) => s.boundary_coordinates !== null).map(
        (s) => s.ward_number
      )
    );
    const seenNumbers = new Map<number, number>();
    wards.forEach((w) => {
      if (w.is_active !== false) {
        seenNumbers.set(w.ward_number, (seenNumbers.get(w.ward_number) || 0) + 1);
      }
    });
    return wards.filter((w) => {
      if (w.is_active === false) return false;
      const hasPoly = getWardPolygons(w.boundary_coordinates).length > 0;
      if (hasPoly) return false;
      const isOutsideBetul = w.ward_number < 1 || w.ward_number > 33;
      const isDuplicate = (seenNumbers.get(w.ward_number) || 0) > 1;
      const isMappedBetulAsRadius = mappedBetulWardNums.has(w.ward_number);
      return isOutsideBetul || isDuplicate || isMappedBetulAsRadius;
    });
  })();
  const effectiveAllWards = mergeWithOfficialBetulWards(wards, true);
  const pendingBoundaryWards = effectiveAllWards.filter(
    (w) => getWardPolygons(w.boundary_coordinates).length === 0
  );
  const visibleMappedCount = effectiveAllWards.length - pendingBoundaryWards.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'system-ui, sans-serif' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--theme-primary, #146C94)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={22} />
            {isHindi ? 'नगर पालिका वार्ड और क्षेत्र मानचित्रण' : 'Municipal Ward & Area Boundary Mapping'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isHindi
              ? 'ओपनस्ट्रीटमैप पर वार्ड सीमा बनाएं, क्षेत्रफल की गणना करें और विभाग प्रमुखों को आवंटित करें।'
              : 'Interactive OpenStreetMap polygon mapping with geodesic area calculation, department allocation & geofencing.'}
          </p>
        </div>

        {/* Admin Only Toggle & Betul Sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {loading && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748b' }}>
              <RefreshCw size={13} />
              Loading...
            </span>
          )}
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={handleSyncBetulWards}
                disabled={syncingBetul}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 14px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: syncingBetul ? 'wait' : 'pointer',
                  opacity: syncingBetul ? 0.7 : 1,
                  boxShadow: '0 2px 8px rgba(5,150,105,0.2)',
                }}
              >
                <Database size={15} />
                {syncingBetul
                  ? (syncProgress || 'Syncing…')
                  : (isHindi ? '33 बैतूल वार्ड सिंक करें' : 'Sync 33 Betul Wards to Supabase')}
              </button>
              <button
                onClick={() => {
                  setIsDrawing(!isDrawing);
                  if (isDrawing) resetDrawing();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isDrawing ? '#ef4444' : '#146C94',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {isDrawing ? <Trash2 size={16} /> : <Plus size={16} />}
                {isDrawing
                  ? (isHindi ? 'मानचित्रण रद्द करें' : 'Exit Drawing Mode')
                  : (isHindi ? '➕ नया वार्ड सीमा बनाएं' : '➕ Map New Ward Area')}
              </button>
            </>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#475569' }}>
              <AlertTriangle size={14} color="#f59e0b" />
              <span>{isHindi ? 'वार्ड पंजीकरण केवल व्यवस्थापक के लिए है' : 'Ward Registration Admin Restricted'}</span>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (mappedPolygonCount < 30 || legacyRoundRadiusWards.length > 0) && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <span>
            <b>Official Betul Borders Preview Active:</b> {mappedPolygonCount}/30 ward polygons are currently stored in Supabase.
            {legacyRoundRadiusWards.length > 0 && (
              <>
                {' '}Detected <b>{legacyRoundRadiusWards.length}</b> legacy round-radius ward row(s) (
                {legacyRoundRadiusWards.map((w) => `W${w.ward_number}`).join(', ')}). Clicking{' '}
                <b>Sync 33 Betul Wards to Supabase</b> will replace them with exact Betul polygons &amp; deactivate any extra/duplicate circle-only rows.
              </>
            )}
            {legacyRoundRadiusWards.length === 0 && (
              <>
                {' '}Click <b>Sync 33 Betul Wards to Supabase</b> to persist all official Betul borders &amp; auto-routing data.
              </>
            )}
          </span>
          <button
            type="button"
            onClick={handleSyncBetulWards}
            disabled={syncingBetul}
            style={{
              background: '#146C94',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: syncingBetul ? 'wait' : 'pointer',
            }}
          >
            {syncingBetul ? (syncProgress || 'Syncing…') : 'Sync Now'}
          </button>
        </div>
      )}

      {pendingBoundaryWards.length > 0 && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#92400e',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <span>
            <b>
              {isHindi
                ? `सीमा सर्वेक्षण लंबित (${pendingBoundaryWards.length}):`
                : `Pending Boundary Survey (${pendingBoundaryWards.length}):`}
            </b>{' '}
            {pendingBoundaryWards.map((w) => `Ward ${w.ward_number}`).join(', ')}
            {isHindi
              ? ' — स्रोत डेटासेट में इनके पॉलीगॉन शामिल नहीं हैं।'
              : ' — polygon coordinates are not yet in the exported dataset.'}
          </span>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {pendingBoundaryWards.map((w) => (
                <button
                  key={w.ward_number}
                  type="button"
                  onClick={() => {
                    setIsDrawing(true);
                    resetDrawing();
                    setWardForm((prev) => ({
                      ...prev,
                      wardNumber: String(w.ward_number),
                      name: w.name || `Ward ${String(w.ward_number).padStart(2, '0')}`,
                      nameHindi: w.name_hindi || `वार्ड ${String(w.ward_number).padStart(2, '0')}`,
                      pincode: w.pincode || '460001',
                    }));
                  }}
                  style={{
                    background: '#d97706',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Draw W{w.ward_number}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {statusMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: statusMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: statusMessage.type === 'success' ? '#166534' : '#991b1b',
          fontWeight: 700,
          fontSize: '0.84rem',
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Main Grid: Map + Side Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isDrawing ? '1fr 380px' : '1fr'), gap: 16 }}>
        {/* Map Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isDrawing && (
            <div style={{
              background: '#0f172a',
              color: '#fff',
              padding: isMobile ? '8px 10px' : '10px 14px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: '0.82rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: isMobile ? '100%' : 'auto' }}>
                <span style={{ background: '#38bdf8', color: '#0f172a', padding: '3px 8px', borderRadius: 6, fontWeight: 900, fontSize: '0.74rem' }}>
                  STEP 1
                </span>
                <span style={{ fontSize: isMobile ? '0.75rem' : '0.82rem' }}>
                  {isHindi ? 'मानचित्र पर क्लिक करें या GPS से कोने जोड़ें।' : 'Click map or use GPS to add corners.'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                {!isGpsTracking ? (
                  <button
                    onClick={startGpsTracking}
                    style={{
                      background: '#3b82f6', color: '#fff', border: 'none', padding: '7px 12px',
                      borderRadius: 6, cursor: 'pointer', fontWeight: 700, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: 6,
                      flex: isMobile ? '1 1 calc(50% - 6px)' : 'none', fontSize: '0.78rem'
                    }}
                  >
                    <Compass size={14} /> Start GPS
                  </button>
                ) : (
                  <>
                    <button
                      onClick={addCurrentGpsCorner}
                      style={{
                        background: '#10b981', color: '#fff', border: 'none', padding: '7px 12px',
                        borderRadius: 6, cursor: 'pointer', fontWeight: 700, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: 6,
                        flex: isMobile ? '1 1 calc(50% - 6px)' : 'none', fontSize: '0.78rem'
                      }}
                    >
                      <Crosshair size={14} /> Add GPS Corner
                    </button>
                    <button
                      onClick={stopGpsTracking}
                      style={{
                        background: '#64748b', color: '#fff', border: 'none', padding: '7px 12px',
                        borderRadius: 6, cursor: 'pointer', fontWeight: 700,
                        flex: isMobile ? '1 1 calc(50% - 6px)' : 'none', fontSize: '0.78rem'
                      }}
                    >
                      Stop GPS
                    </button>
                  </>
                )}
                <button
                  onClick={finishBoundary}
                  disabled={corners.length < 3}
                  style={{
                    background: corners.length >= 3 ? '#10b981' : '#475569', color: '#fff', border: 'none',
                    padding: '7px 12px', borderRadius: 6, cursor: corners.length >= 3 ? 'pointer' : 'not-allowed',
                    fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    flex: isMobile ? '1 1 calc(50% - 6px)' : 'none', fontSize: '0.78rem'
                  }}
                >
                  <Check size={14} /> Finish Boundary
                </button>
                <button
                  onClick={resetDrawing}
                  style={{
                    background: '#ef4444', color: '#fff', border: 'none', padding: '7px 10px',
                    borderRadius: 6, cursor: 'pointer', fontWeight: 700,
                    flex: isMobile ? '1 1 calc(50% - 6px)' : 'none', fontSize: '0.78rem'
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Leaflet DOM Node */}
          <div
            ref={mapContainerRef}
            style={{
              height: isMobile ? (isDrawing ? 320 : 380) : (isDrawing ? 480 : 540),
              width: '100%',
              borderRadius: 14,
              border: '1.5px solid #cbd5e1',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              zIndex: 1,
            }}
          />

          {/* Map Footer Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b', padding: '0 4px', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <b>
                {visibleMappedCount}/{effectiveAllWards.length} Betul polygons shown ({mappedPolygonCount} saved in DB)
              </b>
              {pendingBoundaryWards.length > 0
                ? ` · Pending survey: ${pendingBoundaryWards.map((w) => `W${w.ward_number}`).join(', ')}`
                : ''}
              {complaints.length > 0 ? ` · ${complaints.filter((c) => c.latitude != null && c.longitude != null).length} Geo-tagged Complaints` : ''} · Click any polygon to inspect department & area details.
            </div>
            {currentGps && (
              <div>
                GPS: {currentGps[0].toFixed(5)}, {currentGps[1].toFixed(5)} ({gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : 'locked'})
              </div>
            )}
          </div>
        </div>

        {/* Admin Registration & Boundary Detail Form (Admin Only) */}
        {isDrawing && isAdmin && (
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            border: '1.5px solid #cbd5e1',
            padding: isMobile ? '14px 12px' : 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: isMobile ? 'none' : 560,
            overflowY: isMobile ? 'visible' : 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#146C94' }}>STEP 2</span>
              <h3 style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                Ward Details & Allocation
              </h3>
            </div>

            {/* Calculated Land Area Display */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                CALCULATED WARD AREA:
              </div>
              {computedAreaSqM ? (
                <div style={{ fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.6 }}>
                  <div><b>{computedAreaSqM.toLocaleString(undefined, { maximumFractionDigits: 1 })}</b> sq. meters (m²)</div>
                  <div><b>{(computedAreaSqM / 10000).toFixed(3)}</b> Hectares (ha)</div>
                  <div><b>{(computedAreaSqM / 4046.856).toFixed(3)}</b> Acres</div>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {corners.length < 3
                    ? `Click at least 3 points on map (${corners.length}/3 corners placed)`
                    : 'Tap "Finish Boundary" to calculate area.'}
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveWard} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>Ward # *</label>
                  <input
                    required
                    type="number"
                    placeholder="e.g. 14"
                    value={wardForm.wardNumber}
                    onChange={(e) => setWardForm({ ...wardForm, wardNumber: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>Ward Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Shivaji Ward"
                    value={wardForm.name}
                    onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>Name (Hindi)</label>
                <input
                  type="text"
                  placeholder="e.g. शिवाजी वार्ड"
                  value={wardForm.nameHindi}
                  onChange={(e) => setWardForm({ ...wardForm, nameHindi: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              {/* Department Allocation */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>Allocated Department</label>
                <select
                  value={wardForm.departmentId}
                  onChange={(e) => setWardForm({ ...wardForm, departmentId: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="">General Municipal Area</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Assigned Supervisor */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>Assigned Ward Supervisor</label>
                <select
                  value={wardForm.supervisorId}
                  onChange={(e) => setWardForm({ ...wardForm, supervisorId: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="">None (Auto-allocate later)</option>
                  {staff
                    .filter((s) => ['supervisor', 'area_officer', 'department_head'].includes(s.role || ''))
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name || s.id} ({s.role})</option>
                    ))}
                </select>
              </div>

              {/* Pincode & Description */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>Pincode</label>
                  <input
                    type="text"
                    placeholder="460001"
                    value={wardForm.pincode}
                    onChange={(e) => setWardForm({ ...wardForm, pincode: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>Sector Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Major market area"
                    value={wardForm.description}
                    onChange={(e) => setWardForm({ ...wardForm, description: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Boundary Corner List */}
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  BOUNDARY CORNERS ({corners.length}):
                </div>
                <div style={{ maxHeight: 90, overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px' }}>
                  {corners.length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: 4 }}>No corners added yet</div>
                  ) : (
                    corners.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', padding: '2px 0' }}>
                        <span>P{idx + 1}: {c[0].toFixed(5)}, {c[1].toFixed(5)}</span>
                        <button
                          type="button"
                          onClick={() => removeCorner(idx)}
                          style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving || corners.length < 3}
                style={{
                  marginTop: 6,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #146C94, #0E526F)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: isSaving || corners.length < 3 ? 'not-allowed' : 'pointer',
                  opacity: isSaving || corners.length < 3 ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {isSaving ? 'Saving Boundary…' : 'Save Ward & Boundary Polygon'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Selected Ward Details Drawer */}
      {selectedWard && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#146C94', textTransform: 'uppercase' }}>
              SELECTED WARD SECTOR
            </span>
            <h3 style={{ margin: '2px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Ward {selectedWard.ward_number}: {selectedWard.name} {selectedWard.name_hindi && `(${selectedWard.name_hindi})`}
            </h3>
            <div style={{ display: 'flex', gap: 14, fontSize: '0.8rem', color: '#64748b', marginTop: 4, flexWrap: 'wrap' }}>
              <span><b>Department:</b> {departments.find((d) => d.id === selectedWard.assigned_department_id)?.name || 'General Municipal'}</span>
              <span><b>Area:</b> {selectedWard.area_sq_meters ? `${(selectedWard.area_sq_meters / 1_000_000).toFixed(2)} km² · ${(selectedWard.area_sq_meters / 10000).toFixed(2)} ha (${(selectedWard.area_sq_meters / 4046.856).toFixed(2)} acres)` : 'Estimated'}</span>
              <span><b>Boundary:</b> {countBoundaryCorners(selectedWard.boundary_coordinates) > 0 ? `${countBoundaryCorners(selectedWard.boundary_coordinates)} GPS Polygon Corners${getWardPolygons(selectedWard.boundary_coordinates).length > 1 ? ` (${getWardPolygons(selectedWard.boundary_coordinates).length} pieces)` : ''}` : 'Circle Radius'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {(() => {
              const pt = getWardDisplayPoint(selectedWard);
              if (!pt) return null;
              return (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${pt[0]}&mlon=${pt[1]}#map=16/${pt[0]}/${pt[1]}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#146C94', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}
                >
                  OpenStreetMap ↗
                </a>
              );
            })()}
            {onViewWardTasks && !isSyntheticSeedWardId(selectedWard.id) && (
              <button
                type="button"
                onClick={() => onViewWardTasks(selectedWard.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#146C94', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <MapPin size={13} /> View Ward Complaints
              </button>
            )}
            <button
              onClick={() => setSelectedWard(null)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardPolygonMap;
