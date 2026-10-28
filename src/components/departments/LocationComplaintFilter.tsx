import { GoogleIcon } from '../common/GoogleIcon';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, MapPin, Compass, Filter, X, Layers,
  Navigation, Crosshair, ChevronDown, CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  distanceMeters,
  type Ward, type Area,
} from '../../lib/wardTypes';

const BORDER  = '1.5px solid var(--theme-component-border, #bfbfbf)';
const PRIMARY = 'var(--theme-primary, #146C94)';

const card: React.CSSProperties = {
  background: 'var(--theme-component, #d9d9d9)',
  border: BORDER,
  borderRadius: 'var(--radius-lg, 12px)',
};
const field: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 'var(--radius-md, 8px)',
  border: BORDER, background: 'var(--theme-bg, #F6F1F1)',
  fontSize: '0.84rem', boxSizing: 'border-box', width: '100%',
};
const primaryBtn: React.CSSProperties = {
  background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
  color: '#fff', border: 'none', borderRadius: 'var(--radius-sm, 6px)',
  padding: '8px 16px', fontSize: '0.78rem', fontWeight: 800,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
};

interface ComplaintRow {
  id: string;
  ticket_number: string;
  description: string;
  address: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  ward_id: string | null;
  area_id: string | null;
  department_id: string | null;
  assigned_to: string | null;
  created_at: string;
  distance_meters?: number;
}

type Mode = 'search' | 'ward' | 'area' | 'radius';

interface Props {
  wards: Ward[];
  areas: Area[];
  onComplaintsChange: (list: ComplaintRow[]) => void;
  onAllocate?: (complaintId: string) => void;
}

