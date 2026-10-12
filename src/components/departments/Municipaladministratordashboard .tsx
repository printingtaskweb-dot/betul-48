import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDeptComplaints } from '../../hooks/useDeptComplaints';
import { AllotModal, HierarchyFlow } from '../dept/AllotModal';
import type { AllotTarget } from '../dept/AllotModal';
import { getTier, roleLabel, canAllotComplaint, canViewComplaint } from '../../lib/hierarchy';
import type { StaffMember, Viewer } from '../../lib/hierarchy';
import {
  CheckCircle2, Clock, AlertCircle, Search, MapPin, Compass,
  RefreshCw, Eye, X, FileText, Briefcase, UserCheck
} from 'lucide-react';

interface ComplaintRecord {
  id: string;
  ticket_number: string;
  department_id: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  assigned_to: string | null;
  assignment_notes: string | null;
  department?: { name: string; icon: string } | null;
}

interface DepartmentRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface NearbyComplaint {
  id: string;
  ticket_number: string;
  description: string;
  address: string | null;
  status: string;
  distance_meters: number;
}

const STAFF_ROLES = [
  'dept_staff', 'admin', 'department_head', 'supervisor', 'control_room',
  'management_viewer', 'field_employee', 'municipal_administrator',
];

const COMMON_AREAS = [
  'All Areas', 'Kothi Bazar', 'Ganj', 'Civil Lines', 'Sadar Bazar', 'Badora', 'Nehru Park', 'Railway Colony'
];

const BORDER = '1.5px solid var(--theme-component-border, #bfbfbf)';
const PRIMARY = 'var(--theme-primary, #660033)';

const card: React.CSSProperties = {
  background: 'var(--theme-component, #d9d9d9)',
  border: BORDER,
  borderRadius: 'var(--radius-lg)',
};
const field: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 'var(--radius-md)',
  border: BORDER,
  background: 'var(--theme-bg, #fff4e7)',
  fontSize: '0.84rem',
  boxSizing: 'border-box',
};
const primaryBtn: React.CSSProperties = {
  background: 'var(--primary-gradient)', color: '#fff', border: 'none',
  borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: '0.76rem',
  fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
};
const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'var(--theme-bg, #fff4e7)',
  color: PRIMARY,
  border: `1.5px solid ${PRIMARY}`,
};

const isDone = (s: string) => s === 'resolved' || s === 'verified';

const statusStyle = (s: string) =>
  isDone(s)
    ? { bg: '#dcfce7', fg: '#15803d' }
    : s === 'pending'
    ? { bg: '#fef3c7', fg: '#b45309' }
    : { bg: '#e0e7ff', fg: '#3730a3' };

