import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, X, RefreshCw, Search, Clock, Users, Pencil, Save,
  BadgeCheck, Mail, Phone, MapPin, Building2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PendingRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  staff_code: string | null;
  hierarchy_code: string | null;
  hierarchy_rank: number;
  authority_role: string | null;
  city_id: string | null;
  city_name: string | null;
  department_id: string | null;
  department_name: string | null;
  designation_id: string | null;
  designation_name: string | null;
  supervisor_id: string | null;
  supervisor_name: string | null;
  created_at: string;
}

interface StaffRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  staff_code: string | null;
  role: string;
  hierarchy_code: string | null;
  city_id: string | null;
  city_name: string | null;
  department_id: string | null;
  department_name: string | null;
  designation_id: string | null;
  designation_name: string | null;
  supervisor_name: string | null;
}

interface Option { id: string; name: string; }

interface DesignationOpt {
  designation_id: string;
  tier: number;
  name: string;
  hierarchy_code: string | null;
}

interface EditState {
  id: string;
  role: string;
  departmentId: string;
  designationId: string;
  cityId: string;
}

interface Props {
  /** Optional: limit the lists to one city */
  cityId?: string | null;
  onChanged?: () => void;
}

const ROLES: { value: string; en: string; hi: string }[] = [
  { value: 'admin',                   en: 'Admin',                   hi: 'एडमिन' },
  { value: 'municipal_administrator', en: 'Municipal Administrator', hi: 'नगर प्रशासक' },
  { value: 'department_head',         en: 'Department Head',         hi: 'विभाग प्रमुख' },
  { value: 'supervisor',              en: 'Supervisor / Area Officer', hi: 'पर्यवेक्षक / क्षेत्र अधिकारी' },
  { value: 'field_employee',          en: 'Operational Staff',       hi: 'संचालन कर्मचारी' },
  { value: 'dept_staff',              en: 'Department Staff',        hi: 'विभाग कर्मचारी' },
  { value: 'control_room',            en: 'Control Room',            hi: 'कंट्रोल रूम' },
  { value: 'management_viewer',       en: 'Management Viewer',       hi: 'प्रबंधन दर्शक' },
  { value: 'citizen',                 en: 'Citizen (remove access)', hi: 'नागरिक (अधिकार हटाएं)' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function StaffApprovals({ cityId = null }: Props) {
  const { language } = useAuth();
  const hi = language === 'hi';
  const t = (en: string, h: string) => (hi ? h : en);

  const [tab, setTab] = useState<'pending' | 'staff'>('pending');
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<DesignationOpt[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [search, setSearch] = useState('');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [edit, setEdit] = useState<EditState | null>(null);

  /* ---------------- loaders ---------------- */
  const loadPending = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('list_pending_approvals', { p_city_id: cityId });
    if (e) { setError(e.message); return; }
    setPending((data ?? []) as PendingRow[]);
  }, [cityId]);

  const loadStaff = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('list_staff_directory', { p_city_id: cityId });
    if (e) { setError(e.message); return; }
    setStaff((data ?? []) as StaffRow[]);
  }, [cityId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      await loadPending();
      if (tab === 'staff') await loadStaff();
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [tab, loadPending, loadStaff]);

  useEffect(() => {
    supabase.from('departments').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setDepartments((data ?? []) as Option[]));
    supabase.from('cities').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setCities((data ?? []) as Option[]));
  }, []);

  const editDept = edit ? edit.departmentId : '';
  useEffect(() => {
    if (!editDept) { setDesignations([]); return; }
    supabase.rpc('list_chain_for_dept', { p_dept_id: editDept })
      .then(({ data }) => setDesignations((data ?? []) as DesignationOpt[]));
  }, [editDept]);

  /* ---------------- actions ---------------- */
  const refresh = async () => {
    setLoading(true); setError(''); setInfo('');
    await loadPending();
    if (tab === 'staff') await loadStaff();
    setLoading(false);
  };

  const decide = async (row: PendingRow, approve: boolean) => {
    setBusyId(row.id); setError(''); setInfo('');
    const { error: e } = await supabase.rpc('approve_staff_request', {
      p_target_user: row.id,
      p_approve: approve,
      p_notes: approve ? null : (rejectNote.trim() || null),
    });
    if (e) {
      console.warn('RPC approve_staff_request failed, trying direct update:', e);
      const { error: directErr } = await supabase
        .from('user_profiles')
        .update({
          approval_status: approve ? 'approved' : 'rejected',
          role: approve ? (row.authority_role || 'dept_staff') : 'rejected_staff',
          approved_at: approve ? new Date().toISOString() : null,
          rejection_reason: approve ? null : (rejectNote.trim() || null),
        })
        .eq('id', row.id);
      if (directErr) {
        setBusyId(null);
        setError(e.message || directErr.message);
        return;
      }
    }
    setBusyId(null);
    setRejectingId(null); setRejectNote('');
    setInfo(approve
      ? t(`${row.full_name || 'User'} approved.`, `${row.full_name || 'उपयोगकर्ता'} स्वीकृत।`)
      : t(`${row.full_name || 'User'} rejected.`, `${row.full_name || 'उपयोगकर्ता'} अस्वीकृत।`));
    await loadPending();
  };

  const startEdit = (r: StaffRow) => {
    setError(''); setInfo('');
    setEdit({
      id: r.id,
      role: r.role,
      departmentId: r.department_id || '',
      designationId: r.designation_id || '',
      cityId: r.city_id || '',
    });
  };

  const saveEdit = async () => {
    if (!edit) return;
    setBusyId(edit.id); setError(''); setInfo('');
    const { error: e } = await supabase.rpc('admin_update_staff', {
      p_user: edit.id,
      p_role: edit.role,
      p_department_id: edit.departmentId || null,
      p_designation_id: edit.designationId || null,
      p_city_id: edit.cityId || null,
    });
    if (e) {
      console.warn('RPC admin_update_staff failed, trying direct update:', e);
      const { error: directErr } = await supabase
        .from('user_profiles')
        .update({
          role: edit.role,
          linked_department_id: edit.departmentId || null,
          designation_id: edit.designationId || null,
          city_id: edit.cityId || null,
        })
        .eq('id', edit.id);
      if (directErr) {
        setBusyId(null);
        setError(e.message || directErr.message);
        return;
      }
    }
    setBusyId(null);
    setEdit(null);
    setInfo(t('Staff member updated.', 'स्टाफ अपडेट हो गया।'));
    await loadStaff();
  };

  /* ---------------- derived ---------------- */
  const q = search.trim().toLowerCase();
  const matches = (...vals: (string | null)[]) =>
    !q || vals.some(v => (v || '').toLowerCase().includes(q));

  const pendingShown = useMemo(
    () => pending.filter(r => matches(r.full_name, r.email, r.staff_code, r.department_name, r.city_name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, q],
  );
  const staffShown = useMemo(
    () => staff.filter(r => matches(r.full_name, r.email, r.staff_code, r.department_name, r.city_name, r.role)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [staff, q],
  );

  const roleLabel = (v: string) => {
    const r = ROLES.find(x => x.value === v);
    return r ? (hi ? r.hi : r.en) : v.replace(/_/g, ' ');
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  /* ---------------- styles ---------------- */
  const S = {
    wrap: { background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--theme-component-border, #bfbfbf)', padding: 20 } as React.CSSProperties,
    tabBtn: (active: boolean) => ({
      display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', border: 'none',
      borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: active ? 800 : 600, fontSize: '0.85rem',
      background: active ? 'var(--theme-primary, #146C94)' : 'var(--theme-bg, #F6F1F1)', color: active ? '#fff' : 'var(--gray-700)',
    }) as React.CSSProperties,
    card: { border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 10, background: 'var(--theme-component, #d9d9d9)' } as React.CSSProperties,
    meta: { display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: 'var(--gray-600)' } as React.CSSProperties,
    badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: 'var(--theme-bg, #F6F1F1)', color: 'var(--theme-primary, #146C94)', fontWeight: 700, fontSize: '0.7rem', border: '1px solid var(--theme-component-border, #bfbfbf)' } as React.CSSProperties,
    btn: (bg: string, color = '#fff') => ({
      display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: 'none',
      borderRadius: 'var(--radius-md)', background: bg, color, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
    }) as React.CSSProperties,
    select: { width: '100%', padding: '9px 10px', border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', background: 'var(--theme-bg, #F6F1F1)' } as React.CSSProperties,
    label: { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: 4 } as React.CSSProperties,
  };

  /* ---------------- render ---------------- */
  return (
    <div style={S.wrap}>
      {/* header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={S.tabBtn(tab === 'pending')} onClick={() => setTab('pending')}>
            <Clock size={15} /> {t('Pending', 'लंबित')} ({pending.length})
          </button>
          <button type="button" style={S.tabBtn(tab === 'staff')} onClick={() => setTab('staff')}>
            <Users size={15} /> {t('All staff', 'सभी स्टाफ')}
          </button>
        </div>
        <button type="button" onClick={refresh} disabled={loading}
          style={S.btn('var(--gray-100)', 'var(--gray-700)')}>
          <RefreshCw size={14} /> {loading ? t('Loading…', 'लोड हो रहा है…') : t('Refresh', 'रिफ्रेश')}
        </button>
      </div>

      {/* search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('Search name, email, staff code, department, city', 'नाम, ईमेल, स्टाफ कोड, विभाग, शहर खोजें')}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
      </div>

      {error && (
        <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: 12 }}>
          {error}
        </div>
      )}
      {info && (
        <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: 12 }}>
          {info}
        </div>
      )}

      {/* ================= PENDING ================= */}
      {tab === 'pending' && (
        <>
          {!loading && pendingShown.length === 0 && (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              {t('No pending registrations.', 'कोई लंबित आवेदन नहीं।')}
            </p>
          )}

          {pendingShown.map(r => (
            <div key={r.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>{r.full_name || t('Unnamed', 'बिना नाम')}</p>
                  <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={S.badge}>
                      {(r.designation_name || r.hierarchy_code || r.authority_role || '').replace(/_/g, ' ')}
                    </span>
                    {r.staff_code && <span style={S.badge}>{r.staff_code}</span>}
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>{fmtDate(r.created_at)}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginTop: 10 }}>
                {r.email && <span style={S.meta}><Mail size={13} /> {r.email}</span>}
                {r.phone && <span style={S.meta}><Phone size={13} /> {r.phone}</span>}
                {r.city_name && <span style={S.meta}><MapPin size={13} /> {r.city_name}</span>}
                {r.department_name && <span style={S.meta}><Building2 size={13} /> {r.department_name}</span>}
                {r.supervisor_name && (
                  <span style={S.meta}><BadgeCheck size={13} /> {t('Reports to', 'रिपोर्टिंग')}: {r.supervisor_name}</span>
                )}
              </div>

              {rejectingId === r.id ? (
                <div style={{ marginTop: 12 }}>
                  <label style={S.label}>{t('Reason for rejection (optional)', 'अस्वीकृति का कारण (वैकल्पिक)')}</label>
                  <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', padding: 8, border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" disabled={busyId === r.id} onClick={() => decide(r, false)} style={S.btn('#dc2626')}>
                      <X size={14} /> {t('Confirm reject', 'अस्वीकार करें')}
                    </button>
                    <button type="button" onClick={() => { setRejectingId(null); setRejectNote(''); }}
                      style={S.btn('var(--gray-100)', 'var(--gray-700)')}>
                      {t('Cancel', 'रद्द करें')}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" disabled={busyId === r.id} onClick={() => decide(r, true)} style={S.btn('#16a34a')}>
                    <Check size={14} /> {busyId === r.id ? '…' : t('Approve', 'स्वीकृत करें')}
                  </button>
                  <button type="button" disabled={busyId === r.id} onClick={() => { setRejectingId(r.id); setRejectNote(''); }}
                    style={S.btn('#fff', '#dc2626')}>
                    <X size={14} /> {t('Reject', 'अस्वीकार')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ================= ALL STAFF ================= */}
      {tab === 'staff' && (
        <>
          {!loading && staffShown.length === 0 && (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              {t('No staff found.', 'कोई स्टाफ नहीं मिला।')}
            </p>
          )}

          {staffShown.map(r => {
            const editing = edit?.id === r.id;
            return (
              <div key={r.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>{r.full_name || t('Unnamed', 'बिना नाम')}</p>
                    <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={S.badge}>{roleLabel(r.role)}</span>
                      {r.designation_name && <span style={S.badge}>{r.designation_name}</span>}
                      {r.staff_code && <span style={S.badge}>{r.staff_code}</span>}
                    </div>
                  </div>
                  {!editing && (
                    <button type="button" onClick={() => startEdit(r)} style={S.btn('var(--gray-100)', 'var(--gray-700)')}>
                      <Pencil size={13} /> {t('Edit', 'बदलें')}
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginTop: 10 }}>
                  {r.email && <span style={S.meta}><Mail size={13} /> {r.email}</span>}
                  {r.phone && <span style={S.meta}><Phone size={13} /> {r.phone}</span>}
                  {r.city_name && <span style={S.meta}><MapPin size={13} /> {r.city_name}</span>}
                  {r.department_name && <span style={S.meta}><Building2 size={13} /> {r.department_name}</span>}
                  {r.supervisor_name && (
                    <span style={S.meta}><BadgeCheck size={13} /> {t('Reports to', 'रिपोर्टिंग')}: {r.supervisor_name}</span>
                  )}
                </div>

                {editing && edit && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--gray-200)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                      <div>
                        <label style={S.label}>{t('Role', 'भूमिका')}</label>
                        <select value={edit.role} onChange={e => setEdit({ ...edit, role: e.target.value })} style={S.select}>
                          {ROLES.map(x => <option key={x.value} value={x.value}>{hi ? x.hi : x.en}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={S.label}>{t('City', 'शहर')}</label>
                        <select value={edit.cityId} onChange={e => setEdit({ ...edit, cityId: e.target.value })} style={S.select}>
                          <option value="">—</option>
                          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={S.label}>{t('Department', 'विभाग')}</label>
                        <select value={edit.departmentId}
                          onChange={e => setEdit({ ...edit, departmentId: e.target.value, designationId: '' })} style={S.select}>
                          <option value="">—</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={S.label}>{t('Level / Designation', 'स्तर / पदनाम')}</label>
                        <select value={edit.designationId}
                          onChange={e => setEdit({ ...edit, designationId: e.target.value })}
                          disabled={!edit.departmentId} style={S.select}>
                          <option value="">—</option>
                          {designations.map(d => (
                            <option key={d.designation_id} value={d.designation_id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button type="button" disabled={busyId === r.id} onClick={saveEdit} style={S.btn('#16a34a')}>
                        <Save size={14} /> {busyId === r.id ? '…' : t('Save', 'सहेजें')}
                      </button>
                      <button type="button" onClick={() => setEdit(null)} style={S.btn('var(--gray-100)', 'var(--gray-700)')}>
                        {t('Cancel', 'रद्द करें')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
