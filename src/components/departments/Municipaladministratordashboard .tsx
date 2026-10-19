import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDeptComplaints } from '../../hooks/useDeptComplaints';
import { AllotModal } from '../dept/AllotModal';
import type { AllotTarget } from '../dept/AllotModal';
import { WardManagement } from '../admin/WardManagement';
import { LocationComplaintFilter } from '../admin/LocationComplaintFilter';
import type { Ward, Area } from '../../lib/wardTypes';
import { DepartmentServiceIcon } from '../common/DepartmentServiceIcon';
import {
  getTier,
  canAllotComplaint,
  canViewComplaint,
  TIER_LABEL,
} from '../../lib/hierarchy';
import type { StaffMember, Viewer } from '../../lib/hierarchy';
import {
  Search, MapPin, Compass,
  RefreshCw, Eye, X, Briefcase, BarChart3,
  TrendingUp, Building2, Layers,
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
  ward_id: string | null;
  area_id: string | null;
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

const COMMON_AREAS = [
  'All Areas', 'Kothi Bazar', 'Ganj', 'Civil Lines', 'Sadar Bazar', 'Badora', 'Nehru Park', 'Railway Colony'
];

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
};
const primaryBtn: React.CSSProperties = {
  background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-sm, 6px)',
  padding: '7px 14px',
  fontSize: '0.78rem',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};
const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'var(--theme-bg, #F6F1F1)',
  color: PRIMARY,
  border: `1.5px solid ${PRIMARY}`,
};

const isDone = (s: string) => s === 'resolved' || s === 'verified';

const statusStyle = (s: string) =>
  isDone(s)
    ? { bg: '#dcfce7', fg: '#15803d' }
    : s === 'pending'
    ? { bg: 'var(--status-pending-bg)', fg: 'var(--status-pending)' }
    : { bg: 'var(--primary-100)', fg: 'var(--burgundy)' };

type ViewTab =
  | 'overview'
  | 'analytics'
  | 'complaints'
  | 'departments'
  | 'wards'
  | 'team'
  | 'ward-manager'
  | 'location-viewer';