export const LocationComplaintFilter: React.FC<Props> = ({
  wards, areas, onComplaintsChange, onAllocate,
}) => {
  const [mode, setMode] = useState<Mode>('search');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [radiusKm, setRadiusKm] = useState(5);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [allComplaints, setAllComplaints] = useState<ComplaintRow[]>([]);
  const [results, setResults] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Fetch a single snapshot of complaints once
  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('complaints')
        .select(`
          id, ticket_number, description, address, status,
          latitude, longitude, ward_id, area_id, department_id,
          assigned_to, created_at
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      if (qErr) throw qErr;
      setAllComplaints((data || []) as ComplaintRow[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load complaints.');
      setAllComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Compute results on every filter change (client-side; cheap)
  useEffect(() => {
    let list: ComplaintRow[] = [...allComplaints];

    // status
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter);

    // ward
    if (mode === 'ward' && selectedWardId) {
      list = list.filter((c) => c.ward_id === selectedWardId);
    }

    // area
    if (mode === 'area' && selectedAreaId) {
      list = list.filter((c) => c.area_id === selectedAreaId);
    }

    // radius
    if (mode === 'radius') {
      if (userLat == null || userLon == null) {
        setResults([]);
        return;
      }
      list = list
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c) => ({
          ...c,
          distance_meters: distanceMeters(userLat, userLon, c.latitude!, c.longitude!),
        }))
        .filter((c) => (c.distance_meters ?? 0) <= radiusKm * 1000)
        .sort((a, b) => (a.distance_meters ?? 0) - (b.distance_meters ?? 0));
    }

    // text search
    if (mode === 'search' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) =>
        c.ticket_number?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q),
      );
    }

    setResults(list);
  }, [allComplaints, mode, selectedWardId, selectedAreaId, statusFilter, searchQuery, radiusKm, userLat, userLon]);

  useEffect(() => { onComplaintsChange(results); }, [results, onComplaintsChange]);

  const getUserLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLon(pos.coords.longitude); setError(null); },
      () => setError('Failed to get your location.'),
    );
  };

  const filteredAreas = useMemo(() => {
    if (!selectedWardId) return areas;
    return areas.filter((a) => a.ward_id === selectedWardId);
  }, [areas, selectedWardId]);

  const activeWard = wards.find((w) => w.id === selectedWardId);
  const activeArea = areas.find((a) => a.id === selectedAreaId);

  return (
    <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color={PRIMARY} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>Location-Based Complaint Viewer</h3>
            <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--gray-600)' }}>
              Filter complaints by ward, area, GPS radius, or text search — then allot.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadAll} disabled={loading} style={primaryBtn}>
            <Search size={14} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 700, color: PRIMARY }}
          >
            <Filter size={14} /> {showFilters ? 'Hide' : 'Show'} Filters
            <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>
        </div>
      </div>

      {showFilters && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'search', label: 'Text', icon: Search },
              { key: 'ward',   label: 'Ward', icon: Layers },
              { key: 'area',   label: 'Area', icon: MapPin },
              { key: 'radius', label: 'GPS Radius', icon: Compass },
            ].map((m) => {
              const Icon = m.icon;
              const active = mode === m.key;
              return (
                <button key={m.key} onClick={() => setMode(m.key as Mode)}
                  style={{
                    padding: '7px 14px', borderRadius: 999, fontSize: '0.76rem', fontWeight: 800,
                    border: `1.5px solid ${active ? PRIMARY : 'var(--theme-component-border, #bfbfbf)'}`,
                    background: active ? PRIMARY : 'var(--theme-bg, #F6F1F1)',
                    color: active ? '#fff' : 'var(--gray-700)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                  }}
                >
                  <Icon size={13} /> {m.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {mode === 'search' && (
              <div style={{ flex: '1 1 280px', position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ticket #, description, address…"
                  style={{ ...field, paddingLeft: 36 }} />
              </div>
            )}

            {mode === 'ward' && (
              <label style={{ flex: '1 1 240px', fontSize: '0.78rem', fontWeight: 700 }}>
                Select Ward
                <select value={selectedWardId} onChange={(e) => setSelectedWardId(e.target.value)}
                  style={{ ...field, marginTop: 4, cursor: 'pointer' }}>
                  <option value="">Choose a ward…</option>
                  {wards.map((w) => <option key={w.id} value={w.id}>Ward {w.ward_number} · {w.name}</option>)}
                </select>
              </label>
            )}

            {mode === 'area' && (
              <>
                <label style={{ flex: '1 1 200px', fontSize: '0.78rem', fontWeight: 700 }}>
                  Filter by Ward (optional)
                  <select value={selectedWardId}
                    onChange={(e) => { setSelectedWardId(e.target.value); setSelectedAreaId(''); }}
                    style={{ ...field, marginTop: 4, cursor: 'pointer' }}>
                    <option value="">All wards</option>
                    {wards.map((w) => <option key={w.id} value={w.id}>Ward {w.ward_number} · {w.name}</option>)}
                  </select>
                </label>
                <label style={{ flex: '1 1 200px', fontSize: '0.78rem', fontWeight: 700 }}>
                  Select Area
                  <select value={selectedAreaId} onChange={(e) => setSelectedAreaId(e.target.value)}
                    style={{ ...field, marginTop: 4, cursor: 'pointer' }}>
                    <option value="">Choose an area…</option>
                    {filteredAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
              </>
            )}

            {mode === 'radius' && (
              <>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Radius: {radiusKm} km
                  <input type="range" min={0.5} max={50} step={0.5}
                    value={radiusKm} onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                    style={{ width: 160, marginTop: 4, display: 'block' }} />
                </label>
                <button onClick={getUserLocation} style={primaryBtn}>
                  <Crosshair size={14} /> Use My Location
                </button>
                {userLat != null && userLon != null && (
                  <span style={{ fontSize: '0.74rem', color: 'var(--gray-600)', fontFamily: 'monospace' }}>
                     {userLat.toFixed(5)}, {userLon.toFixed(5)}
                  </span>
                )}
              </>
            )}

            <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
              Status
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                style={{ ...field, marginTop: 4, cursor: 'pointer', minWidth: 140 }}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="verified">Verified</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {activeWard && <Chip label={`Ward ${activeWard.ward_number} · ${activeWard.name}`} onClear={() => setSelectedWardId('')} />}
            {activeArea && <Chip label={`${activeArea.name}`} onClear={() => setSelectedAreaId('')} />}
            {statusFilter !== 'all' && <Chip label={`${statusFilter}`} onClear={() => setStatusFilter('all')} />}
          </div>
        </>
      )}

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: '0.8rem', fontWeight: 700 }}>
           <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><GoogleIcon name="warning" size={15} />{error}</span>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--gray-700)' }}>
            {results.length} complaint{results.length !== 1 ? 's' : ''} found
          </span>
          {mode === 'radius' && results.length > 0 && results[0].distance_meters != null && (
            <span style={{ fontSize: '0.74rem', color: 'var(--gray-600)' }}>
              Nearest: {Math.round(results[0].distance_meters)} m
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--gray-500)' }}>Loading…</div>
        ) : results.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.84rem' }}>
            <MapPin size={28} style={{ opacity: 0.3, marginBottom: 6 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No complaints match your filters</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((c) => (
              <div key={c.id} style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.5)', border: BORDER,
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 900, color: PRIMARY, fontSize: '0.84rem' }}>#{c.ticket_number}</span>
                    <StatusBadge status={c.status} />
                    {c.distance_meters != null && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d' }}>
                         <GoogleIcon name="my_location" size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />{Math.round(c.distance_meters)} m
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--gray-800)' }}>{c.description}</p>
                  {c.address && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 3 }}><GoogleIcon name="location_on" size={12} />{c.address}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.latitude != null && c.longitude != null && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                      target="_blank" rel="noreferrer"
                      style={{
                        background: '#dcfce7', color: '#166534', border: '1px solid #86efac',
                        borderRadius: 6, padding: '6px 10px', fontSize: '0.72rem',
                        fontWeight: 800, textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                      <Navigation size={12} /> Navigate
                    </a>
                  )}
                  {onAllocate && c.status !== 'resolved' && c.status !== 'verified' && (
                    <button onClick={() => onAllocate(c.id)}
                      style={{ ...primaryBtn, padding: '6px 12px', fontSize: '0.72rem' }}>
                      <CheckCircle2 size={12} /> Allot
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Chip: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', borderRadius: 999,
    background: 'var(--theme-bg, #F6F1F1)',
    border: '1.5px solid var(--theme-component-border, #bfbfbf)',
    fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-800)',
  }}>
    {label}
    <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--gray-600)' }}>
      <X size={11} />
    </button>
  </span>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s =
    status === 'resolved' || status === 'verified'
      ? { bg: '#dcfce7', fg: '#166534' }
      : status === 'pending'
      ? { bg: 'var(--status-pending-bg)', fg: 'var(--status-pending)' }
      : { bg: 'var(--primary-100)', fg: 'var(--burgundy)' };
  return (
    <span style={{
      fontSize: '0.66rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10,
      background: s.bg, color: s.fg, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {status}
    </span>
  );
};

export default LocationComplaintFilter;
