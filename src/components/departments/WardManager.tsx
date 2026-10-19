import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin, Plus, X, Save, Trash2, Search, Navigation,
  RefreshCw, Layers, Compass,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LocationPicker } from '../common/LocationPicker';
import { useAuth } from '../../contexts/AuthContext';
import { wholeNumber } from '../../lib/inputValidation';
import {
  reverseGeocode,
  type Ward,
} from '../../lib/wardTypes';

const BORDER = '1.5px solid var(--theme-component-border, #bfbfbf)';
const PRIMARY = 'var(--theme-primary, #146C94)';

const card: React.CSSProperties = {
  background: 'var(--theme-component, #d9d9d9)',
  border: BORDER,
  borderRadius: 'var(--radius-lg, 12px)',
};
const field: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 'var(--radius-md, 8px)',
  border: BORDER,
  background: 'var(--theme-bg, #F6F1F1)',
  fontSize: '0.84rem',
  boxSizing: 'border-box',
  width: '100%',
  fontFamily: 'var(--font-primary)',
};
const primaryBtn: React.CSSProperties = {
  background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
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
const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'var(--theme-bg, #F6F1F1)',
  color: PRIMARY,
  border: `1.5px solid ${PRIMARY}`,
};

interface Props {
  language?: 'en' | 'hi';
}

interface WardForm {
  name: string;
  name_hindi: string;
  ward_number: string;
  description: string;
  radius_meters: string;
  pincode: string;
}

const EMPTY_FORM: WardForm = {
  name: '',
  name_hindi: '',
  ward_number: '',
  description: '',
  radius_meters: '2000',
  pincode: '',
};

