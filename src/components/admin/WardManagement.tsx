import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, MapPin, Edit3, Trash2, X, Save, Compass, Layers,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Ward, Area } from '../../lib/wardTypes';

const BORDER  = '1.5px solid var(--theme-component-border, #bfbfbf)';
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
};
const primaryBtn: React.CSSProperties = {
  background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
  color: '#fff', border: 'none', borderRadius: 'var(--radius-sm, 6px)',
  padding: '8px 16px', fontSize: '0.78rem', fontWeight: 800,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
};
const outlineBtn: React.CSSProperties = {
  ...primaryBtn, background: 'var(--theme-bg, #fff4e7)',
  color: PRIMARY, border: `1.5px solid ${PRIMARY}`,
};

interface Props {
  onWardSelect?: (ward: Ward) => void;
  selectedWardId?: string | null;
}

export const WardManagement: React.FC<Props> = ({ onWardSelect, selectedWardId }) => {
  const [wards, setWards]   = useState<Ward[]>([]);
  const [areas, setAreas]   = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [activeWard, setActiveWard] = useState<Ward | null>(null);
  const [showWardForm, setShowWardForm] = useState(false);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const emptyWard = {
    ward_number: '', name: '', name_hindi: '', description: '',
    center_latitude: '', center_longitude: '', radius_meters: '2000', pincode: '',
  };
  const emptyArea = {
    ward_id: '', name: '', name_hindi: '', description: '',
    center_latitude: '', center_longitude: '', radius_meters: '500', pincode: '',
  };
  const [wardForm, setWardForm] = useState(emptyWard);
  const [areaForm, setAreaForm] = useState(emptyArea);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: w }, { data: a }] = await Promise.all([
        supabase.from('wards').select('*').order('ward_number'),
        supabase.from('areas').select('*').order('name'),
      ]);
      setWards((w || []) as Ward[]);
      setAreas((a || []) as Area[]);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to load.' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); }, []);

  const filteredWards = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return wards;
    return wards.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.name_hindi || '').toLowerCase().includes(q) ||
        String(w.ward_number).includes(q) ||
        (w.pincode || '').includes(q),
    );
  }, [wards, search]);

  const areasFor = (wardId: string) => areas.filter((a) => a.ward_id === wardId);

  /* ---- WARD save ---- */
  const saveWard = async () => {
    if (!wardForm.ward_number || !wardForm.name) {
      setMessage({ type: 'error', text: 'Ward number and name are required.' });
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Ward> = {
        ward_number: parseInt(wardForm.ward_number, 10),
        name: wardForm.name.trim(),
        name_hindi: wardForm.name_hindi.trim() || null,
        description: wardForm.description.trim() || null,
        center_latitude:  wardForm.center_latitude  ? parseFloat(wardForm.center_latitude)  : null,
        center_longitude: wardForm.center_longitude ? parseFloat(wardForm.center_longitude) : null,
        radius_meters: parseInt(wardForm.radius_meters, 10) || 2000,
        pincode: wardForm.pincode.trim() || null,
        is_active: true,
      };
      if (editingWard) {
        const { error } = await supabase.from('wards')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingWard.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('wards').insert(payload);
        if (error) throw error;
      }
      setMessage({ type: 'success', text: `Ward ${payload.ward_number} saved.` });
      setShowWardForm(false); setEditingWard(null); setWardForm(emptyWard);
      await fetchAll();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to save ward.' });
    } finally { setSaving(false); }
  };

  const startEditWard = (w: Ward) => {
    setEditingWard(w);
    setWardForm({
      ward_number: String(w.ward_number),
      name: w.name,
      name_hindi: w.name_hindi || '',
      description: w.description || '',
      center_latitude:  w.center_latitude  != null ? String(w.center_latitude)  : '',
      center_longitude: w.center_longitude != null ? String(w.center_longitude) : '',
      radius_meters: String(w.radius_meters ?? 2000),
      pincode: w.pincode || '',
    });
    setShowWardForm(true);
  };

  const deleteWard = async (w: Ward) => {
    if (!confirm(`Delete Ward ${w.ward_number} · ${w.name}? Areas inside will also be removed.`)) return;
    try {
      const { error } = await supabase.from('wards').delete().eq('id', w.id);
      if (error) throw error;
      if (activeWard?.id === w.id) setActiveWard(null);
      await fetchAll();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to delete ward.' });
    }
  };

  /* ---- AREA save ---- */
  const saveArea = async () => {
    if (!areaForm.ward_id || !areaForm.name) {
      setMessage({ type: 'error', text: 'Ward and area name are required.' });
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Area> = {
        ward_id: areaForm.ward_id,
        name: areaForm.name.trim(),
        name_hindi: areaForm.name_hindi.trim() || null,
        description: areaForm.description.trim() || null,
        center_latitude:  areaForm.center_latitude  ? parseFloat(areaForm.center_latitude)  : null,
        center_longitude: areaForm.center_longitude ? parseFloat(areaForm.center_longitude) : null,
        radius_meters: parseInt(areaForm.radius_meters, 10) || 500,
        pincode: areaForm.pincode.trim() || null,
        is_active: true,
      };
      if (editingArea) {
        const { error } = await supabase.from('areas')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingArea.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('areas').insert(payload);
        if (error) throw error;
      }
      setMessage({ type: 'success', text: `Area "${payload.name}" saved.` });
      setShowAreaForm(false); setEditingArea(null); setAreaForm(emptyArea);
      await fetchAll();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to save area.' });
    } finally { setSaving(false); }
  };

  const startEditArea = (a: Area) => {
    setEditingArea(a);
    setAreaForm({
      ward_id: a.ward_id,
      name: a.name,
      name_hindi: a.name_hindi || '',
      description: a.description || '',
      center_latitude:  a.center_latitude  != null ? String(a.center_latitude)  : '',
      center_longitude: a.center_longitude != null ? String(a.center_longitude) : '',
      radius_meters: String(a.radius_meters ?? 500),
      pincode: a.pincode || '',
    });
    setShowAreaForm(true);
  };

  const deleteArea = async (a: Area) => {
    if (!confirm(`Delete area "${a.name}"?`)) return;
    try {
      const { error } = await supabase.from('areas').delete().eq('id', a.id);
      if (error) throw error;
      await fetchAll();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to delete area.' });
    }
  };

  const useMyLocation = (target: 'ward' | 'area') => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation not supported.' }); return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);
        if (target === 'ward') setWardForm((f) => ({ ...f, center_latitude: lat, center_longitude: lon }));
        else setAreaForm((f) => ({ ...f, center_latitude: lat, center_longitude: lon }));
        setMessage({ type: 'success', text: `Captured: ${lat}, ${lon}` });
      },
      () => setMessage({ type: 'error', text: 'Unable to get your location.' }),
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          border: `1.5px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ ...card, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Layers size={20} color={PRIMARY} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>Ward & Area Management</h3>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--gray-600)' }}>
              Register municipal wards and localities with GPS centers to route complaints.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { setWardForm(emptyWard); setEditingWard(null); setShowWardForm(true); }} style={primaryBtn}>
            <Plus size={14} /> Register Ward
          </button>
          {activeWard && (
            <button
              onClick={() => { setAreaForm({ ...emptyArea, ward_id: activeWard.id }); setEditingArea(null); setShowAreaForm(true); }}
              style={outlineBtn}
            >
              <Plus size={14} /> Add Area to Ward {activeWard.ward_number}
            </button>
          )}
        </div>
      </div>

      <div style={{ ...card, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ward number, name, pincode…"
            style={{ ...field, paddingLeft: 36 }}
          />
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-600)' }}>
          {filteredWards.length} of {wards.length} wards
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>Loading wards…</div>
          ) : filteredWards.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>
              <MapPin size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ margin: 0, fontWeight: 700 }}>No wards registered</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Click "Register Ward" to begin.</p>
            </div>
          ) : filteredWards.map((ward) => {
            const wardAreas = areasFor(ward.id);
            const isActive = activeWard?.id === ward.id || selectedWardId === ward.id;
            return (
              <div
                key={ward.id}
                onClick={() => { setActiveWard(ward); onWardSelect?.(ward); }}
                style={{
                  ...card, padding: '14px 16px',
                  border: isActive ? `2px solid ${PRIMARY}` : BORDER,
                  background: isActive ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        background: PRIMARY, color: '#fff', fontSize: '0.72rem',
                        fontWeight: 900, padding: '2px 8px', borderRadius: 8,
                      }}>Ward {ward.ward_number}</span>
                      <b style={{ fontSize: '0.92rem' }}>{ward.name}</b>
                      {ward.name_hindi && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--gray-600)' }}>({ward.name_hindi})</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--gray-600)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {ward.center_latitude != null && ward.center_longitude != null && (
                        <span>📍 {ward.center_latitude.toFixed(4)}, {ward.center_longitude.toFixed(4)}</span>
                      )}
                      <span>🎯 {ward.radius_meters}m radius</span>
                      <span>🏘️ {wardAreas.length} areas</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={(e) => { e.stopPropagation(); startEditWard(ward); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Edit3 size={14} color="var(--gray-600)" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteWard(ward); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={14} color="#991b1b" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activeWard && (
          <div style={{ ...card, padding: '16px 18px', flex: '1 1 340px', minWidth: 300, position: 'sticky', top: 80 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 800, textTransform: 'uppercase' }}>Areas in Ward</span>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>
                  Ward {activeWard.ward_number} · {activeWard.name}
                </h4>
              </div>
              <button onClick={() => setActiveWard(null)}
                style={{ background: 'var(--gray-100, #eee)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>

            <button
              onClick={() => { setAreaForm({ ...emptyArea, ward_id: activeWard.id }); setEditingArea(null); setShowAreaForm(true); }}
              style={{ ...outlineBtn, width: '100%', justifyContent: 'center', marginBottom: 12 }}
            >
              <Plus size={14} /> Register New Area
            </button>

            {areasFor(activeWard.id).length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.82rem' }}>
                <MapPin size={24} style={{ opacity: 0.3, marginBottom: 6 }} />
                <p style={{ margin: 0, fontWeight: 700 }}>No areas registered</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {areasFor(activeWard.id).map((area) => (
                  <div key={area.id} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--theme-bg, #fff4e7)', border: BORDER,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  }}>
                    <div>
                      <b style={{ fontSize: '0.84rem' }}>{area.name}</b>
                      {area.name_hindi && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--gray-600)', marginLeft: 6 }}>({area.name_hindi})</span>
                      )}
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: 2 }}>
                        {area.pincode && <span>📮 {area.pincode} · </span>}
                        {area.center_latitude != null && area.center_longitude != null
                          ? `📍 ${area.center_latitude.toFixed(4)}, ${area.center_longitude.toFixed(4)}`
                          : 'No GPS set'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button onClick={() => startEditArea(area)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
                        <Edit3 size={13} color="var(--gray-600)" />
                      </button>
                      <button onClick={() => deleteArea(area)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
                        <Trash2 size={13} color="#991b1b" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------- WARD MODAL ---------- */}
      {showWardForm && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowWardForm(false); setEditingWard(null); setWardForm(emptyWard); } }}
        >
          <div style={{ ...card, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
            <div style={{
              background: 'var(--header-gradient, linear-gradient(135deg, #4d0026, #660033, #800040))',
              padding: '16px 20px', color: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  {editingWard ? `Edit Ward ${editingWard.ward_number}` : 'Register New Ward'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', opacity: 0.9 }}>Municipal ward with GPS boundary</p>
              </div>
              <button
                onClick={() => { setShowWardForm(false); setEditingWard(null); setWardForm(emptyWard); }}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: 5 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Ward Number *
                  <input type="number" value={wardForm.ward_number}
                    onChange={(e) => setWardForm({ ...wardForm, ward_number: e.target.value })}
                    placeholder="e.g. 1" style={{ ...field, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Ward Name *
                  <input type="text" value={wardForm.name}
                    onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })}
                    placeholder="e.g. Kothi Bazar" style={{ ...field, marginTop: 4 }} />
                </label>
              </div>

              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                Ward Name (Hindi)
                <input type="text" value={wardForm.name_hindi}
                  onChange={(e) => setWardForm({ ...wardForm, name_hindi: e.target.value })}
                  placeholder="e.g. कोठी बाज़ार" style={{ ...field, marginTop: 4 }} />
              </label>

              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                Description
                <textarea value={wardForm.description}
                  onChange={(e) => setWardForm({ ...wardForm, description: e.target.value })}
                  rows={2} placeholder="Boundaries, landmarks…"
                  style={{ ...field, marginTop: 4, resize: 'vertical' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Latitude
                  <input type="number" step="0.000001" value={wardForm.center_latitude}
                    onChange={(e) => setWardForm({ ...wardForm, center_latitude: e.target.value })}
                    placeholder="21.9015" style={{ ...field, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Longitude
                  <input type="number" step="0.000001" value={wardForm.center_longitude}
                    onChange={(e) => setWardForm({ ...wardForm, center_longitude: e.target.value })}
                    placeholder="77.9018" style={{ ...field, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Radius (m)
                  <input type="number" step="100" value={wardForm.radius_meters}
                    onChange={(e) => setWardForm({ ...wardForm, radius_meters: e.target.value })}
                    placeholder="2000" style={{ ...field, marginTop: 4 }} />
                </label>
              </div>

              <button onClick={() => useMyLocation('ward')} style={{ ...outlineBtn, justifyContent: 'center', fontSize: '0.74rem' }}>
                <Compass size={13} /> Use My Current Location
              </button>

              <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                Pincode
                <input type="text" value={wardForm.pincode}
                  onChange={(e) => setWardForm({ ...wardForm, pincode: e.target.value })}
                  placeholder="460001" style={{ ...field, marginTop: 4 }} />
              </label>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => { setShowWardForm(false); setEditingWard(null); setWardForm(emptyWard); }}
                  style={{ ...outlineBtn, background: 'transparent', border: BORDER, color: 'var(--gray-700)' }}>
                  Cancel
                </button>
                <button onClick={saveWard} disabled={saving} style={primaryBtn}>
                  <Save size={14} /> {saving ? 'Saving…' : editingWard ? 'Update Ward' : 'Create Ward'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- AREA MODAL ---------- */}
      {showAreaForm && (
        <div
          style={{ position: 'fixed', inset: 0
