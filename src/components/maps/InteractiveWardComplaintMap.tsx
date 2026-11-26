import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass,
  Crosshair,
  Layers,
  MapPin,
  RotateCcw,
  Tag,
} from 'lucide-react';
import {
  countBoundaryCorners,
  findWardForPoint,
  getRingLabelPoint,
  getWardDisplayPoint,
  getWardPolygons,
  type LatLngTuple,
  type Ward,
} from '../../lib/wardTypes';
import {
  BETUL_DISTRICT_BOUNDARY,
  BETUL_MUNICIPALITY_META,
  mergeWithOfficialBetulWards,
} from '../../data/betulWardBoundaries';

export interface MapComplaintItem {
  id: string;
  ticket_number?: string;
  description: string;
  status: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ward_id?: string | null;
  department_name?: string | null;
  citizen_name?: string | null;
  created_at?: string | null;
  assigned_to_name?: string | null;
}

interface InteractiveWardComplaintMapProps {
  wards: Ward[];
  complaints?: MapComplaintItem[];
  selectedWardId?: string | null;
  highlightedWardId?: string | null;
  focusPoint?: { lat: number; lng: number; label?: string } | null;
  height?: number;
  language?: 'en' | 'hi';
  showDistrictBorder?: boolean;
  showWardLabels?: boolean;
  showLegend?: boolean;
  showComplaintPins?: boolean;
  includeOfficialSeedWards?: boolean;
  onSelectWard?: (ward: Ward) => void;
  onSelectComplaint?: (complaint: MapComplaintItem) => void;
  onAllotComplaint?: (complaint: MapComplaintItem) => void;
  onReportInWard?: (ward: Ward) => void;
}

function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function complaintStatusColor(status: string): string {
  switch (status) {
    case 'resolved':
    case 'verified':
      return '#16a34a';
    case 'in_progress':
      return '#2563eb';
    case 'rejected':
      return '#64748b';
    case 'pending':
    default:
      return '#dc2626';
  }
}