export const MunicipalAdministratorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin', { replace: true });
  }, [user, isAdmin, authLoading, navigate]);

  const { assignComplaint } = useDeptComplaints('all');

  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [area, setArea] = useState('All Areas');
  const [query, setQuery] = useState('');

  const [detail, setDetail] = useState<ComplaintRecord | null>(null);
  const [allotting, setAllotting] = useState<ComplaintRecord | null>(null);

  // Radar
  const [showRadar, setShowRadar] = useState(false);
  const [lat, setLat] = useState(21.9015);
  const [lon, setLon] = useState(77.9018);
  const [radius, setRadius] = useState(5000);
  const [radarLoading, setRadarLoading] = useState(false);
  const [nearby, setNearby] = useState<NearbyComplaint[]>([]);
  const [radarMsg, setRadarMsg] = useState<string | null>(null);

  // Determine viewer hierarchy tier
  const viewer: Viewer = useMemo(() => {
    const isMunicipalAdmin = !profile?.linked_department_id || profile?.role === 'admin' || profile?.role === 'municipal_administrator';
    return {
      id: user?.id || '',
      role: isMunicipalAdmin ? 'municipal_administrator' : (profile?.role || 'dept_staff'),
      linked_department_id: isMunicipalAdmin ? null : (profile?.linked_department_id || null),
    };
  }, [user, profile]);

  const myTier = getTier(viewer.role);
  const isHigherDesignation = myTier <= 2;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: depts }, { data: comps }, { data: people }] = await Promise.all([
        supabase.from('departments').select('id, name, slug, icon').eq('is_active', true).order('name'),
        supabase
          .from('complaints')
          .select(`id, ticket_number, department_id, citizen_name, citizen_phone,
            description, latitude, longitude, address, photo_url, status, created_at,
            assigned_to, assignment_notes, department:department_id(name, icon)`)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_profiles')
          .select('id, full_name, phone, email, role, staff_code, linked_department_id, ward_number')
          .in('role', STAFF_ROLES)
          .order('full_name'),
      ]);

      setDepartments((depts || []).map((d: any) => ({ ...d, icon: d.icon || '🏢' })));
      setComplaints(
        (comps || []).map((c: any) => ({
          ...c,
          department: Array.isArray(c.department) ? c.department[0] : c.department,
        }))
      );
      setStaff((people || []) as StaffMember[]);
    } catch (e) {
      console.error('Municipal dashboard load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const staffById = useMemo(() => {
    const m: Record<string, StaffMember> = {};
    staff.forEach((s) => { m[s.id] = s; });
    return m;
  }, [staff]);

  const headOf = (deptId: string) =>
    staff.find((s) => s.linked_department_id === deptId && getTier(s.role) === 1);

  // Department Isolation: If user has a linked department, strictly isolate to their department!
  const scopedComplaints = useMemo(() => {
    if (myTier === 0) return complaints; // Municipal admin sees all departments
    return complaints.filter((c) => canViewComplaint(viewer, c));
  }, [complaints, viewer, myTier]);

  // ── Counts ──
  const total = scopedComplaints.length;
  const pending = scopedComplaints.filter((c) => c.status === 'pending').length;
  const inProgress = scopedComplaints.filter((c) => c.status === 'in_progress').length;
  const resolved = scopedComplaints.filter((c) => isDone(c.status)).length;

  const filtered = scopedComplaints.filter((c) => {
    const okStatus = statusFilter === 'all' || (statusFilter === 'resolved' ? isDone(c.status) : c.status === statusFilter);
    const okDept = deptFilter === 'all' || c.department_id === deptFilter;
    const okArea =
      area === 'All Areas' ||
      !!c.address?.toLowerCase().includes(area.toLowerCase()) ||
      c.description.toLowerCase().includes(area.toLowerCase());
    const q = query.toLowerCase().trim();
    const okQuery =
      !q ||
      c.ticket_number.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      !!c.address?.toLowerCase().includes(q) ||
      !!c.citizen_name?.toLowerCase().includes(q) ||
      !!c.citizen_phone?.includes(q);
    return okStatus && okDept && okArea && okQuery;
  });

  const hasFilter = statusFilter !== 'all' || deptFilter !== 'all' || area !== 'All Areas' || !!query;

  // ── Radar ──
  const runRadar = async () => {
    setRadarLoading(true);
    setRadarMsg(null);
    try {
      const { data, error } = await supabase.rpc('nearby_complaints', {
        user_lat: lat, user_lon: lon, radius_meters: radius,
      });
      if (!error) {
        setNearby(data || []);
        if (!data?.length) setRadarMsg('No complaints in this radius.');
        return;
      }
      // Fallback: haversine on the client
      const R = 6371e3;
      const rad = (d: number) => (d * Math.PI) / 180;
      const list = scopedComplaints
        .filter((c) => c.latitude && c.longitude)
        .map((c) => {
          const a =
            Math.sin(rad(c.latitude! - lat) / 2) ** 2 +
            Math.cos(rad(lat)) * Math.cos(rad(c.latitude!)) * Math.sin(rad(c.longitude! - lon) / 2) ** 2;
          const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          return {
            id: c.id, ticket_number: c.ticket_number, description: c.description,
            address: c.address, status: c.status, distance_meters: dist,
          };
        })
        .filter((c) => c.distance_meters <= radius)
        .sort((a, b) => a.distance_meters - b.distance_meters);
      setNearby(list);
      if (!list.length) setRadarMsg(`No complaints within ${Math.round(radius / 1000)} km.`);
    } catch (e: any) {
      setRadarMsg(e.message || 'Radar scan failed.');
    } finally {
      setRadarLoading(false);
    }
  };

  const useMyGps = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported by your browser'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(Number(p.coords.latitude.toFixed(6))); setLon(Number(p.coords.longitude.toFixed(6))); },
      (e) => alert('Could not get location: ' + e.message),
      { enableHighAccuracy: true }
    );
  };

  const stats = [
    { key: 'all', label: 'Total', val: total, icon: <FileText size={18} /> },
    { key: 'pending', label: 'Pending', val: pending, icon: <Clock size={18} /> },
    { key: 'in_progress', label: 'In Progress', val: inProgress, icon: <AlertCircle size={18} /> },
    { key: 'resolved', label: 'Resolved', val: resolved, icon: <CheckCircle2 size={18} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ ...card, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--gray-900)' }}>
            🏛️ Municipal Administrator Console
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--gray-600)' }}>
            {myTier === 0
              ? 'City-wide Purview: All municipal departments & task dispatch'
              : `Department Purview: ${profile?.linked_department_id ? 'Isolated to your assigned department' : 'Municipal Portal'}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowRadar(!showRadar)}
            style={{
              ...field, cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6,
              background: showRadar ? PRIMARY : 'var(--theme-bg, #fff4e7)',
              color: showRadar ? '#fff' : PRIMARY,
            }}
          >
            <Compass size={15} /> {showRadar ? 'Hide Radar' : 'Nearby Radar'}
          </button>
          <button onClick={fetchData} style={{ ...field, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stepped Hierarchy Flow Indicator */}
      <div style={{ ...card, padding: '12px 16px' }}>
        <p style={{ margin: '0 0 6px', fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
          Hierarchical Allocation Flow (पदानुक्रम प्रवाह)
        </p>
        <HierarchyFlow myTier={myTier} targetTier={1} language="en" />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {stats.map((s) => {
          const active = statusFilter === s.key && deptFilter === 'all';
          return (
            <div
              key={s.key}
              onClick={() => { setStatusFilter(s.key); setDeptFilter('all'); }}
              style={{
                ...card, padding: '14px 16px', cursor: 'pointer',
                background: active ? PRIMARY : 'var(--theme-component, #d9d9d9)',
                color: active ? '#fff' : 'var(--gray-900)',
                border: active ? `1.5px solid ${PRIMARY}` : BORDER,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                {s.label} {s.icon}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{s.val}</div>
            </div>
          );
        })}
      </div>

      {/* Radar */}
      {showRadar && (
        <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>📍 Nearby Complaints</h3>
            <button onClick={useMyGps} style={{ ...field, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: PRIMARY }}>
              <MapPin size={14} /> Use my GPS
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value) || 0)} style={field} placeholder="Latitude" />
            <input type="number" step="0.0001" value={lon} onChange={(e) => setLon(parseFloat(e.target.value) || 0)} style={field} placeholder="Longitude" />
            <select value={radius} onChange={(e) => setRadius(parseInt(e.target.value))} style={field}>
              {[1000, 2000, 5000, 10000, 25000].map((r) => <option key={r} value={r}>{r / 1000} km</option>)}
            </select>
            <button onClick={runRadar} disabled={radarLoading} style={{ ...primaryBtn, justifyContent: 'center', padding: '9px 14px', fontSize: '0.84rem' }}>
              <Compass size={15} /> {radarLoading ? 'Scanning...' : 'Scan'}
            </button>
          </div>
          {radarMsg && <div style={{ fontSize: '0.8rem', color: '#b45309', background: '#fef3c7', padding: '8px 12px', borderRadius: 6 }}>{radarMsg}</div>}
          {nearby.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {nearby.map((n) => (
                <div key={n.id} style={{ ...field, padding: 10, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <span style={{ color: PRIMARY }}>#{n.ticket_number}</span>
                    <span>{n.distance_meters} m</span>
                  </div>
                  <div style={{ marginTop: 4 }}>{n.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Departments (click to isolate department) */}
      <div>
        <p style={{ margin: '0 0 8px 4px', fontSize: '0.76rem', fontWeight: 800, color: 'var(--gray-600)', textTransform: 'uppercase' }}>
          Departments — Click to isolate complaints by department
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {departments.map((d) => {
            const list = scopedComplaints.filter((c) => c.department_id === d.id);
            const open = list.filter((c) => !isDone(c.status)).length;
            const head = headOf(d.id);
            const active = deptFilter === d.id;
            return (
              <div
                key={d.id}
                onClick={() => { setDeptFilter(active ? 'all' : d.id); setStatusFilter('all'); }}
                style={{
                  ...card, padding: '12px 14px', cursor: 'pointer',
                  background: active ? 'var(--theme-bg, #fff4e7)' : 'var(--theme-component, #d9d9d9)',
                  border: active ? `2px solid ${PRIMARY}` : '2px solid var(--theme-component-border, #bfbfbf)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.3rem' }}>{d.icon}</span>
                  <b style={{ fontSize: '0.9rem', color: 'var(--gray-900)' }}>{d.name}</b>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--gray-700)', margin: '6px 0' }}>
                  Head: <b>{head?.full_name || 'Not assigned'}</b>
                  {head?.phone && <span> • 📞 {head.phone}</span>}
                </div>
                <div style={{ fontSize: '0.74rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total <b>{list.length}</b></span>
                  <span style={{ color: '#b45309' }}>Open <b>{open}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complaints List with Stepped Allotment */}
      <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
            Complaints ({filtered.length})
            {deptFilter !== 'all' && (
              <span style={{ marginLeft: 8, fontSize: '0.8rem', color: PRIMARY, fontWeight: 700 }}>
                • Filtered to: {departments.find(d => d.id === deptFilter)?.name}
              </span>
            )}
          </h3>
          {hasFilter && (
            <button
              onClick={() => { setStatusFilter('all'); setDeptFilter('all'); setArea('All Areas'); setQuery(''); }}
              style={{ ...field, padding: '5px 12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.76rem', color: PRIMARY }}
            >
              Reset filters ↺
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticket, citizen, phone or address..."
              style={{ ...field, width: '100%', paddingLeft: 34, outline: 'none' }}
            />
          </div>
          <select value={area} onChange={(e) => setArea(e.target.value)} style={{ ...field, cursor: 'pointer', fontWeight: 700 }}>
            {COMMON_AREAS.map((a) => <option key={a} value={a}>📍 {a}</option>)}
          </select>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-600)' }}>Loading complaints...</p>
        ) : filtered.length === 0 ? (
          <div style={{ ...field, textAlign: 'center', padding: 28, border: '1.5px dashed var(--theme-component-border, #bfbfbf)', color: 'var(--gray-600)' }}>
            No complaints match the current filters.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 620, overflowY: 'auto' }}>
            {filtered.map((c) => {
              const st = statusStyle(c.status);
              const assignee = c.assigned_to ? staffById[c.assigned_to] : null;
              const canAllot = canAllotComplaint(viewer, c.department_id);

              return (
                <div key={c.id} style={{ ...field, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 240 }}>
                    <span style={{ fontSize: '1.3rem' }}>{c.department?.icon || '🏢'}</span>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <b style={{ color: PRIMARY }}>#{c.ticket_number}</b>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{c.department?.name}</span>
                        <span style={{ background: st.bg, color: st.fg, borderRadius: 20, padding: '1px 8px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--gray-800)' }}>{c.description}</p>
                      <div style={{ marginTop: 4, fontSize: '0.74rem', color: assignee ? PRIMARY : '#b45309', fontWeight: 700 }}>
                        {assignee
                          ? <><UserCheck size={12} style={{ display: 'inline' }} /> Assigned: {assignee.full_name} ({roleLabel(assignee.role, 'en')})</>
                          : '⚠️ Unallotted'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--gray-500)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                    <button onClick={() => setDetail(c)} style={primaryBtn}><Eye size={13} /> Details</button>

                    {/* Only higher designation staff can allot/reassign */}
                    {canAllot && !isDone(c.status) && (
                      <button onClick={() => setAllotting(c)} style={outlineBtn}>
                        <Briefcase size={13} /> {c.assigned_to ? 'Reassign' : 'Allot Task'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details modal */}
      {detail && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}
        >
          <div style={{ ...card, borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ background: 'var(--header-gradient, linear-gradient(135deg, #4d0026, #660033, #800040))', padding: '14px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Ticket #{detail.ticket_number}</h3>
                <p style={{ margin: 0, fontSize: '0.74rem', opacity: 0.85 }}>{detail.department?.name} Department</p>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: 5 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {detail.photo_url && (
                <img src={detail.photo_url} alt="Complaint" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8 }} />
              )}
              <div style={{ ...field, lineHeight: 1.5 }}>{detail.description}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
                <div><b>Citizen:</b> {detail.citizen_name || 'N/A'}</div>
                <div><b>Phone:</b> {detail.citizen_phone || 'N/A'}</div>
                <div><b>Status:</b> {detail.status.toUpperCase()}</div>
                <div><b>Date:</b> {new Date(detail.created_at).toLocaleString()}</div>
                {detail.address && <div style={{ gridColumn: 'span 2' }}><b>Address:</b> {detail.address}</div>}
                {detail.latitude && detail.longitude && (
                  <div style={{ gridColumn: 'span 2' }}><b>GPS:</b> {detail.latitude}, {detail.longitude}</div>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <b>Assigned to:</b> {detail.assigned_to ? staffById[detail.assigned_to]?.full_name || 'Staff' : 'Not assigned'}
                </div>
              </div>
              {isHigherDesignation && !isDone(detail.status) && (
                <button
                  onClick={() => { setAllotting(detail); setDetail(null); }}
                  style={{ ...primaryBtn, justifyContent: 'center', padding: '10px 14px', fontSize: '0.86rem' }}
                >
                  <Briefcase size={14} /> Allot / Dispatch Task
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stepped, hierarchy-aware allot modal */}
      {allotting && (
        <AllotModal
          complaint={{
            id: allotting.id,
            ticket_number: allotting.ticket_number,
            description: allotting.description,
            department_id: allotting.department_id,
            dept_name: allotting.department?.name,
            assigned_to: allotting.assigned_to,
            assignment_notes: allotting.assignment_notes,
            citizen_name: allotting.citizen_name,
            citizen_phone: allotting.citizen_phone,
            address: allotting.address,
          } as AllotTarget}
          viewer={viewer}
          staffList={staff}
          language="en"
          onClose={() => setAllotting(null)}
          onAllotted={fetchData}
          assignComplaint={assignComplaint}
        />
      )}
    </div>
  );
};

export default MunicipalAdministratorDashboard;