export const MunicipalAdministratorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const { assignComplaint } = useDeptComplaints('all');

  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [wardsList, setWardsList] = useState<Ward[]>([]);
  const [areasList, setAreasList] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [area, setArea] = useState('All Areas');
  const [query, setQuery] = useState('');

  const [detail, setDetail] = useState<ComplaintRecord | null>(null);
  const [allotting, setAllotting] = useState<ComplaintRecord | null>(null);

  // Radar Scanner
  const [showRadar, setShowRadar] = useState(false);
  const [lat, setLat] = useState(21.9015);
  const [lon, setLon] = useState(77.9018);
  const [radius, setRadius] = useState(5000);
  const [radarLoading, setRadarLoading] = useState(false);
  const [nearby, setNearby] = useState<NearbyComplaint[]>([]);
  const [radarMsg, setRadarMsg] = useState<string | null>(null);

  // Viewer hierarchy tier & authority
  const viewer: Viewer = useMemo(() => {
    const isMunicipalAdmin =
      !profile?.linked_department_id ||
      profile?.role === 'admin' ||
      profile?.role === 'municipal_administrator' ||
      profile?.role === 'deputy_commissioner' ||
      profile?.authority_role === 'deputy_commissioner' ||
      profile?.authority_role === 'municipal_commissioner';

    return {
      id: user?.id || '',
      role: isMunicipalAdmin ? (profile?.role || 'municipal_administrator') : (profile?.role || 'dept_staff'),
      linked_department_id: isMunicipalAdmin ? null : (profile?.linked_department_id || null),
      hierarchy_code: profile?.hierarchy_code || null,
      authority_role: profile?.authority_role || null,
      is_admin: isAdmin,
    };
  }, [user, profile, isAdmin]);

  const myTier = getTier(viewer.role, viewer.hierarchy_code, viewer.authority_role);
  const isDeputyOrHigher = myTier <= 1;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: depts },
        { data: comps },
        { data: people },
        { data: wardData },
        { data: areaData },
      ] = await Promise.all([
        supabase
          .from('departments')
          .select('id, name, slug, icon')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('complaints')
          .select(
            `id, ticket_number, department_id, citizen_name, citizen_phone,
             description, latitude, longitude, address, photo_url, status, created_at,
             assigned_to, assignment_notes, ward_id, area_id,
             department:department_id(name, icon)`
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('user_profiles')
          .select(
            'id, full_name, phone, email, role, staff_code, linked_department_id, ward_number, authority_role, hierarchy_code'
          )
          .neq('role', 'citizen')
          .order('full_name'),
        supabase.from('wards').select('*').order('ward_number'),
        supabase.from('areas').select('*').order('name'),
      ]);

      setDepartments((depts || []).map((d: any) => ({ ...d, icon: d.icon || '🏢' })));
      setComplaints(
        (comps || []).map((c: any) => ({
          ...c,
          ticket_number: c.ticket_number || c.id.slice(0, 8),
          ward_id: c.ward_id ?? null,
          area_id: c.area_id ?? null,
          department: Array.isArray(c.department) ? c.department[0] : c.department,
        }))
      );
      setStaff((people || []) as StaffMember[]);
      setWardsList((wardData || []) as Ward[]);
      setAreasList((areaData || []) as Area[]);
    } catch (e) {
      console.error('Data fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const staffById = useMemo(() => {
    const m: Record<string, StaffMember> = {};
    staff.forEach((s) => {
      m[s.id] = s;
    });
    return m;
  }, [staff]);

  const headOf = (deptId: string) =>
    staff.find(
      (s) =>
        s.linked_department_id === deptId &&
        getTier(s.role, s.hierarchy_code, s.authority_role) === 2
    );

  // Department Isolation
  const scopedComplaints = useMemo(() => {
    if (isDeputyOrHigher) return complaints;
    return complaints.filter((c) => canViewComplaint(viewer, c));
  }, [complaints, viewer, isDeputyOrHigher]);

  const visibleDepartments = useMemo(() => {
    if (isDeputyOrHigher) return departments;
    return departments.filter((d) => d.id === profile?.linked_department_id);
  }, [departments, isDeputyOrHigher, profile]);

  useEffect(() => {
    if (!isDeputyOrHigher && profile?.linked_department_id) {
      setDeptFilter(profile.linked_department_id);
    }
  }, [isDeputyOrHigher, profile]);

  // Overall Counts
  const total = scopedComplaints.length;
  const pending = scopedComplaints.filter((c) => c.status === 'pending').length;
  const inProgress = scopedComplaints.filter((c) => c.status === 'in_progress').length;
  const resolved = scopedComplaints.filter((c) => isDone(c.status)).length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Filtered complaints
  const filtered = useMemo(() => {
    return scopedComplaints.filter((c) => {
      const okStatus =
        statusFilter === 'all' ||
        (statusFilter === 'resolved' ? isDone(c.status) : c.status === statusFilter);
      const okDept = deptFilter === 'all' || c.department_id === deptFilter;
      const okWard = wardFilter === 'all' || c.ward_id === wardFilter;
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
        !!c.citizen_phone?.includes(q) ||
        (c.assigned_to && staffById[c.assigned_to]?.full_name?.toLowerCase().includes(q));
      return okStatus && okDept && okWard && okArea && okQuery;
    });
  }, [scopedComplaints, statusFilter, deptFilter, wardFilter, area, query, staffById]);

  // SLA Metrics
  const slaMetrics = useMemo(() => {
    let fastCount = 0;
    let standardCount = 0;
    let overdueCount = 0;
    const now = Date.now();

    scopedComplaints.forEach((c) => {
      const created = new Date(c.created_at).getTime();
      const diffHours = (now - created) / (1000 * 60 * 60);

      if (isDone(c.status)) {
        if (diffHours < 24) fastCount++;
        else if (diffHours <= 72) standardCount++;
        else overdueCount++;
      } else {
        if (diffHours > 72) overdueCount++;
        else if (diffHours > 24) standardCount++;
        else fastCount++;
      }
    });

    return { fastCount, standardCount, overdueCount };
  }, [scopedComplaints]);

  // Employee Performance
  const employeePerformance = useMemo(() => {
    return staff
      .filter((s) => {
        if (isDeputyOrHigher) return true;
        return s.linked_department_id === profile?.linked_department_id;
      })
      .map((s) => {
        const assignedComps = complaints.filter((c) => c.assigned_to === s.id);
        const solvedComps = assignedComps.filter((c) => isDone(c.status));
        const rate =
          assignedComps.length > 0
            ? Math.round((solvedComps.length / assignedComps.length) * 100)
            : 0;
        const tier = getTier(s.role, s.hierarchy_code, s.authority_role);
        return {
          ...s,
          tier,
          assignedCount: assignedComps.length,
          solvedCount: solvedComps.length,
          pendingCount: assignedComps.length - solvedComps.length,
          rate,
        };
      })
      .sort((a, b) => b.solvedCount - a.solvedCount || b.assignedCount - a.assignedCount);
  }, [staff, complaints, isDeputyOrHigher, profile]);

  // Registered Wards Metrics — prefer ward_id link, fallback to text match
  const wardMetrics = useMemo(() => {
    const map: Record<
      string,
      { total: number; resolved: number; pending: number; officers: StaffMember[] }
    > = {};

    if (wardsList.length > 0) {
      wardsList.forEach((w) => {
        map[String(w.ward_number)] = { total: 0, resolved: 0, pending: 0, officers: [] };
      });
    } else {
      for (let i = 1; i <= 36; i++) {
        const wKey = String(i);
        map[wKey] = { total: 0, resolved: 0, pending: 0, officers: [] };
      }
    }

    const wardNumberById: Record<string, string> = {};
    wardsList.forEach((w) => {
      wardNumberById[w.id] = String(w.ward_number);
    });

    scopedComplaints.forEach((c) => {
      let wardKey: string | null = null;

      if (c.ward_id && wardNumberById[c.ward_id]) {
        wardKey = wardNumberById[c.ward_id];
      } else {
        const m =
          c.address?.match(/ward\s*(\d+)/i) || c.description.match(/ward\s*(\d+)/i);
        if (m) wardKey = m[1];
      }

      if (wardKey && map[wardKey]) {
        map[wardKey].total++;
        if (isDone(c.status)) map[wardKey].resolved++;
        else map[wardKey].pending++;
      }
    });

    staff.forEach((s) => {
      if (s.ward_number && map[s.ward_number]) {
        map[s.ward_number].officers.push(s);
      }
    });

    return Object.entries(map).map(([ward, data]) => ({ ward, ...data }));
  }, [scopedComplaints, staff, wardsList]);

  // Radar Scan Handler
  const runRadar = async () => {
    setRadarLoading(true);
    setRadarMsg(null);
    try {
      const { data, error } = await supabase.rpc('nearby_complaints', {
        user_lat: lat,
        user_lon: lon,
        radius_meters: radius,
      });
      if (!error) {
        setNearby(data || []);
        if (!data?.length) setRadarMsg('No complaints found in this radius.');
        return;
      }
      // Fallback: client-side haversine
      const R = 6371e3;
      const rad = (d: number) => (d * Math.PI) / 180;
      const list = scopedComplaints
        .filter((c) => c.latitude && c.longitude)
        .map((c) => {
          const a =
            Math.sin(rad(c.latitude! - lat) / 2) ** 2 +
            Math.cos(rad(lat)) *
              Math.cos(rad(c.latitude!)) *
              Math.sin(rad(c.longitude! - lon) / 2) ** 2;
          const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          return {
            id: c.id,
            ticket_number: c.ticket_number,
            description: c.description,
            address: c.address,
            status: c.status,
            distance_meters: dist,
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

  // Location Filter "Allot" handler — opens AllotModal
  const handleAllocateFromLocationFilter = (complaintId: string) => {
    const match = complaints.find((c) => c.id === complaintId);
    if (match) setAllotting(match);
  };

  const roleBadge = TIER_LABEL[myTier] || TIER_LABEL[0];

  return (
    <div
      style={{
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        maxWidth: 1440,
        margin: '0 auto',
      }}
    >
      {/* ── Executive Header Bar ── */}
      <div
        style={{
          ...card,
          padding: '20px 24px',
          background:
            'var(--header-gradient, linear-gradient(135deg, #0E526F 0%, #146C94 50%, #0E526F 100%))',
          color: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: 'var(--shadow-md, 0 8px 24px rgba(102,0,51,0.25))',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.6rem' }}>{roleBadge.icon}</span>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                }}
              >
                {myTier === 0
                  ? 'Municipal & Organisation Administration'
                  : myTier === 1
                  ? 'Deputy Commissioner Executive Portal'
                  : 'Department Operational Head Dashboard'}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                IMC Betul 311 Municipal Portal • Real-time SLA Governance & Cascading Task
                Delegation
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{roleBadge.icon}</span>
            <span>{roleBadge.en}</span>
          </span>

          <button
            onClick={fetchData}
            style={{
              background: 'var(--theme-bg, #F6F1F1)',
              color: PRIMARY,
              border: 'none',
              borderRadius: 'var(--radius-sm, 6px)',
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Executive Metrics Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        <div style={{ ...card, padding: '16px 18px' }}>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--gray-600)',
              textTransform: 'uppercase',
            }}
          >
            Total Complaints
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: PRIMARY, marginTop: 4 }}>
            {total}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--gray-600)', marginTop: 4 }}>
            Across {visibleDepartments.length} registered departments
          </div>
        </div>

        <div style={{ ...card, padding: '16px 18px' }}>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--status-pending)',
              textTransform: 'uppercase',
            }}
          >
            Pending Allotment
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--status-pending)', marginTop: 4 }}>
            {pending}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--gray-600)', marginTop: 4 }}>
            Requires officer allocation
          </div>
        </div>

        <div style={{ ...card, padding: '16px 18px' }}>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--burgundy)',
              textTransform: 'uppercase',
            }}
          >
            In Progress / Dispatched
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--burgundy)', marginTop: 4 }}>
            {inProgress}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--gray-600)', marginTop: 4 }}>
            Under field supervisor / worker action
          </div>
        </div>

        <div style={{ ...card, padding: '16px 18px' }}>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#15803d',
              textTransform: 'uppercase',
            }}
          >
            Resolved & Verified
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#15803d', marginTop: 4 }}>
            {resolved}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--gray-600)', marginTop: 4 }}>
            Resolution efficiency: <b>{resolutionRate}%</b>
          </div>
        </div>

        <div style={{ ...card, padding: '16px 18px' }}>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--gray-700)',
              textTransform: 'uppercase',
            }}
          >
            SLA Compliance
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: PRIMARY, marginTop: 4 }}>
            {slaMetrics.fastCount + slaMetrics.standardCount} / {total || 1}
          </div>
          <div
            style={{
              fontSize: '0.74rem',
              color: slaMetrics.overdueCount > 0 ? '#991b1b' : '#15803d',
              marginTop: 4,
            }}
          >
            Overdue (&gt;72h): <b>{slaMetrics.overdueCount}</b>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
          marginBottom: 12,
        }}
      >
        {[
          { id: 'overview', label: 'Executive Overview', sub: 'KPIs & Workload', icon: <BarChart3 size={22} />, gradient: 'linear-gradient(135deg, #146C94, #19A7CE)', border: '#146C94' },
          { id: 'complaints', label: 'Task Allocation', sub: 'Complaints', badge: filtered.length, icon: <Briefcase size={22} />, gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: '#7c3aed' },
          { id: 'analytics', label: 'Employee Leaderboard', sub: 'Rankings', icon: <TrendingUp size={22} />, gradient: 'linear-gradient(135deg, #059669, #10b981)', border: '#059669' },
          { id: 'wards', label: 'Wards', sub: 'Boundaries', badge: wardsList.length, icon: <MapPin size={22} />, gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', border: '#d97706' },
          { id: 'departments', label: 'Departments', sub: 'Civic Units', icon: <Building2 size={22} />, gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)', border: '#0f766e' },
          { id: 'ward-manager', label: 'Ward Registration', sub: 'Geofence', icon: <Layers size={22} />, gradient: 'linear-gradient(135deg, #dc2626, #f87171)', border: '#dc2626' },
          { id: 'location-viewer', label: 'Location Filter', sub: 'Map Radar', icon: <Compass size={22} />, gradient: 'linear-gradient(135deg, #475569, #64748b)', border: '#475569' },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as ViewTab)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '12px 8px',
                borderRadius: 14,
                border: isActive ? `2px solid ${item.border}` : '1px solid #e2e8f0',
                background: isActive ? '#ffffff' : '#f8fafc',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.18s ease',
                boxShadow: isActive ? '0 6px 18px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
                transform: isActive ? 'translateY(-2px)' : 'none',
              }}
            >
              {item.badge !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: isActive ? item.border : '#64748b',
                    color: '#fff',
                    borderRadius: 12,
                    padding: '1px 6px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                  }}
                >
                  {item.badge}
                </span>
              )}
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: item.gradient,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.08)',
                }}
              >
                {item.icon}
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 800 : 700,
                  color: isActive ? '#0f172a' : '#475569',
                  lineHeight: 1.25,
                }}
              >
                {item.label}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>{item.sub}</span>
            </button>
          );
        })}
      </div>

      {/* ── Global Search & Quick Multi-Filter Bar ── */}
      <div
        style={{
          ...card,
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--gray-500)',
            }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticket #, citizen, staff, address, keyword..."
            style={{ ...field, width: '100%', paddingLeft: 36 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...field, cursor: 'pointer' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          {isDeputyOrHigher && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ ...field, cursor: 'pointer' }}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.name}
                </option>
              ))}
            </select>
          )}

          {wardsList.length > 0 && (
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              style={{ ...field, cursor: 'pointer' }}
            >
              <option value="all">All Wards</option>
              {wardsList.map((w) => (
                <option key={w.id} value={w.id}>
                  Ward {w.ward_number} · {w.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            style={{ ...field, cursor: 'pointer' }}
          >
            {COMMON_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowRadar(!showRadar)}
            style={{
              ...primaryBtn,
              background: showRadar ? PRIMARY : 'var(--theme-bg, #F6F1F1)',
              color: showRadar ? '#fff' : PRIMARY,
              border: `1.5px solid ${PRIMARY}`,
            }}
          >
            <Compass size={14} />
            <span>Radar Scanner</span>
          </button>
        </div>
      </div>

      {/* ── PostGIS Radar Panel ── */}
      {showRadar && (
        <div
          style={{
            ...card,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <b
              style={{
                fontSize: '0.88rem',
                color: PRIMARY,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Compass size={16} /> PostGIS Spatial Nearby Scanner
            </b>
            <button
              onClick={() => setShowRadar(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: '0.78rem' }}>
              Latitude:
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                style={{ ...field, width: 110, marginLeft: 6 }}
              />
            </label>
            <label style={{ fontSize: '0.78rem' }}>
              Longitude:
              <input
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                style={{ ...field, width: 110, marginLeft: 6 }}
              />
            </label>
            <label style={{ fontSize: '0.78rem' }}>
              Radius (m):
              <input
                type="number"
                step="500"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10) || 1000)}
                style={{ ...field, width: 100, marginLeft: 6 }}
              />
            </label>
            <button onClick={runRadar} disabled={radarLoading} style={primaryBtn}>
              <Compass size={14} /> {radarLoading ? 'Scanning...' : 'Scan Area'}
            </button>
          </div>
          {radarMsg && (
            <div
              style={{
                fontSize: '0.8rem',
                color: '#b45309',
                background: '#fef3c7',
                padding: '8px 12px',
                borderRadius: 6,
              }}
            >
              {radarMsg}
            </div>
          )}
          {nearby.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 8,
              }}
            >
              {nearby.map((n) => (
                <div key={n.id} style={{ ...field, padding: 10, fontSize: '0.8rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 800,
                    }}
                  >
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

      {/* ── TAB 1: EXECUTIVE OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ ...card, padding: '20px 22px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    color: 'var(--gray-900)',
                  }}
                >
                  📊 Department Workload & Performance Comparison (Power BI Analytics)
                </h3>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: '0.76rem',
                    color: 'var(--gray-600)',
                  }}
                >
                  Comparative workload bars across municipal departments. Click any department bar
                  to filter tasks.
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: 'var(--theme-bg, #F6F1F1)',
                  border: BORDER,
                  color: PRIMARY,
                }}
              >
                Live Metrics
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {visibleDepartments.map((dept) => {
                const deptComps = scopedComplaints.filter((c) => c.department_id === dept.id);
                const deptResolved = deptComps.filter((c) => isDone(c.status)).length;
                const deptInProgress = deptComps.filter((c) => c.status === 'in_progress').length;
                const deptPending = deptComps.filter((c) => c.status === 'pending').length;
                const deptTotal = deptComps.length;
                const rate = deptTotal > 0 ? Math.round((deptResolved / deptTotal) * 100) : 0;
                const head = headOf(dept.id);
                const isSelected = deptFilter === dept.id;

                return (
                  <div
                    key={dept.id}
                    onClick={() => {
                      if (isDeputyOrHigher) {
                        setDeptFilter(isSelected ? 'all' : dept.id);
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: isSelected
                        ? 'var(--theme-bg, #F6F1F1)'
                        : 'rgba(255,255,255,0.4)',
                      border: isSelected ? `2px solid ${PRIMARY}` : BORDER,
                      cursor: isDeputyOrHigher ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <DepartmentServiceIcon slugOrName={dept.name} size={30} iconSize={16} />
                        <b style={{ fontSize: '0.9rem', color: 'var(--gray-900)' }}>
                          {dept.name}
                        </b>
                        <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)' }}>
                          • Head: <b>{head?.full_name || 'Not assigned'}</b>
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.76rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span style={{ color: '#15803d', fontWeight: 800 }}>
                          Resolved: {deptResolved}
                        </span>
                        <span style={{ color: 'var(--burgundy)', fontWeight: 700 }}>
                          In Progress: {deptInProgress}
                        </span>
                        <span style={{ color: 'var(--status-pending)', fontWeight: 700 }}>
                          Pending: {deptPending}
                        </span>
                        <span style={{ fontWeight: 900, color: PRIMARY, marginLeft: 4 }}>
                          Total: {deptTotal} ({rate}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress bar — thinner by half (height 6px, maxWidth 210px) */}
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: 'var(--theme-component-border, #bfbfbf)',
                        display: 'flex',
                        overflow: 'hidden',
                        width: '100%',
                        maxWidth: 210,
                      }}
                    >
                      {deptTotal > 0 ? (
                        <>
                          <div
                            style={{
                              width: `${(deptResolved / deptTotal) * 100}%`,
                              background: '#15803d',
                              transition: 'width 0.4s ease',
                            }}
                          />
                          <div
                            style={{
                              width: `${(deptInProgress / deptTotal) * 100}%`,
                              background: 'var(--burgundy)',
                              transition: 'width 0.4s ease',
                            }}
                          />
                          <div
                            style={{
                              width: `${(deptPending / deptTotal) * 100}%`,
                              background: 'var(--status-pending)',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </>
                      ) : (
                        <div
                          style={{ width: '100%', background: 'rgba(0,0,0,0.06)' }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...card, padding: '20px 22px' }}>
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: '1.05rem',
                fontWeight: 900,
                color: 'var(--gray-900)',
              }}
            >
              ⏱️ Turnaround Timing & SLA Resolution Compliance
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: '#dcfce7',
                  border: '1.5px solid #86efac',
                }}
              >
                <b style={{ fontSize: '0.86rem', color: '#166534' }}>
                  ⚡ Fast Resolution (&lt; 24h)
                </b>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: '#166534',
                    marginTop: 4,
                  }}
                >
                  {slaMetrics.fastCount}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: 2 }}>
                  Complaints resolved within 24 hours of filing
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: '#fef3c7',
                  border: '1.5px solid #fde047',
                }}
              >
                <b style={{ fontSize: '0.86rem', color: '#854d0e' }}>
                  ⏳ Standard Resolution (24 - 72h)
                </b>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: '#854d0e',
                    marginTop: 4,
                  }}
                >
                  {slaMetrics.standardCount}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#854d0e', marginTop: 2 }}>
                  Resolved within regular SLA threshold
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: '#fee2e2',
                  border: '1.5px solid #fca5a5',
                }}
              >
                <b style={{ fontSize: '0.86rem', color: '#991b1b' }}>
                  🚨 Overdue / SLA Breached (&gt; 72h)
                </b>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: '#991b1b',
                    marginTop: 4,
                  }}
                >
                  {slaMetrics.overdueCount}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#991b1b', marginTop: 2 }}>
                  Requires urgent deputy commissioner / head intervention
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: COMPLAINTS & ALLOCATION ── */}
      {activeTab === 'complaints' && (
        <div
          style={{
            ...card,
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
                Municipal Complaints & Hierarchical Allotment ({filtered.length})
              </h3>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: '0.76rem',
                  color: 'var(--gray-600)',
                }}
              >
                Click 'Allot Task' to dispatch via the stepped delegation chain: Dept Head ➔ Area
                Officer ➔ Supervisor ➔ Field Worker.
              </p>
            </div>
            {deptFilter !== 'all' && (
              <span
                style={{
                  fontSize: '0.78rem',
                  color: PRIMARY,
                  fontWeight: 800,
                  background: 'var(--theme-bg, #F6F1F1)',
                  padding: '4px 10px',
                  borderRadius: 12,
                  border: BORDER,
                }}
              >
                Filtered to: {departments.find((d) => d.id === deptFilter)?.name}
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--gray-600)',
                fontSize: '0.88rem',
              }}
            >
              No complaints found matching current filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((c) => {
                const sSt = statusStyle(c.status);
                const canAllot = canAllotComplaint(viewer, c.department_id);
                const assignedStaff = c.assigned_to ? staffById[c.assigned_to] : null;
                const wardObj = wardsList.find((w) => w.id === c.ward_id);
                const areaObj = areasList.find((a) => a.id === c.area_id);

                return (
                  <div
                    key={c.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.4)',
                      border: BORDER,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        flex: '1 1 340px',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          background: 'var(--theme-bg, #F6F1F1)',
                          border: BORDER,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.3rem',
                          flexShrink: 0,
                        }}
                      >
                        {c.department?.icon || '🏢'}
                      </div>
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 900,
                              color: PRIMARY,
                              fontSize: '0.88rem',
                            }}
                          >
                            #{c.ticket_number}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 10,
                              background: sSt.bg,
                              color: sSt.fg,
                              textTransform: 'uppercase',
                            }}
                          >
                            {c.status}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                            {c.department?.name}
                          </span>
                          {wardObj && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 10,
                                background: 'rgba(102,0,51,0.08)',
                                color: PRIMARY,
                              }}
                            >
                              🏘️ Ward {wardObj.ward_number}
                            </span>
                          )}
                          {areaObj && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--gray-600)',
                              }}
                            >
                              📍 {areaObj.name}
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            margin: '4px 0',
                            fontSize: '0.82rem',
                            color: 'var(--gray-800)',
                            lineHeight: 1.4,
                          }}
                        >
                          {c.description}
                        </p>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--gray-600)',
                            display: 'flex',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}
                        >
                          {c.address && <span>📍 {c.address}</span>}
                          {c.citizen_name && <span>👤 {c.citizen_name}</span>}
                          <span>📅 {new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.76rem',
                          color: 'var(--gray-700)',
                          minWidth: 140,
                        }}
                      >
                        {assignedStaff ? (
                          <div>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: 'var(--gray-500)',
                                display: 'block',
                              }}
                            >
                              Assigned To:
                            </span>
                            <b style={{ color: PRIMARY }}>{assignedStaff.full_name}</b>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                display: 'block',
                                color: 'var(--gray-600)',
                              }}
                            >
                              (
                              {
                                TIER_LABEL[
                                  getTier(
                                    assignedStaff.role,
                                    assignedStaff.hierarchy_code,
                                    assignedStaff.authority_role
                                  )
                                ]?.short
                              }
                              )
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--status-pending)', fontWeight: 700 }}>
                            ⚠️ Unassigned
                          </span>
                        )}
                      </div>

                      <button onClick={() => setDetail(c)} style={outlineBtn}>
                        <Eye size={13} /> Details
                      </button>

                      {canAllot && !isDone(c.status) && (
                        <button onClick={() => setAllotting(c)} style={primaryBtn}>
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
      )}

      {/* ── TAB 3: EMPLOYEE PERFORMANCE LEADERBOARD ── */}
      {activeTab === 'analytics' && (
        <div
          style={{
            ...card,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 900,
                color: 'var(--gray-900)',
              }}
            >
              🏆 Municipal Employee Performance & Task Execution Leaderboard
            </h3>
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '0.76rem',
                color: 'var(--gray-600)',
              }}
            >
              Individual employee performance metrics, resolution percentages, and workload
              distribution.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.82rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: BORDER,
                    textAlign: 'left',
                    color: 'var(--gray-700)',
                  }}
                >
                  <th style={{ padding: '10px 12px' }}>Employee</th>
                  <th style={{ padding: '10px 12px' }}>Role / Tier</th>
                  <th style={{ padding: '10px 12px' }}>Department</th>
                  <th style={{ padding: '10px 12px' }}>Ward</th>
                  <th style={{ padding: '10px 12px' }}>Assigned</th>
                  <th style={{ padding: '10px 12px' }}>Resolved</th>
                  <th style={{ padding: '10px 12px' }}>Pending</th>
                  <th style={{ padding: '10px 12px' }}>Completion Rate</th>
                  <th style={{ padding: '10px 12px' }}>Contact</th>
                </tr>
              </thead>
              <tbody>
                {employeePerformance.map((emp) => {
                  const deptObj = departments.find(
                    (d) => d.id === emp.linked_department_id
                  );
                  const tierBadge = TIER_LABEL[emp.tier] || TIER_LABEL[5];

                  return (
                    <tr
                      key={emp.id}
                      style={{
                        borderBottom: '1px solid var(--theme-component-border, #bfbfbf)',
                        background: 'rgba(255,255,255,0.2)',
                      }}
                    >
                      <td
                        style={{
                          padding: '10px 12px',
                          fontWeight: 800,
                          color: 'var(--gray-900)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{tierBadge.icon}</span>
                          <span>{emp.full_name || 'Staff Member'}</span>
                        </div>
                        {emp.staff_code && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--gray-500)',
                              display: 'block',
                            }}
                          >
                            {emp.staff_code}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: 'var(--theme-bg, #F6F1F1)',
                            border: BORDER,
                            color: tierBadge.badgeColor,
                          }}
                        >
                          {tierBadge.short}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--gray-800)' }}>
                        {deptObj?.name || 'City-wide'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--gray-700)' }}>
                        {emp.ward_number ? `Ward ${emp.ward_number}` : 'All Wards'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 800 }}>
                        {emp.assignedCount}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontWeight: 800,
                          color: '#15803d',
                        }}
                      >
                        {emp.solvedCount}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontWeight: 800,
                          color: 'var(--status-pending)',
                        }}
                      >
                        {emp.pendingCount}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 60,
                              height: 6,
                              borderRadius: 3,
                              background: 'var(--theme-component-border, #bfbfbf)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${emp.rate}%`,
                                height: '100%',
                                background:
                                  emp.rate >= 75
                                    ? '#15803d'
                                    : emp.rate >= 40
                                    ? '#b45309'
                                    : '#991b1b',
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.74rem' }}>
                            {emp.rate}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {emp.phone ? (
                          <a
                            href={`tel:${emp.phone}`}
                            style={{
                              color: PRIMARY,
                              fontWeight: 700,
                              textDecoration: 'none',
                              fontSize: '0.76rem',
                            }}
                          >
                            📞 {emp.phone}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--gray-400)' }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: REGISTERED WARDS & AREA COVERAGE ── */}
      {activeTab === 'wards' && (
        <div
          style={{
            ...card,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 900,
                color: 'var(--gray-900)',
              }}
            >
              🗺️ Registered Municipal Wards & Geographic Coverage
            </h3>
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '0.76rem',
                color: 'var(--gray-600)',
              }}
            >
              Ward breakdown of complaints, assigned area officers, and active field supervisors.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {wardMetrics.slice(0, 36).map((w) => {
              const wardObj = wardsList.find((x) => String(x.ward_number) === w.ward);
              return (
                <div
                  key={w.ward}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.4)',
                    border: BORDER,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <b style={{ fontSize: '0.9rem', color: PRIMARY }}>
                      Ward {w.ward}
                      {wardObj && (
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: 'var(--gray-700)',
                            marginLeft: 6,
                          }}
                        >
                          · {wardObj.name}
                        </span>
                      )}
                    </b>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: 'var(--gray-700)',
                      }}
                    >
                      Total: {w.total}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.74rem',
                    }}
                  >
                    <span style={{ color: '#15803d' }}>Resolved: {w.resolved}</span>
                    <span style={{ color: 'var(--status-pending)' }}>Pending: {w.pending}</span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--gray-600)',
                      marginTop: 4,
                    }}
                  >
                    Officers Assigned: <b>{w.officers.length}</b>
                    {w.officers.length > 0 && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.68rem',
                          color: 'var(--gray-700)',
                        }}
                      >
                        {w.officers.map((o) => o.full_name).join(', ')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('ward-manager');
                    }}
                    style={{
                      ...outlineBtn,
                      marginTop: 6,
                      padding: '5px 10px',
                      fontSize: '0.72rem',
                      justifyContent: 'center',
                    }}
                  >
                    Manage Ward
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 5: DEPARTMENTS DIRECTORY ── */}
      {activeTab === 'departments' && (
        <div
          style={{
            ...card,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 900,
                color: 'var(--gray-900)',
              }}
            >
              🏢 Municipal Departments & Operational Head Directory
            </h3>
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '0.76rem',
                color: 'var(--gray-600)',
              }}
            >
              Complete list of municipal departments with designated department heads.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {visibleDepartments.map((d) => {
              const deptComps = scopedComplaints.filter((c) => c.department_id === d.id);
              const open = deptComps.filter((c) => !isDone(c.status)).length;
              const head = headOf(d.id);
              const isSelected = deptFilter === d.id;

              return (
                <div
                  key={d.id}
                  onClick={() => {
                    if (isDeputyOrHigher) {
                      setDeptFilter(isSelected ? 'all' : d.id);
                      setActiveTab('complaints');
                    }
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: isSelected
                      ? 'var(--theme-bg, #F6F1F1)'
                      : 'rgba(255,255,255,0.4)',
                    border: isSelected ? `2px solid ${PRIMARY}` : BORDER,
                    cursor: isDeputyOrHigher ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.4rem' }}>{d.icon}</span>
                    <b style={{ fontSize: '0.95rem', color: 'var(--gray-900)' }}>{d.name}</b>
                  </div>
                  <div
                    style={{
                      fontSize: '0.76rem',
                      color: 'var(--gray-700)',
                      margin: '4px 0',
                    }}
                  >
                    Head: <b>{head?.full_name || 'Not assigned'}</b>
                    {head?.phone && <span style={{ display: 'block' }}>📞 {head.phone}</span>}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.74rem',
                    }}
                  >
                    <span>
                      Total Complaints: <b>{deptComps.length}</b>
                    </span>
                    <span style={{ color: 'var(--status-pending)' }}>
                      Open: <b>{open}</b>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 6: WARD REGISTRATION ── */}
      {activeTab === 'ward-manager' && <WardManagement />}

      {/* ── TAB 7: LOCATION-BASED COMPLAINT FILTER ── */}
      {activeTab === 'location-viewer' && (
        <LocationComplaintFilter
          wards={wardsList}
          areas={areasList}
          onComplaintsChange={() => {
            /* optional: cache the list if needed */
          }}
          onAllocate={handleAllocateFromLocationFilter}
        />
      )}

      {/* ── Details Inspector Modal ── */}
      {detail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetail(null);
          }}
        >
          <div
            style={{
              ...card,
              borderRadius: 'var(--radius-xl, 16px)',
              width: '100%',
              maxWidth: 560,
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                background:
                  'var(--header-gradient, linear-gradient(135deg, #0E526F, #146C94, #0E526F))',
                padding: '16px 20px',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Ticket #{detail.ticket_number}
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', opacity: 0.9 }}>
                  {detail.department?.name || 'Municipal'} Department
                  {(() => {
                    const w = wardsList.find((x) => x.id === detail.ward_id);
                    return w ? ` · Ward ${w.ward_number}` : '';
                  })()}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 5,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {detail.photo_url && (
                <img
                  src={detail.photo_url}
                  alt="Complaint Evidence"
                  style={{
                    width: '100%',
                    maxHeight: 240,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: BORDER,
                  }}
                />
              )}

              <div
                style={{
                  ...field,
                  lineHeight: 1.5,
                  background: 'var(--theme-bg, #F6F1F1)',
                }}
              >
                <b>Description:</b>
                <div style={{ marginTop: 4 }}>{detail.description}</div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  <b>Citizen:</b> {detail.citizen_name || 'Anonymous'}
                </div>
                <div>
                  <b>Phone:</b> {detail.citizen_phone || 'N/A'}
                </div>
                <div>
                  <b>Status:</b>{' '}
                  <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>
                    {detail.status}
                  </span>
                </div>
                <div>
                  <b>Registered:</b> {new Date(detail.created_at).toLocaleString()}
                </div>
                {detail.address && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <b>Address:</b> {detail.address}
                  </div>
                )}
                {detail.ward_id && (
                  <div>
                    <b>Ward:</b>{' '}
                    {wardsList.find((w) => w.id === detail.ward_id)
                      ? `Ward ${wardsList.find((w) => w.id === detail.ward_id)!.ward_number} · ${
                          wardsList.find((w) => w.id === detail.ward_id)!.name
                        }`
                      : '—'}
                  </div>
                )}
                {detail.area_id && (
                  <div>
                    <b>Area:</b>{' '}
                    {areasList.find((a) => a.id === detail.area_id)?.name || '—'}
                  </div>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <b>Assigned Officer:</b>{' '}
                  {detail.assigned_to
                    ? staffById[detail.assigned_to]?.full_name || 'Staff'
                    : 'Not assigned'}
                </div>
              </div>

              {detail.latitude != null && detail.longitude != null && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${detail.latitude},${detail.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #15803d, #16a34a)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                  }}
                >
                  <Compass size={14} /> Get Directions (Google Maps)
                </a>
              )}

              {canAllotComplaint(viewer, detail.department_id) && !isDone(detail.status) && (
                <button
                  onClick={() => {
                    setAllotting(detail);
                    setDetail(null);
                  }}
                  style={{
                    ...primaryBtn,
                    justifyContent: 'center',
                    padding: '10px 14px',
                    fontSize: '0.86rem',
                    marginTop: 8,
                  }}
                >
                  <Briefcase size={14} /> Allot / Reassign via Stepper
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4-Stage Hierarchical Cascading Allot Modal ── */}
      {allotting && (
        <AllotModal
          complaint={
            {
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
            } as AllotTarget
          }
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