export const InteractiveWardComplaintMap: React.FC<InteractiveWardComplaintMapProps> = ({
  wards,
  complaints = [],
  selectedWardId = null,
  highlightedWardId = null,
  focusPoint = null,
  height = 380,
  language = 'en',
  showDistrictBorder: initialDistrictBorder = true,
  showWardLabels: initialWardLabels = true,
  showLegend = true,
  showComplaintPins: initialComplaintPins = true,
  includeOfficialSeedWards = true,
  onSelectWard,
  onSelectComplaint,
  onAllotComplaint,
  onReportInWard,
}) => {
  const hi = language === 'hi';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const districtLayerRef = useRef<L.LayerGroup | null>(null);
  const wardsLayerRef = useRef<L.FeatureGroup | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const complaintsLayerRef = useRef<L.LayerGroup | null>(null);
  const focusLayerRef = useRef<L.LayerGroup | null>(null);
  const gpsLayerRef = useRef<L.LayerGroup | null>(null);

  const [showBorder, setShowBorder] = useState(initialDistrictBorder);
  const [showLabels, setShowLabels] = useState(initialWardLabels);
  const [showPins, setShowPins] = useState(initialComplaintPins);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const lastFitSignatureRef = useRef<string>('');

  // Keep latest callbacks in refs so Leaflet event listeners never go stale
  const callbacksRef = useRef({
    onSelectWard,
    onSelectComplaint,
    onAllotComplaint,
    onReportInWard,
  });
  useEffect(() => {
    callbacksRef.current = {
      onSelectWard,
      onSelectComplaint,
      onAllotComplaint,
      onReportInWard,
    };
  });

  const effectiveWards = useMemo(
    () => mergeWithOfficialBetulWards(wards, includeOfficialSeedWards),
    [wards, includeOfficialSeedWards],
  );

  const wardCoverageSummary = useMemo(() => {
    const mappedCount = effectiveWards.filter(
      (w) => getWardPolygons(w.boundary_coordinates).length > 0,
    ).length;
    const missingNums = effectiveWards
      .filter((w) => getWardPolygons(w.boundary_coordinates).length === 0)
      .map((w) => w.ward_number);
    return {
      mappedCount,
      totalCount: effectiveWards.length,
      missingNums,
    };
  }, [effectiveWards]);

  const validComplaints = useMemo(
    () =>
      complaints.filter(
        (c) =>
          c.latitude != null &&
          c.longitude != null &&
          Number.isFinite(c.latitude) &&
          Number.isFinite(c.longitude),
      ),
    [complaints],
  );

  // Initialize Leaflet map once + handle container resizes cleanly
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [
        BETUL_MUNICIPALITY_META.center[0],
        BETUL_MUNICIPALITY_META.center[1],
      ],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    districtLayerRef.current = L.layerGroup().addTo(map);
    wardsLayerRef.current = L.featureGroup().addTo(map);
    labelsLayerRef.current = L.layerGroup().addTo(map);
    complaintsLayerRef.current = L.layerGroup().addTo(map);
    focusLayerRef.current = L.layerGroup().addTo(map);
    gpsLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const timer = window.setTimeout(() => map.invalidateSize(), 150);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        map.invalidateSize();
      });
      ro.observe(el);
    }

    return () => {
      window.clearTimeout(timer);
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      districtLayerRef.current = null;
      wardsLayerRef.current = null;
      labelsLayerRef.current = null;
      complaintsLayerRef.current = null;
      focusLayerRef.current = null;
      gpsLayerRef.current = null;
    };
  }, []);

  // Sync Betul municipality outer perimeter
  useEffect(() => {
    const layer = districtLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showBorder || BETUL_DISTRICT_BOUNDARY.length < 3) return;

    L.polygon(BETUL_DISTRICT_BOUNDARY as L.LatLngExpression[], {
      color: '#0f172a',
      weight: 2,
      dashArray: '6 5',
      fill: false,
      interactive: false,
    }).addTo(layer);
  }, [showBorder]);

  // Sync ward polygons, labels, and ward stats popups
  useEffect(() => {
    const map = mapRef.current;
    const wardsGroup = wardsLayerRef.current;
    const labelsGroup = labelsLayerRef.current;
    if (!map || !wardsGroup || !labelsGroup) return;

    wardsGroup.clearLayers();
    labelsGroup.clearLayers();

    const statsByWardId = new Map<
      string,
      { total: number; pending: number; inProgress: number; resolved: number }
    >();
    effectiveWards.forEach((w) => {
      statsByWardId.set(w.id, { total: 0, pending: 0, inProgress: 0, resolved: 0 });
    });

    for (const c of complaints) {
      let targetWard: Ward | undefined;
      if (c.ward_id) {
        targetWard = effectiveWards.find((w) => w.id === c.ward_id);
      }
      if (!targetWard && c.latitude != null && c.longitude != null) {
        targetWard = findWardForPoint(c.latitude, c.longitude, effectiveWards) || undefined;
      }
      if (!targetWard) continue;
      const bucket = statsByWardId.get(targetWard.id);
      if (!bucket) continue;
      bucket.total += 1;
      if (c.status === 'resolved' || c.status === 'verified') bucket.resolved += 1;
      else if (c.status === 'in_progress') bucket.inProgress += 1;
      else bucket.pending += 1;
    }

    const focusCoords: LatLngTuple[] = [];
    const allBoundsCoords: LatLngTuple[] = [];

    effectiveWards.forEach((w) => {
      const rings = getWardPolygons(w.boundary_coordinates);
      if (rings.length === 0) return;

      const isSelected = Boolean(selectedWardId && w.id === selectedWardId);
      const isHighlighted = Boolean(highlightedWardId && w.id === highlightedWardId);
      const bucket = statsByWardId.get(w.id) || {
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
      };

      let strokeColor = '#146C94';
      let fillColor = '#146C94';
      let fillOpacity = 0.14;
      let weight = 1.6;

      if (isSelected) {
        strokeColor = '#146C94';
        fillColor = '#146C94';
        fillOpacity = 0.34;
        weight = 3;
      } else if (isHighlighted) {
        strokeColor = '#059669';
        fillColor = '#059669';
        fillOpacity = 0.28;
        weight = 3;
      } else if (complaints.length > 0) {
        if (bucket.total === 0) {
          strokeColor = '#64748b';
          fillColor = '#64748b';
          fillOpacity = 0.1;
        } else if (bucket.total <= 3) {
          strokeColor = '#0284c7';
          fillColor = '#0284c7';
          fillOpacity = 0.18;
        } else {
          strokeColor = bucket.pending > 0 ? '#dc2626' : '#d97706';
          fillColor = bucket.pending > 0 ? '#dc2626' : '#d97706';
          fillOpacity = 0.24;
        }
      }

      const leafletRings =
        rings.length > 1
          ? (rings.map((ring) => [ring]) as unknown as L.LatLngExpression[][][])
          : (rings[0] as L.LatLngExpression[]);
      const poly = L.polygon(leafletRings, {
        color: strokeColor,
        weight,
        fillColor,
        fillOpacity,
      });

      const areaSqM = w.area_sq_meters || 0;
      const areaHa = (areaSqM / 10000).toFixed(2);
      const areaAcres = (areaSqM / 4046.856).toFixed(1);
      const areaKm2 = (areaSqM / 1_000_000).toFixed(2);
      const cornersCount = countBoundaryCorners(w.boundary_coordinates);
      const displayPt = getWardDisplayPoint(w) ?? rings[0][0];
      const cLat = displayPt[0];
      const cLng = displayPt[1];
      const osmHref = `https://www.openstreetmap.org/?mlat=${cLat}&mlon=${cLng}#map=16/${cLat}/${cLng}`;

      const popupEl = document.createElement('div');
      popupEl.style.cssText =
        'font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.45; min-width: 210px;';
      popupEl.innerHTML = `
        <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
          Ward ${escapeHtml(String(w.ward_number).padStart(2, '0'))} · ${escapeHtml(w.name)}
        </div>
        ${w.name_hindi ? `<div style="color: #475569; font-size: 11px; margin-bottom: 4px;">${escapeHtml(w.name_hindi)}</div>` : ''}
        <div style="color: #334155; font-size: 11px; margin-bottom: 6px;">
          <b>${hi ? 'क्षेत्रफल:' : 'Area:'}</b> ${areaSqM > 0 ? `${areaKm2} km² (${areaHa} ha · ${areaAcres} acres)` : '—'}<br/>
          <b>${hi ? 'सीमा बिंदु:' : 'Corners:'}</b> ${cornersCount}${rings.length > 1 ? ` (${rings.length} zones)` : ''}
        </div>
        ${
          complaints.length > 0
            ? `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px; margin-bottom: 8px; text-align: center;">
                <div><div style="font-weight: 800; color: #0f172a;">${bucket.total}</div><div style="font-size: 9px; color: #64748b;">Total</div></div>
                <div><div style="font-weight: 800; color: #dc2626;">${bucket.pending}</div><div style="font-size: 9px; color: #64748b;">Pend</div></div>
                <div><div style="font-weight: 800; color: #2563eb;">${bucket.inProgress}</div><div style="font-size: 9px; color: #64748b;">Prog</div></div>
                <div><div style="font-weight: 800; color: #16a34a;">${bucket.resolved}</div><div style="font-size: 9px; color: #64748b;">Done</div></div>
              </div>`
            : ''
        }
        <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
          <a href="${osmHref}" target="_blank" rel="noreferrer"
             style="font-size: 11px; font-weight: 700; color: #146C94; text-decoration: none; padding: 4px 8px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 5px;">
             OpenStreetMap ↗
          </a>
        </div>
      `;

      if (callbacksRef.current.onReportInWard) {
        const btnWrap = popupEl.lastElementChild;
        if (btnWrap) {
          const reportBtn = document.createElement('button');
          reportBtn.type = 'button';
          reportBtn.textContent = hi
            ? `वार्ड ${w.ward_number} में शिकायत`
            : `Report in Ward ${w.ward_number}`;
          reportBtn.style.cssText =
            'font-size: 11px; font-weight: 700; color: #fff; background: #146C94; border: none; border-radius: 5px; padding: 4px 9px; cursor: pointer;';
          reportBtn.addEventListener('click', () => {
            callbacksRef.current.onReportInWard?.(w);
          });
          btnWrap.appendChild(reportBtn);
        }
      }

      poly.bindPopup(popupEl);

      poly.on('mouseover', () => {
        poly.setStyle({
          weight: Math.max(weight, 2.5),
          fillOpacity: Math.min(0.42, fillOpacity + 0.14),
        });
      });
      poly.on('mouseout', () => {
        poly.setStyle({ weight, fillOpacity });
      });
      poly.on('click', () => {
        callbacksRef.current.onSelectWard?.(w);
      });

      wardsGroup.addLayer(poly);

      rings.forEach((ring) => {
        ring.forEach((pt) => {
          allBoundsCoords.push(pt);
          if (isSelected || isHighlighted) focusCoords.push(pt);
        });
      });

      if (showLabels) {
        rings.forEach((ring, ringIdx) => {
          const [labelLat, labelLng] = getRingLabelPoint(ring);
          const pillText =
            rings.length > 1
              ? `W${w.ward_number}·${ringIdx + 1}`
              : `W${w.ward_number}`;
          const labelIcon = L.divIcon({
            className: 'betul-ward-pill',
            html: `<div style="pointer-events:none;transform:translate(-50%,-50%);display:inline-flex;align-items:center;justify-content:center;padding:1px 5px;border-radius:999px;font-size:10px;font-weight:800;line-height:1.2;white-space:nowrap;background:${
              isSelected ? '#146C94' : isHighlighted ? '#059669' : 'rgba(255,255,255,0.9)'
            };color:${
              isSelected || isHighlighted ? '#ffffff' : '#0f172a'
            };border:1px solid ${
              isSelected ? '#0e526f' : isHighlighted ? '#047857' : '#cbd5e1'
            };box-shadow:0 1px 3px rgba(0,0,0,0.14);">${pillText}</div>`,
            iconSize: [0, 0],
          });
          L.marker([labelLat, labelLng], {
            icon: labelIcon,
            interactive: false,
          }).addTo(labelsGroup);
        });
      }
    });

    const fitSig = `${effectiveWards.length}|${selectedWardId || ''}|${highlightedWardId || ''}|${focusPoint ? `${focusPoint.lat.toFixed(5)},${focusPoint.lng.toFixed(5)}` : ''}`;
    if (fitSig !== lastFitSignatureRef.current) {
      lastFitSignatureRef.current = fitSig;
      if (focusPoint) {
        const containing = findWardForPoint(
          focusPoint.lat,
          focusPoint.lng,
          effectiveWards,
        );
        const wardPts = containing
          ? getWardPolygons(containing.boundary_coordinates).flat()
          : [];
        if (wardPts.length >= 3) {
          map.fitBounds([...wardPts, [focusPoint.lat, focusPoint.lng]], {
            padding: [28, 28],
            maxZoom: 16,
          });
        } else {
          map.setView([focusPoint.lat, focusPoint.lng], 16);
        }
      } else if (focusCoords.length >= 3) {
        map.fitBounds(focusCoords, { padding: [32, 32], maxZoom: 16 });
      } else if (allBoundsCoords.length >= 3) {
        map.fitBounds(allBoundsCoords, { padding: [20, 20] });
      }
    }
  }, [
    effectiveWards,
    complaints,
    selectedWardId,
    highlightedWardId,
    showLabels,
    focusPoint,
    hi,
  ]);

  // Sync complaint pins + interactive popups
  useEffect(() => {
    const layer = complaintsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showPins) return;

    validComplaints.forEach((c) => {
      const lat = c.latitude!;
      const lng = c.longitude!;
      const color = complaintStatusColor(c.status);

      const marker = L.circleMarker([lat, lng], {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.92,
      });

      const detectedWard =
        (c.ward_id && effectiveWards.find((w) => w.id === c.ward_id)) ||
        findWardForPoint(lat, lng, effectiveWards);

      const osmHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
      const gmapHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      const pop = document.createElement('div');
      pop.style.cssText =
        'font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.45; min-width: 220px; max-width: 270px;';
      pop.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
          <span style="font-weight:800;color:#146C94;font-size:13px;">#${escapeHtml(c.ticket_number || c.id.slice(0, 8))}</span>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;padding:2px 6px;border-radius:999px;background:${color}18;color:${color};border:1px solid ${color}40;">${escapeHtml(c.status.replace(/_/g, ' '))}</span>
        </div>
        ${detectedWard ? `<div style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:2px;">Ward ${escapeHtml(String(detectedWard.ward_number).padStart(2, '0'))} · ${escapeHtml(detectedWard.name)}</div>` : ''}
        ${c.department_name ? `<div style="font-size:11px;color:#475569;margin-bottom:2px;"><b>Dept:</b> ${escapeHtml(c.department_name)}</div>` : ''}
        <div style="font-size:11.5px;color:#1e293b;margin-bottom:4px;">${escapeHtml(c.description.slice(0, 120))}${c.description.length > 120 ? '…' : ''}</div>
        ${c.address ? `<div style="font-size:10.5px;color:#64748b;margin-bottom:6px;">📍 ${escapeHtml(c.address)}</div>` : ''}
        <div class="osm-popup-actions" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;">
          <a href="${osmHref}" target="_blank" rel="noreferrer"
             style="font-size:10.5px;font-weight:700;color:#146C94;text-decoration:none;padding:4px 7px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;">OSM ↗</a>
          <a href="${gmapHref}" target="_blank" rel="noreferrer"
             style="font-size:10.5px;font-weight:700;color:#15803d;text-decoration:none;padding:4px 7px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;">Navigate ↗</a>
        </div>
      `;

      const actionsEl = pop.querySelector('.osm-popup-actions');
      if (actionsEl) {
        if (callbacksRef.current.onSelectComplaint) {
          const detailBtn = document.createElement('button');
          detailBtn.type = 'button';
          detailBtn.textContent = hi ? 'विवरण' : 'Details';
          detailBtn.style.cssText =
            'font-size:10.5px;font-weight:700;color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:5px;padding:4px 8px;cursor:pointer;';
          detailBtn.addEventListener('click', () => {
            callbacksRef.current.onSelectComplaint?.(c);
          });
          actionsEl.appendChild(detailBtn);
        }

        if (
          callbacksRef.current.onAllotComplaint &&
          c.status !== 'resolved' &&
          c.status !== 'verified'
        ) {
          const allotBtn = document.createElement('button');
          allotBtn.type = 'button';
          allotBtn.textContent = hi ? 'सौंपें' : 'Allot Task';
          allotBtn.style.cssText =
            'font-size:10.5px;font-weight:700;color:#ffffff;background:#146C94;border:none;border-radius:5px;padding:4px 8px;cursor:pointer;';
          allotBtn.addEventListener('click', () => {
            callbacksRef.current.onAllotComplaint?.(c);
          });
          actionsEl.appendChild(allotBtn);
        }
      }

      marker.bindPopup(pop);
      layer.addLayer(marker);
    });
  }, [validComplaints, effectiveWards, showPins, hi]);

  // Focus point pulsing pin
  useEffect(() => {
    const layer = focusLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!focusPoint) return;

    const icon = L.divIcon({
      className: 'osm-focus-marker',
      html: `<div style="position:relative;transform:translate(-50%,-50%);width:18px;height:18px;">
        <span style="position:absolute;inset:0;border-radius:999px;background:rgba(220,38,38,0.35);animation:osm-pin-pulse 1.6s ease-out infinite;"></span>
        <span style="position:absolute;inset:3px;border-radius:999px;background:#dc2626;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></span>
      </div>`,
      iconSize: [0, 0],
    });
    const m = L.marker([focusPoint.lat, focusPoint.lng], { icon });
    if (focusPoint.label) {
      m.bindTooltip(focusPoint.label, { permanent: true, direction: 'top', offset: [0, -10] });
    }
    layer.addLayer(m);
  }, [focusPoint]);

  const handleResetView = () => {
    const map = mapRef.current;
    if (!map) return;
    const pts = effectiveWards.flatMap((w) => getWardPolygons(w.boundary_coordinates).flat());
    if (pts.length >= 3) {
      map.fitBounds(pts, { padding: [20, 20] });
    } else if (BETUL_DISTRICT_BOUNDARY.length >= 3) {
      map.fitBounds(BETUL_DISTRICT_BOUNDARY, { padding: [20, 20] });
    } else {
      map.setView(
        [BETUL_MUNICIPALITY_META.center[0], BETUL_MUNICIPALITY_META.center[1]],
        13,
      );
    }
  };

  const handleMyGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus(hi ? 'GPS उपलब्ध नहीं' : 'GPS unavailable');
      return;
    }
    setGpsStatus(hi ? 'लोकेशन खोज रहा है…' : 'Locating…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const detected = findWardForPoint(lat, lng, effectiveWards);
        setGpsStatus(
          detected
            ? `GPS: Ward ${detected.ward_number} · ${detected.name}`
            : `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        );

        const map = mapRef.current;
        const gpsLayer = gpsLayerRef.current;
        if (map && gpsLayer) {
          gpsLayer.clearLayers();
          L.circleMarker([lat, lng], {
            radius: 7,
            color: '#fff',
            weight: 2.5,
            fillColor: '#2563eb',
            fillOpacity: 1,
          })
            .bindPopup(
              detected
                ? `<b>My GPS Location</b><br/>Ward ${detected.ward_number} · ${escapeHtml(detected.name)}`
                : `<b>My GPS Location</b><br/>${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            )
            .addTo(gpsLayer)
            .openPopup();
          map.setView([lat, lng], Math.max(map.getZoom(), 15));
        }

        if (detected) {
          callbacksRef.current.onSelectWard?.(detected);
        }
      },
      () => setGpsStatus(hi ? 'लोकेशन अनुमति अस्वीकृत' : 'GPS access denied'),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <style>{`
        @keyframes osm-pin-pulse {
          0% { transform: scale(1); opacity: 0.85; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowBorder((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 999,
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${showBorder ? '#0f172a' : '#cbd5e1'}`,
              background: showBorder ? '#0f172a' : '#ffffff',
              color: showBorder ? '#ffffff' : '#475569',
            }}
          >
            <Layers size={12} /> {hi ? 'नगर सीमा' : 'Betul Border'}
          </button>

          <button
            type="button"
            onClick={() => setShowLabels((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 999,
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${showLabels ? '#146C94' : '#cbd5e1'}`,
              background: showLabels ? '#e0f2fe' : '#ffffff',
              color: showLabels ? '#0c4a6e' : '#475569',
            }}
          >
            <Tag size={12} /> {hi ? 'वार्ड नंबर' : 'Ward Labels'}
          </button>

          {complaints.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPins((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 999,
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: `1px solid ${showPins ? '#b45309' : '#cbd5e1'}`,
                background: showPins ? '#fef3c7' : '#ffffff',
                color: showPins ? '#92400e' : '#475569',
              }}
            >
              <MapPin size={12} /> {hi ? 'शिकायतें' : 'Complaints'} ({validComplaints.length})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {gpsStatus && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#146C94',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '3px 8px',
                borderRadius: 999,
              }}
            >
              {gpsStatus}
            </span>
          )}
          <button
            type="button"
            onClick={handleMyGps}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 999,
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
            }}
          >
            <Crosshair size={12} /> {hi ? 'मेरा GPS' : 'My GPS'}
          </button>
          <button
            type="button"
            onClick={handleResetView}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 999,
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
            }}
          >
            <RotateCcw size={12} /> {hi ? 'रीसेट व्यू' : 'Reset View'}
          </button>
        </div>
      </div>

      {/* OpenStreetMap Canvas */}
      <div
        ref={containerRef}
        style={{
          height,
          width: '100%',
          borderRadius: 12,
          border: '1.5px solid #cbd5e1',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Legend */}
      {showLegend && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: '0.7rem',
            color: '#475569',
            padding: '2px 4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#146C94', opacity: 0.65, display: 'inline-block' }} />
              {hi ? 'चयनित वार्ड' : 'Selected Ward'}
            </span>
            {highlightedWardId && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#059669', opacity: 0.7, display: 'inline-block' }} />
                {hi ? 'आवंटित वार्ड' : 'Allocated Ward'}
              </span>
            )}
            {complaints.length > 0 && (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                  {hi ? 'लंबित' : 'Pending'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                  {hi ? 'प्रगति में' : 'In Progress'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  {hi ? 'हल' : 'Resolved'}
                </span>
              </>
            )}
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
            <Compass size={11} />{' '}
            {hi
              ? `ओपनस्ट्रीटमैप • बैतूल (${wardCoverageSummary.mappedCount}/${wardCoverageSummary.totalCount} मैप्ड${
                  wardCoverageSummary.missingNums.length > 0
                    ? ` · लंबित: W${wardCoverageSummary.missingNums.join(', W')}`
                    : ''
                })`
              : `OpenStreetMap · Betul (${wardCoverageSummary.mappedCount}/${wardCoverageSummary.totalCount} mapped${
                  wardCoverageSummary.missingNums.length > 0
                    ? ` · Pending: W${wardCoverageSummary.missingNums.join(', W')}`
                    : ''
                })`}
          </span>
        </div>
      )}
    </div>
  );
};

export default InteractiveWardComplaintMap;
