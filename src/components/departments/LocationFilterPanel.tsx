LocationFilterimport React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin, Compass, Search, Filter, X, Navigation,
  Briefcase, ChevronDown, Crosshair, CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  distanceMeters,
  findWardForPoint,
  type Ward,
} from '../../lib/wardTypes';
import type { DeptComplaint } from '../../hooks/useDeptComplaints';

const BORDER = '1.5px solid var(--theme-component-border, #bfbfbf)';
const PRIMARY = 'var(--theme-primary, #660033)';

const card: React.CSSProperties = {
  background: 'var(--theme-component, #d9d9d9)',
  border: BORDER,
  borderRadius: 'var(--radius-lg, 12px)',
};
const field: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 'var(--radius-md, 8px)',
  border: BORDER,
  background: 'var(--theme-bg, #fff4e7)',
  fontSize: '0.84rem',
  boxSizing: 'border-box',
  width: '100%',
  fontFamily: 'var(--font-primary)',
};
const primaryBtn: React.CSSProperties = {
  background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-sm, 6px)',
  padding: '8px 16px',
  fontSize: '0.78rem',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

type Mode = 'ward' | 'radius' | 'text';

interface Props {
  complaints: DeptComplaint[];
  wards: Ward[];
  language?: 'en' | 'hi';
  onAllocate: (c: DeptComplaint) => void;
}

