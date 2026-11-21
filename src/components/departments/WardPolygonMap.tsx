import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plus, Check, Layers, Compass, Trash2, Crosshair, RefreshCw, AlertTriangle
} from 'lucide-react';
import { calculateGeodesicArea, type Ward } from '../../lib/wardTypes';
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
}

const DEFAULT_CENTER: [number, number] = [21.904, 77.902]; // Betul Municipal Corporation coordinates

export const WardPolygonMap: React.FC<WardPolygonMapProps> = ({
  language = 'en',
  onWardSaved,
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
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch departments, staff, and registered wards
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wardsRes, deptRes, staffRes] = await Promise.all([
        supabase.from('wards').select('*').order('ward_number', { ascending: true }),
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
    mapInstanceRef.current = map;

    // Handle map click to add corner points when in drawing mode
    map.on('click', (e: L.LeafletMouseEvent) => {
      setCorners((prev) => {
        const next: [number, number][] = [...prev, [e.latlng.lat, e.latlng.lng]];
        return next;
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync existing wards onto the map as polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = existingWardsGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const deptColorMap: Record<string, string> = {
      default: '#146C94',
    };
    departments.forEach((d) => {
      if (d.color) deptColorMap[d.id] = d.color;
    });

    const bounds: [number, number][] = [];

    wards.forEach((w) => {
      const color = (w.assigned_department_id && deptColorMap[w.assigned_department_id]) || '#146C94';

      if (w.boundary_coordinates && Array.isArray(w.boundary_coordinates) && w.boundary_coordinates.length >= 3) {
        const poly = L.polygon(w.boundary_coordinates as L.LatLngExpression[], {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.25,
        });

        poly.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.5;">
            <b style="font-size: 14px; color: #146C94;">Ward ${w.ward_number}: ${w.name}</b><br/>
            ${w.name_hindi ? `<span style="color:#64748b;">${w.name_hindi}</span><br/>` : ''}
            <b>Area:</b> ${w.area_sq_meters ? (w.area_sq_meters / 10000).toFixed(2) + ' ha' : '—'}<br/>
            <b>Assigned Dept:</b> ${departments.find((d) => d.id === w.assigned_department_id)?.name || 'General Municipal'}<br/>
            ${w.pincode ? `<b>Pincode:</b> ${w.pincode}` : ''}
          </div>
        `);

        poly.on('click', () => {
          setSelectedWard(w);
        });

        group.addLayer(poly);
        w.boundary_coordinates.forEach((c) => bounds.push(c));
      } else if (w.center_latitude && w.center_longitude) {
        // Fallback for wards with only center point
        const circle = L.circle([w.center_latitude, w.center_longitude], {
          radius: w.radius_meters || 1500,
          color,
          fillColor: color,
          fillOpacity: 0.15,
        });
        circle.bindPopup(`<b>Ward ${w.ward_number}: ${w.name}</b>`);
        group.addLayer(circle);
        bounds.push([w.center_latitude, w.center_longitude]);
      }
    });

    if (bounds.length > 0 && !isDrawing) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [wards, departments, isDrawing]);

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

      const { error } = await supabase.from('wards').insert([payload]);
      if (error) throw error;

      setStatusMessage({
        type: 'success',
        text: `Ward ${payload.ward_number} (${payload.name}) saved successfully with ${corners.length} boundary points!`,
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

        {/* Admin Only Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {loading && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748b' }}>
              <RefreshCw size={13} />
              Loading...
            </span>
          )}
          {isAdmin ? (
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
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#475569' }}>
              <AlertTriangle size={14} color="#f59e0b" />
              <span>{isHindi ? 'वार्ड पंजीकरण केवल व्यवस्थापक के लिए है' : 'Ward Registration Admin Restricted'}</span>
            </div>
          )}
        </div>
      </div>

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b', padding: '0 4px' }}>
            <div>
              <b>{wards.length} Wards Plotted</b> · Click any polygon to inspect department & supervisor allocation.
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
              <span><b>Area:</b> {selectedWard.area_sq_meters ? `${(selectedWard.area_sq_meters / 10000).toFixed(2)} ha (${(selectedWard.area_sq_meters / 4046.856).toFixed(2)} acres)` : 'Estimated'}</span>
              <span><b>Boundary:</b> {selectedWard.boundary_coordinates?.length ? `${selectedWard.boundary_coordinates.length} GPS Polygon Corners` : 'Circle Radius'}</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedWard(null)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default WardPolygonMap;