export const WardManager: React.FC<Props> = ({ language = 'en' }) => {
  const hi = language === 'hi';
  const { user } = useAuth();

  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  // GPS state (fed by LocationPicker)
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Auto-detected address
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const [form, setForm] = useState<WardForm>(EMPTY_FORM);

  const fetchWards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wards')
        .select('*')
        .order('ward_number', { ascending: true });
      if (error) throw error;
      setWards((data || []) as Ward[]);
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to load wards.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setLat(la);
        setLon(lo);
        setAccuracy(pos.coords.accuracy ?? null);
        setGpsLoading(false);

        setDetecting(true);
        const addr = await reverseGeocode(la, lo);
        setDetecting(false);
        if (addr) {
          setDetectedAddress(addr);
          // Auto-fill name if empty
          setForm((f) => {
            if (f.name.trim()) return f;
            const short = addr.split(',').slice(0, 2).join(',').trim();
            return { ...f, name: short };
          });
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.message || 'Failed to get your location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setLat(null);
    setLon(null);
    setAccuracy(null);
    setDetectedAddress(null);
    setGpsError(null);
  };

  const saveWard = async () => {
    if (!user) {
      setMessage({ type: 'error', text: hi ? 'कृपया पहले लॉगिन करें' : 'Please sign in before registering a ward.' });
      return;
    }
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: hi ? 'वार्ड का नाम आवश्यक है' : 'Ward name is required.' });
      return;
    }
    if (!form.ward_number.trim()) {
      setMessage({ type: 'error', text: hi ? 'वार्ड नंबर आवश्यक है' : 'Ward number is required.' });
      return;
    }
    if (lat == null || lon == null) {
      setMessage({ type: 'error', text: hi ? 'GPS स्थान आवश्यक है' : 'GPS location required — tap Detect Location.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ward_number: parseInt(form.ward_number, 10),
        name: form.name.trim(),
        name_hindi: form.name_hindi.trim() || null,
        description: form.description.trim() || detectedAddress || null,
        center_latitude: lat,
        center_longitude: lon,
        radius_meters: parseInt(form.radius_meters, 10) || 2000,
        pincode: form.pincode.trim() || null,
        is_active: true,
        created_by: user.id,
      };

      const { error } = await supabase.from('wards').insert(payload);
      if (error) throw error;

      setMessage({ type: 'success', text: hi ? `वार्ड ${payload.ward_number} जोड़ा गया` : `Ward ${payload.ward_number} saved.` });
      resetForm();
      setShowForm(false);
      await fetchWards();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to save ward.' });
    } finally {
      setSaving(false);
    }
  };

  const deleteWard = async (w: Ward) => {
    if (!confirm(hi ? `वार्ड ${w.ward_number} को हटाएं?` : `Delete Ward ${w.ward_number} · ${w.name}?`)) return;
    try {
      const { error } = await supabase.from('wards').delete().eq('id', w.id);
      if (error) throw error;
      await fetchWards();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Delete failed.' });
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return wards;
    return wards.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        String(w.ward_number).includes(q) ||
        (w.name_hindi || '').toLowerCase().includes(q) ||
        (w.pincode || '').includes(q),
    );
  }, [wards, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {message && (
        <div
          style={{
            padding: '10px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1.5px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ ...card, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Layers size={20} color={PRIMARY} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>
              {hi ? 'वार्ड पंजीकरण' : 'Ward Registration'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--gray-600)' }}>
              {hi
                ? 'GPS से वर्तमान स्थान लें, वार्ड नाम दर्ज करें और सहेजें।'
                : 'Capture current GPS location, name the ward, and save. Complaints within radius auto-link.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchWards} style={outlineBtn}>
            <RefreshCw size={14} /> {hi ? 'रिफ्रेश' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
              // Auto-trigger GPS on open
              setTimeout(detectLocation, 100);
            }}
            style={primaryBtn}
          >
            <Plus size={14} /> {hi ? 'नया वार्ड जोड़ें' : 'Add New Ward'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ ...card, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={hi ? 'वार्ड नंबर, नाम, पिनकोड...' : 'Search ward number, name, pincode…'}
            style={{ ...field, paddingLeft: 36 }}
          />
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-600)' }}>
          {filtered.length} / {wards.length} {hi ? 'वार्ड' : 'wards'}
        </span>
      </div>

      {/* Ward List */}
      {loading ? (
        <div style={{ ...card, padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>
          {hi ? 'लोड हो रहा है…' : 'Loading wards…'}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>
          <MapPin size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>
            {hi ? 'कोई वार्ड पंजीकृत नहीं' : 'No wards registered yet'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>
            {hi ? '"नया वार्ड जोड़ें" पर क्लिक करें।' : 'Click "Add New Ward" to register your first municipal ward.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map((ward) => (
            <div key={ward.id} style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: PRIMARY, color: '#fff',
                        fontSize: '0.7rem', fontWeight: 900,
                        padding: '2px 8px', borderRadius: 8,
                      }}
                    >
                      {hi ? `वार्ड ${ward.ward_number}` : `Ward ${ward.ward_number}`}
                    </span>
                    <b style={{ fontSize: '0.9rem' }}>{ward.name}</b>
                  </div>
                  {ward.name_hindi && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--gray-600)', marginTop: 2 }}>
                      {ward.name_hindi}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteWard(ward)}
                  title="Delete ward"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}
                >
                  <Trash2 size={14} color="#991b1b" />
                </button>
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--gray-700)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {ward.center_latitude != null && ward.center_longitude != null && (
                  <span style={{ fontFamily: 'monospace' }}>
                    📍 {ward.center_latitude.toFixed(5)}, {ward.center_longitude.toFixed(5)}
                  </span>
                )}
                <span>
                  🎯 {hi ? 'त्रिज्या' : 'Radius'}: {ward.radius_meters} m
                </span>
                {ward.pincode && <span>📮 {ward.pincode}</span>}
                {ward.description && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)', marginTop: 2 }}>
                    {ward.description.length > 90 ? ward.description.slice(0, 90) + '…' : ward.description}
                  </span>
                )}
              </div>

              <a
                href={
                  ward.center_latitude != null && ward.center_longitude != null
                    ? `https://www.google.com/maps/dir/?api=1&destination=${ward.center_latitude},${ward.center_longitude}`
                    : '#'
                }
                target="_blank"
                rel="noreferrer"
                style={{
                  ...outlineBtn,
                  textDecoration: 'none',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  padding: '6px 10px',
                  marginTop: 4,
                }}
              >
                <Navigation size={12} /> {hi ? 'दिशा-निर्देश' : 'Get Directions'}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Add Ward Modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              resetForm();
            }
          }}
        >
          <div style={{ ...card, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
            <div
              style={{
                background: 'var(--header-gradient, linear-gradient(135deg, #0E526F, #146C94, #0E526F))',
                padding: '16px 20px', color: '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  {hi ? 'नया वार्ड जोड़ें' : 'Register New Ward'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', opacity: 0.9 }}>
                  {hi ? 'GPS स्थान + वार्ड विवरण' : 'GPS center + ward details'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: 5 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* GPS capture */}
              <div>
                <button
                  onClick={detectLocation}
                  disabled={gpsLoading}
                  style={{ ...primaryBtn, width: '100%', justifyContent: 'center', padding: '11px 14px' }}
                >
                  <Compass size={15} />
                  {gpsLoading
                    ? hi ? 'स्थान प्राप्त हो रहा है…' : 'Detecting location…'
                    : hi ? 'वर्तमान स्थान लें' : 'Detect Current Location'}
                </button>

                <div style={{ marginTop: 8 }}>
                  <LocationPicker
                    latitude={lat}
                    longitude={lon}
                    accuracy={accuracy}
                    address={detectedAddress}
                    loading={gpsLoading}
                    error={gpsError}
                    onDetect={detectLocation}
                    language={language}
                  />
                </div>

                {lat != null && lon != null && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#dcfce7',
                      border: '1.5px solid #86efac',
                      fontSize: '0.8rem',
                      color: '#166534',
                      fontWeight: 700,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontFamily: 'monospace' }}>
                      📍 {lat.toFixed(6)}, {lon.toFixed(6)}
                      {accuracy != null && <span> (±{Math.round(accuracy)} m)</span>}
                    </span>
                    {detecting && (
                      <span style={{ color: 'var(--gray-600)', fontSize: '0.74rem', fontWeight: 600 }}>
                        {hi ? 'पता खोजा जा रहा है…' : 'Detecting address…'}
                      </span>
                    )}
                    {detectedAddress && !detecting && (
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#166534' }}>
                        🏠 {detectedAddress}
                      </span>
                    )}
                  </div>
                )}

                {gpsError && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: '#fee2e2',
                      border: '1.5px solid #fca5a5',
                      fontSize: '0.78rem',
                      color: '#991b1b',
                      fontWeight: 700,
                    }}
                  >
                    ⚠️ {gpsError}
                  </div>
                )}
              </div>

              {/* Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  {hi ? 'वार्ड नंबर *' : 'Ward Number *'}
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.ward_number}
                    onChange={(e) => setForm({ ...form, ward_number: wholeNumber(e.target.value, 3) })}
                    placeholder="1"
                    style={{ ...field, marginTop: 4 }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  {hi ? 'वार्ड का नाम *' : 'Ward Name *'}
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={hi ? 'उदा. कोठी बाज़ार' : 'e.g. Kothi Bazar'}
                    style={{ ...field, marginTop: 4 }}
                  />
                </label>
              </div>

              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                {hi ? 'नाम (हिंदी)' : 'Name (Hindi)'}
                <input
                  type="text"
                  value={form.name_hindi}
                  onChange={(e) => setForm({ ...form, name_hindi: e.target.value })}
                  placeholder="उदा. कोठी बाज़ार"
                  style={{ ...field, marginTop: 4 }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  {hi ? 'त्रिज्या (मीटर)' : 'Radius (meters)'}
                  <input
                    type="number"
                    step="100"
                    value={form.radius_meters}
                    onChange={(e) => setForm({ ...form, radius_meters: wholeNumber(e.target.value, 6) })}
                    placeholder="2000"
                    style={{ ...field, marginTop: 4 }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  {hi ? 'पिनकोड' : 'Pincode'}
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: wholeNumber(e.target.value, 6) })}
                    placeholder="460001"
                    style={{ ...field, marginTop: 4 }}
                  />
                </label>
              </div>

              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                {hi ? 'विवरण' : 'Description'}
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder={detectedAddress || (hi ? 'सीमा, मील के पत्थर…' : 'Boundaries, landmarks…')}
                  style={{ ...field, marginTop: 4, resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  style={{ ...outlineBtn, background: 'transparent', border: BORDER, color: 'var(--gray-700)' }}
                >
                  {hi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  onClick={saveWard}
                  disabled={saving || lat == null || lon == null}
                  style={{
                    ...primaryBtn,
                    opacity: saving || lat == null || lon == null ? 0.55 : 1,
                    cursor: saving || lat == null || lon == null ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Save size={14} />
                  {saving ? (hi ? 'सहेज रहे हैं…' : 'Saving…') : hi ? 'वार्ड सहेजें' : 'Save Ward'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardManager;