export const LocationFilterPanel: React.FC<Props> = ({
  complaints,
  wards,
  language = 'en',
  onAllocate,
}) => {
  const hi = language === 'hi';

  const [mode, setMode] = useState<Mode>('ward');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [radiusKm, setRadiusKm] = useState(3);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(true);

  const activeWard = useMemo(
    () => wards.find((w) => w.id === selectedWardId) || null,
    [wards, selectedWardId],
  );

  const askGPS = () => {
    if (!navigator.geolocation) {
      setGpsErr('Geolocation not supported.');
      return;
    }
    setGpsBusy(true);
    setGpsErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLon(pos.coords.longitude);
        setGpsBusy(false);
      },
      (err) => {
        setGpsBusy(false);
        setGpsErr(err.message || 'Failed to get location.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // Results computed purely client-side (fast, no RPC needed)
  const results = useMemo(() => {
    let list = [...complaints];

    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (mode === 'ward' && activeWard) {
      list = list.filter((c) => {
        if (c.latitude == null || c.longitude == null) return false;
        if (
          activeWard.center_latitude == null ||
          activeWard.center_longitude == null
        )
          return false;
        const d = distanceMeters(
          activeWard.center_latitude,
          activeWard.center_longitude,
          c.latitude,
          c.longitude,
        );
        return d <= (activeWard.radius_meters || 2000);
      });
      return list;
    }

    if (mode === 'radius' && userLat != null && userLon != null) {
      return list
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c) => ({
          ...c,
          __dist: distanceMeters(userLat, userLon, c.latitude!, c.longitude!),
        }))
        .filter((c) => (c as any).__dist <= radiusKm * 1000)
        .sort((a, b) => (a as any).__dist - (b as any).__dist) as DeptComplaint[];
    }

    if (mode === 'text' && query.trim()) {
      const q = query.toLowerCase().trim();
      return list.filter(
        (c) =>
          c.ticket_number?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q) ||
          (c.citizen_name || '').toLowerCase().includes(q),
      );
    }

    return list;
  }, [complaints, mode, activeWard, userLat, userLon, radiusKm, query, statusFilter]);

  // Auto-show ward name on results if matched
  const wardNameFor = (c: DeptComplaint): string | null => {
    if (c.latitude == null || c.longitude == null) return null;
    const w = findWardForPoint(c.latitude, c.longitude, wards);
    return w ? `Ward ${w.ward_number}` : null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ ...card, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} color={PRIMARY} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>
              {hi ? 'स्थान आधारित शिकायत फ़िल्टर' : 'Location-Based Complaint Filter'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--gray-600)' }}>
              {hi ? 'वार्ड, त्रिज्या या पाठ से शिकायतें खोजें और कार्य आवंटित करें' : 'Find complaints by ward, radius, or text — then allot tasks'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: '0.76rem', fontWeight: 700, color: PRIMARY,
          }}
        >
          <Filter size={14} /> {showFilters ? (hi ? 'छिपाएं' : 'Hide') : (hi ? 'दिखाएं' : 'Show')}
          <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
      </div>

      {showFilters && (
        <div style={{ ...card, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { k: 'ward' as Mode, label: hi ? '🏘️ वार्ड से' : '🏘️ By Ward' },
              { k: 'radius' as Mode, label: hi ? '🎯 त्रिज्या से' : '🎯 By Radius' },
              { k: 'text' as Mode, label: hi ? '🔍 पाठ खोज' : '🔍 Text Search' },
            ].map((m) => {
              const active = mode === m.k;
              return (
                <button
                  key={m.k}
                  onClick={() => setMode(m.k)}
                  style={{
                    padding: '7px 14px', borderRadius: 999, fontSize: '0.76rem', fontWeight: 800,
                    border: `1.5px solid ${active ? PRIMARY : 'var(--theme-component-border, #bfbfbf)'}`,
                    background: active ? PRIMARY : 'var(--theme-bg, #fff4e7)',
                    color: active ? '#fff' : 'var(--gray-700)',
                    cursor: 'pointer',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Mode-specific inputs */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {mode === 'ward' && (
              <label style={{ flex: '1 1 240px', fontSize: '0.78rem', fontWeight: 700 }}>
                {hi ? 'वार्ड चुनें' : 'Select Ward'}
                <select
                  value={selectedWardId}
                  onChange={(e) => setSelectedWardId(e.target.value)}
                  style={{ ...field, marginTop: 4, cursor: 'pointer' }}
                >
                  <option value="">{hi ? '— वार्ड चुनें —' : '— Choose a ward —'}</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      Ward {w.ward_number} · {w.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {mode === 'radius' && (
              <>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  {hi ? 'त्रिज्या' : 'Radius'}: {radiusKm} km
                  <input
                    type="range" min={0.5} max={30} step={0.5}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                    style={{ width: 180, marginTop: 4, display: 'block' }}
                  />
                </label>
                <button onClick={askGPS} disabled={gpsBusy} style={primaryBtn}>
                  <Crosshair size={14} />
                  {gpsBusy ? (hi ? 'स्थान…' : 'Locating…') : hi ? 'मेरा स्थान' : 'Use My Location'}
                </button>
                {userLat != null && userLon != null && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)', fontFamily: 'monospace' }}>
                    📍 {userLat.toFixed(5)}, {userLon.toFixed(5)}
                  </span>
                )}
                {gpsErr && (
                  <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700 }}>
                    ⚠️ {gpsErr}
                  </span>
                )}
              </>
            )}

            {mode === 'text' && (
              <div style={{ flex: '1 1 260px', position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={hi ? 'टिकट, विवरण, नागरिक…' : 'Ticket #, description, citizen…'}
                  style={{ ...field, paddingLeft: 36 }}
                />
              </div>
            )}

            <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
              {hi ? 'स्थिति' : 'Status'}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ ...field, marginTop: 4, cursor: 'pointer', minWidth: 140 }}
              >
                <option value="all">{hi ? 'सभी' : 'All Statuses'}</option>
                <option value="pending">{hi ? 'लंबित' : 'Pending'}</option>
                <option value="in_progress">{hi ? 'प्रगति में' : 'In Progress'}</option>
                <option value="resolved">{hi ? 'हल किए' : 'Resolved'}</option>
                <option value="verified">{hi ? 'सत्यापित' : 'Verified'}</option>
              </select>
            </label>
          </div>

          {/* Ward summary chip when ward mode */}
          {mode === 'ward' && activeWard && (
            <div
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--theme-bg, #fff4e7)', border: BORDER,
                fontSize: '0.76rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}
            >
              <span style={{ color: PRIMARY }}>
                🏘️ Ward {activeWard.ward_number} · {activeWard.name}
              </span>
              <span style={{ color: 'var(--gray-600)' }}>
                🎯 {activeWard.radius_meters} m
              </span>
              {activeWard.center_latitude != null && activeWard.center_longitude != null && (
                <span style={{ fontFamily: 'monospace', color: 'var(--gray-600)' }}>
                  📍 {activeWard.center_latitude.toFixed(4)}, {activeWard.center_longitude.toFixed(4)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div style={{ ...card, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--gray-700)' }}>
            {results.length} {hi ? 'शिकायतें मिलीं' : 'complaints found'}
          </span>
          {mode === 'radius' && results.length > 0 && (results[0] as any).__dist != null && (
            <span style={{ fontSize: '0.74rem', color: 'var(--gray-600)' }}>
              {hi ? 'निकटतम' : 'Nearest'}: {Math.round((results[0] as any).__dist)} m
            </span>
          )}
        </div>

        {results.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.84rem' }}>
            <MapPin size={28} style={{ opacity: 0.3, marginBottom: 6 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>
              {hi ? 'कोई शिकायत नहीं मिली' : 'No complaints match your filters'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((c) => {
              const wardTag = wardNameFor(c);
              const dist = (c as any).__dist as number | undefined;
              return (
                <div
                  key={c.id}
                  style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.5)', border: BORDER,
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 900, color: PRIMARY, fontSize: '0.84rem' }}>
                        #{c.ticket_number}
                      </span>
                      <StatusBadge status={c.status} />
                      {wardTag && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--gray-600)' }}>🏘️ {wardTag}</span>
                      )}
                      {dist != null && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d' }}>
                          🎯 {Math.round(dist)} m
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--gray-800)' }}>
                      {c.description}
                    </p>
                    {c.address && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                        📮 {c.address}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.latitude != null && c.longitude != null && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#dcfce7', color: '#166534',
                          border: '1px solid #86efac', borderRadius: 6,
                          padding: '6px 10px', fontSize: '0.72rem',
                          fontWeight: 800, textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Navigation size={12} /> {hi ? 'रास्ता' : 'Navigate'}
                      </a>
                    )}
                    {c.status !== 'resolved' && c.status !== 'verified' && (
                      <button
                        onClick={() => onAllocate(c)}
                        style={{ ...primaryBtn, padding: '6px 12px', fontSize: '0.72rem' }}
                      >
                        <Briefcase size={12} /> {hi ? 'कार्य सौंपें' : 'Allot Task'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s =
    status === 'resolved' || status === 'verified'
      ? { bg: '#dcfce7', fg: '#166534' }
      : status === 'pending'
      ? { bg: '#fef3c7', fg: '#b45309' }
      : { bg: '#e0e7ff', fg: '#3730a3' };
  return (
    <span
      style={{
        fontSize: '0.66rem', fontWeight: 800, padding: '2px 8px',
        borderRadius: 10, background: s.bg, color: s.fg,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}
    >
      {status}
    </span>
  );
};

export default LocationFilterPanel;Panel.tsx
