import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ExternalLink, MapPin, PlusCircle, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  countBoundaryCorners,
  findWardForPoint,
  getWardPolygons,
  type Ward,
} from '../lib/wardTypes';
import {
  BETUL_MUNICIPALITY_META,
  BETUL_WARDS_SEED,
  mergeWithOfficialBetulWards,
} from '../data/betulWardBoundaries';
import { InteractiveWardComplaintMap } from './maps/InteractiveWardComplaintMap';

interface LiteComplaint {
  id: string;
  status: string;
  ward_id: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const WardCoverageSection: React.FC = () => {
  const { language } = useAuth();
  const hi = language === 'hi';
  const navigate = useNavigate();

  const [dbWards, setDbWards] = useState<Ward[]>([]);
  const [selectedWardNo, setSelectedWardNo] = useState<number>(1);
  const [wardSearch, setWardSearch] = useState('');
  const [liteComplaints, setLiteComplaints] = useState<LiteComplaint[] | null>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from('wards')
      .select('*')
      .eq('is_active', true)
      .order('ward_number', { ascending: true })
      .then(({ data }) => {
        if (!active || !data) return;
        setDbWards(data as Ward[]);
      });

    // Optional live stats fetch — gracefully ignored if RLS prevents anon read
    supabase
      .from('complaints')
      .select('id, status, ward_id, latitude, longitude')
      .limit(1000)
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        setLiteComplaints(data as LiteComplaint[]);
      });

    return () => {
      active = false;
    };
  }, []);

  const effectiveWards = useMemo(
    () => mergeWithOfficialBetulWards(dbWards, true),
    [dbWards],
  );

  const selectedWard = useMemo(
    () =>
      effectiveWards.find((w) => w.ward_number === selectedWardNo) ||
      effectiveWards[0],
    [effectiveWards, selectedWardNo],
  );

  const selectedSeed = useMemo(
    () =>
      BETUL_WARDS_SEED.find((s) => s.ward_number === selectedWard?.ward_number) ||
      BETUL_WARDS_SEED[0],
    [selectedWard],
  );

  const filteredWards = useMemo(() => {
    const q = wardSearch.trim().toLowerCase();
    if (!q) return effectiveWards;
    return effectiveWards.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.name_hindi || '').toLowerCase().includes(q) ||
        String(w.ward_number).includes(q),
    );
  }, [effectiveWards, wardSearch]);

  const wardStats = useMemo(() => {
    if (!liteComplaints || !selectedWard) return null;
    const matched = liteComplaints.filter((c) => {
      if (c.ward_id && c.ward_id === selectedWard.id) return true;
      if (c.latitude != null && c.longitude != null) {
        const geo = findWardForPoint(c.latitude, c.longitude, effectiveWards);
        return geo?.ward_number === selectedWard.ward_number;
      }
      return false;
    });
    const resolved = matched.filter(
      (c) => c.status === 'resolved' || c.status === 'verified',
    ).length;
    const inProgress = matched.filter((c) => c.status === 'in_progress').length;
    const pending = matched.length - resolved - inProgress;
    return { total: matched.length, resolved, inProgress, pending };
  }, [liteComplaints, selectedWard, effectiveWards]);

  const selectedCorners = selectedWard
    ? countBoundaryCorners(selectedWard.boundary_coordinates)
    : 0;
  const selectedPieces = selectedWard
    ? getWardPolygons(selectedWard.boundary_coordinates).length
    : 0;
  const areaSqM = selectedWard?.area_sq_meters || selectedSeed?.area_sq_meters || 0;
  const areaKm2 = (areaSqM / 1_000_000).toFixed(2);
  const areaHa = (areaSqM / 10000).toFixed(2);
  const areaAcres = (areaSqM / 4046.856).toFixed(1);
  const cLat = selectedWard?.center_latitude ?? BETUL_MUNICIPALITY_META.center[0];
  const cLng = selectedWard?.center_longitude ?? BETUL_MUNICIPALITY_META.center[1];

  return (
    <section
      id="wards-section"
      className="bg-white rounded-3xl border border-sand-200 p-5 sm:p-8 shadow-card"
    >
      <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-civic-50 border border-civic-100 text-civic-800 text-xs font-bold mb-2">
            <Compass className="w-3.5 h-3.5 text-civic-700" />
            <span>
              {hi
                ? `जिला बैतूल • ${BETUL_MUNICIPALITY_META.totalWards} वार्ड (${BETUL_MUNICIPALITY_META.wardsDrawn} मैप्ड सीमाएं)`
                : `Jila Betul • ${BETUL_MUNICIPALITY_META.totalWards} Wards (${BETUL_MUNICIPALITY_META.wardsDrawn} Mapped Borders)`}
            </span>
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-civic-950 tracking-tight">
            {hi ? 'बैतूल नगर पालिका वार्ड मानचित्र (OpenStreetMap)' : 'Betul Municipality Interactive Ward Map'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {hi
              ? 'ओपनस्ट्रीटमैप पर किसी भी वार्ड की वास्तविक सीमा पर क्लिक करें या नीचे से वार्ड चुनकर शिकायत दर्ज करें।'
              : 'Click any municipal ward polygon on OpenStreetMap or select a ward below to view area coverage and file a grievance.'}
          </p>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          {hi ? 'कुल नगर क्षेत्र:' : 'Total Mapped Coverage:'}{' '}
          <strong className="text-civic-900">
            {BETUL_MUNICIPALITY_META.totalAreaSqKm.toFixed(2)} km² ({BETUL_MUNICIPALITY_META.totalAreaHectares.toFixed(0)} ha)
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Live OpenStreetMap with All 30 Mapped Wards + Outer Perimeter */}
        <div className="lg:col-span-7">
          <InteractiveWardComplaintMap
            wards={effectiveWards}
            selectedWardId={selectedWard?.id || null}
            height={360}
            language={language}
            showDistrictBorder={true}
            showWardLabels={true}
            showLegend={true}
            showComplaintPins={false}
            onSelectWard={(w) => setSelectedWardNo(w.ward_number)}
            onReportInWard={(w) => navigate(`/complaint/new?wardNo=${w.ward_number}`)}
          />
        </div>

        {/* Right 5 Columns: Ward Search/Selector + Official Spatial Details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={wardSearch}
                  onChange={(e) => setWardSearch(e.target.value)}
                  placeholder={hi ? 'वार्ड संख्या खोजें (1–33)…' : 'Filter ward number (1–33)…'}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-sand-200 bg-sand-50 text-civic-950 focus:outline-none focus:border-civic-600"
                />
              </div>
              <select
                value={selectedWardNo}
                onChange={(e) => setSelectedWardNo(Number(e.target.value))}
                aria-label="Select Betul Ward"
                className="px-3 py-2 text-xs font-bold rounded-xl border border-sand-200 bg-white text-civic-950 focus:outline-none focus:border-civic-600"
              >
                {effectiveWards.map((w) => (
                  <option key={w.id} value={w.ward_number}>
                    Ward {String(w.ward_number).padStart(2, '0')} · {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Compact Scrollable Quick Ward Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
              {filteredWards.map((w) => {
                const active = w.ward_number === selectedWardNo;
                const mapped = countBoundaryCorners(w.boundary_coordinates) > 0;
                return (
                  <button
                    key={w.ward_number}
                    type="button"
                    onClick={() => setSelectedWardNo(w.ward_number)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition border cursor-pointer ${
                      active
                        ? 'bg-civic-800 text-white border-civic-800 shadow-xs'
                        : mapped
                        ? 'bg-sand-50 hover:bg-civic-50 text-civic-900 border-sand-200'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    W{String(w.ward_number).padStart(2, '0')}
                    {!mapped && ' •'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Ward Info Card */}
          {selectedWard && (
            <div className="p-4 sm:p-5 rounded-2xl bg-sand-50 border border-sand-200 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-civic-800 text-white text-xs font-extrabold">
                      Ward {String(selectedWard.ward_number).padStart(2, '0')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedCorners > 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {selectedCorners > 0
                        ? hi
                          ? `मैप्ड सीमा · ${selectedCorners} बिंदु`
                          : `Mapped Boundary · ${selectedCorners} corners${selectedPieces > 1 ? ` (${selectedPieces} zones)` : ''}`
                        : hi
                        ? 'सर्वेक्षण लंबित'
                        : 'Boundary Pending Survey'}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-civic-950 mt-1.5">
                    {selectedWard.name}{' '}
                    {selectedWard.name_hindi && (
                      <span className="text-sm font-semibold text-slate-500">
                        ({selectedWard.name_hindi})
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white border border-sand-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    {hi ? 'क्षेत्र (km²)' : 'Area (km²)'}
                  </div>
                  <div className="text-sm font-extrabold text-civic-950 mt-0.5">
                    {areaSqM > 0 ? areaKm2 : '—'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-sand-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    {hi ? 'हेक्टेयर' : 'Hectares'}
                  </div>
                  <div className="text-sm font-extrabold text-civic-950 mt-0.5">
                    {areaSqM > 0 ? `${areaHa} ha` : '—'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-sand-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    {hi ? 'एकड़' : 'Acres'}
                  </div>
                  <div className="text-sm font-extrabold text-civic-950 mt-0.5">
                    {areaSqM > 0 ? `${areaAcres} ac` : '—'}
                  </div>
                </div>
              </div>

              {wardStats && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white border border-sand-200">
                    <div className="text-[10px] font-bold text-slate-500">{hi ? 'कुल' : 'Total'}</div>
                    <div className="text-sm font-extrabold text-civic-950">{wardStats.total}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-700">{hi ? 'हल' : 'Resolved'}</div>
                    <div className="text-sm font-extrabold text-emerald-800">{wardStats.resolved}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-700">{hi ? 'लंबित' : 'Active'}</div>
                    <div className="text-sm font-extrabold text-amber-800">{wardStats.pending + wardStats.inProgress}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="inline-flex items-center gap-1 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-civic-600" />
                  {cLat.toFixed(5)}, {cLng.toFixed(5)}
                </span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${cLat}&mlon=${cLng}#map=16/${cLat}/${cLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-civic-700 hover:underline font-bold"
                >
                  <span>OpenStreetMap</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/complaint/new?wardNo=${selectedWard.ward_number}`)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>
                  {hi
                    ? `वार्ड ${selectedWard.ward_number} में शिकायत दर्ज करें`
                    : `Report Issue in Ward ${selectedWard.ward_number}`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
