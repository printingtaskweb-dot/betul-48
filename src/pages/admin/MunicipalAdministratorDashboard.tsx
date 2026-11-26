import { ArcLoader } from '../../components/common/ArcLoader';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { RoleGuard } from '../../components/auth/RoleGuard';
import { useDeptComplaints } from '../../hooks/useDeptComplaints';
import { AllotModal } from '../../components/dept/AllotModal';
import type { AllotTarget } from '../../components/dept/AllotModal';
import { WardManager } from '../../components/departments/WardManager';
import { LocationFilterPanel } from '../../components/departments/LocationFilterPanel';
import {
  ArrowLeft,
  LayoutDashboard,
  Briefcase,
  MapPin,
  TrendingUp,
  Compass,
  Building2,
  Layers,
  BarChart3,
  ChevronRight,
  Landmark,
  LogOut,
} from 'lucide-react';

import { useMunicipalData } from './municipal/hooks/useMunicipalData';
import { useViewerScope } from './municipal/hooks/useViewerScope';
import { useRadarScanner } from './municipal/hooks/useRadarScanner';
import { useMunicipalMetrics } from './municipal/hooks/useMunicipalMetrics';

import { ExecutiveHeader } from './municipal/components/ExecutiveHeader';
import { KpiGrid } from './municipal/components/KpiGrid';
import { NavigationTabs } from './municipal/components/NavigationTabs';
import { FilterBar } from './municipal/components/FilterBar';
import { RadarPanel } from './municipal/components/RadarPanel';
import { OverviewTab } from './municipal/components/OverviewTab';
import { ComplaintsTab } from './municipal/components/ComplaintsTab';
import { EmployeeLeaderboardTab } from './municipal/components/EmployeeLeaderboardTab';
import { WardsTab } from './municipal/components/WardsTab';
import { DepartmentsTab } from './municipal/components/DepartmentsTab';
import { ComplaintDetailModal } from './municipal/components/ComplaintDetailModal';
import { isComplaintInWard } from './municipal/utils/complaintWard';

import type { AreaHotspot, ComplaintRecord, ViewTab } from './municipal/types';

interface MunicipalAdministratorDashboardProps {
  embedded?: boolean;
}

const MunicipalAdministratorDashboardContent: React.FC<MunicipalAdministratorDashboardProps> = ({
  embedded = false,
}) => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading: authLoading, signOut } = useAuth();
  const { assignComplaint } = useDeptComplaints('all');

  const canOpenAdminConsole = Boolean(
    isAdmin ||
    profile?.is_admin === true ||
    (profile?.role &&
      ['admin', 'platform_owner', 'super_admin'].includes(profile.role.toLowerCase()))
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const { departments, complaints, staff, wards, loading, error: dataError, fetchData } = useMunicipalData();

  const { viewer, myTier, isDeputyOrHigher, scopedComplaints, visibleDepartments } =
    useViewerScope(complaints, departments, wards);

  const canManageWards = Boolean(isAdmin || profile?.is_admin === true || myTier === 0);

  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<ComplaintRecord | null>(null);
  const [allotting, setAllotting] = useState<ComplaintRecord | null>(null);
  const [bulkIds, setBulkIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isDeputyOrHigher && profile?.linked_department_id) {
      setDeptFilter(profile.linked_department_id);
    }
  }, [isDeputyOrHigher, profile]);

  const staffById = useMemo(() => {
    const m: Record<string, typeof staff[number]> = {};
    staff.forEach((s) => { m[s.id] = s; });
    return m;
  }, [staff]);

  const nearbyWardComplaintIds = useMemo(() => {
    const ward = wards.find((item) => item.id === wardFilter);
    if (!ward) {
      return new Set<string>();
    }

    return new Set(
      scopedComplaints
        .filter((complaint) => isComplaintInWard(complaint, ward))
        .map((complaint) => complaint.id)
    );
  }, [scopedComplaints, wardFilter, wards]);

  const filtered = useMemo(() => {
    return scopedComplaints.filter((c) => {
      const okStatus =
        statusFilter === 'all' ||
        (statusFilter === 'resolved'
          ? c.status === 'resolved' || c.status === 'verified'
          : c.status === statusFilter);
      const okDept = deptFilter === 'all' || c.department_id === deptFilter;
      const okWard =
        wardFilter === 'all' ||
        c.ward_id === wardFilter ||
        nearbyWardComplaintIds.has(c.id);
      const q = query.toLowerCase().trim();
      const okQuery =
        !q ||
        c.ticket_number.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        !!c.address?.toLowerCase().includes(q) ||
        !!c.citizen_name?.toLowerCase().includes(q) ||
        !!c.citizen_phone?.includes(q) ||
        (c.assigned_to && staffById[c.assigned_to]?.full_name?.toLowerCase().includes(q));
      return okStatus && okDept && okWard && okQuery;
    });
  }, [scopedComplaints, statusFilter, deptFilter, wardFilter, query, staffById, nearbyWardComplaintIds]);

  const metrics = useMunicipalMetrics({
    scopedComplaints,
    complaints,
    staff,
    wards,
    departments: visibleDepartments,
    isDeputyOrHigher,
    linkedDeptId: profile?.linked_department_id,
  });

  const radar = useRadarScanner(scopedComplaints, wards);

  const handleAllocateFromLocationFilter = (complaintId: string) => {
    const match = complaints.find((c) => c.id === complaintId);
    if (match) setAllotting(match);
  };

  const handleBulkAllot = (ids: string[]) => {
    if (ids.length === 0) return;
    // Open the first complaint in AllotModal; caller can then continue allotting individually.
    // Alternatively, you can pass ids to AllotModal via a wrapper (future enhancement).
    const first = complaints.find((c) => c.id === ids[0]);
    if (first) {
      setBulkIds(ids);
      setAllotting(first);
    }
  };

  const handleAreaClick = (area: AreaHotspot) => {
    // Try to find a matching ward to filter
    const match = wards.find((w) => `ward-${w.id}` === area.key);
    if (match) {
      setWardFilter(match.id);
      setActiveTab('complaints');
    }
  };

  const handleViewWardTasks = (wardId: string) => {
    setStatusFilter('all');
    setQuery('');
    if (isDeputyOrHigher) setDeptFilter('all');
    setWardFilter(wardId);
    setActiveTab('complaints');
  };

  const getTabLabel = (tab: ViewTab) => {
    switch (tab) {
      case 'complaints': return 'Task Allocation';
      case 'wards': return 'Wards & Zones';
      case 'analytics': return 'Employee Leaderboard';
      case 'departments': return 'Departments';
      case 'ward-manager': return 'Ward Registration';
      case 'location-viewer': return 'Location Radar';
      case 'workload': return 'Executive Overview';
      case 'overview':
      default: return 'Executive Overview';
    }
  };

  const getTabIcon = (tab: ViewTab) => {
    switch (tab) {
      case 'complaints': return <Briefcase size={16} />;
      case 'wards': return <MapPin size={16} />;
      case 'analytics': return <TrendingUp size={16} />;
      case 'departments': return <Building2 size={16} />;
      case 'ward-manager': return <Layers size={16} />;
      case 'location-viewer': return <Compass size={16} />;
      case 'workload': return <BarChart3 size={16} />;
      case 'overview':
      default: return <BarChart3 size={16} />;
    }
  };

  if (authLoading || (loading && complaints.length === 0 && departments.length === 0)) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <ArcLoader
          mode="inline"
          status="Municipal Executive Dashboard"
          subtitle="Loading real-time SLA governance, telemetry & ward mapping…"
          theme="portal"
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', background: '#faf9f6', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .municipal-desktop-view {
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
          padding: 20px 24px 32px;
        }
        .municipal-mobile-view {
          display: none;
        }
        .municipal-mobile-dock {
          display: none;
        }
        .municipal-user-pill {
          display: inline-flex;
        }
        @media (max-width: 640px) {
          .municipal-user-pill {
            display: none !important;
          }
          .municipal-header-brand-sub {
            display: none !important;
          }
        }

        @media (max-width: 768px) {
          .municipal-desktop-view {
            display: none !important;
          }
          .municipal-mobile-view {
            display: flex !important;
            flex-direction: column;
            gap: 8px;
            padding: 8px 10px 62px;
          }
          .municipal-mobile-dock {
            display: flex !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 52px !important;
            background: rgba(255, 255, 255, 0.96) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border-top: 1px solid #e6e2d8 !important;
            z-index: 1000 !important;
            justify-content: space-around !important;
            align-items: center !important;
            box-shadow: 0 -4px 18px rgba(15, 37, 49, 0.06) !important;
          }
        }
      `}</style>

      {/* ── Betul 311 Sticky Civic Top Header (Standalone) ── */}
      {!embedded && (
        <header
          style={{
            background: 'rgba(250, 249, 246, 0.96)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid #e6e2d8',
            padding: '10px clamp(12px, 3vw, 24px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #146C94, #0E526F)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(20, 108, 148, 0.25)',
                flexShrink: 0,
              }}
            >
              <Landmark size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f2531', letterSpacing: '-0.02em' }}>
                  Betul 311
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '1px 7px',
                    borderRadius: 6,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Municipal Console
                </span>
              </div>
              <p className="municipal-header-brand-sub" style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                Nagar Palika Parishad Betul
              </p>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div
              className="municipal-user-pill"
              style={{
                alignItems: 'center',
                gap: 7,
                background: '#ffffff',
                border: '1px solid #e6e2d8',
                borderRadius: 999,
                padding: '4px 10px',
                fontSize: '0.74rem',
                color: '#334155',
                fontWeight: 600,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span>{profile?.full_name || user?.email || 'Municipal Officer'}</span>
            </div>

            {canOpenAdminConsole && (
              <button
                onClick={() => navigate('/admin/dashboard')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #b7dae4',
                  background: '#f0f7f9',
                  color: '#146C94',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <ArrowLeft size={13} /> Admin Console
              </button>
            )}

            <button
              onClick={() => navigate('/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 11px',
                borderRadius: 8,
                border: '1px solid #e6e2d8',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Exit
            </button>

            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 11px',
                borderRadius: 8,
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#dc2626',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </header>
      )}

      {/* ══════════════════════════════════════════════════════════
          1. DESKTOP EDITORIAL LAYOUT
         ══════════════════════════════════════════════════════════ */}
      <div className="municipal-desktop-view" style={embedded ? { padding: 0 } : undefined}>
        <ExecutiveHeader myTier={myTier} loading={loading} onRefresh={fetchData} />

        {dataError && (
          <div role="alert" style={{ padding: '10px 14px', borderRadius: 8, background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.82rem' }}>
            Some dashboard data could not be loaded: {dataError}. Check Supabase table access and RLS policies.
          </div>
        )}

        <KpiGrid
          total={metrics.total}
          pending={metrics.pending}
          inProgress={metrics.inProgress}
          resolved={metrics.resolved}
          resolutionRate={metrics.resolutionRate}
          slaOverdue={metrics.slaMetrics.overdueCount}
          slaCompliant={metrics.slaMetrics.fastCount + metrics.slaMetrics.standardCount}
          deptCount={visibleDepartments.length}
          wardCount={wards.length}
        />

        <NavigationTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          filteredCount={filtered.length}
          wardsCount={wards.length}
          canManageWards={canManageWards}
          mode="desktop"
        />

        <FilterBar
          query={query} setQuery={setQuery}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          deptFilter={deptFilter} setDeptFilter={setDeptFilter}
          wardFilter={wardFilter} setWardFilter={setWardFilter}
          departments={departments}
          wards={wards}
          isDeputyOrHigher={isDeputyOrHigher}
          showRadar={radar.showRadar}
          onToggleRadar={() => radar.setShowRadar(!radar.showRadar)}
        />

        {radar.showRadar && (
          <RadarPanel
            wards={wards}
            wardId={radar.wardId}
            setWardId={radar.setWardId}
            nearby={radar.nearby}
            radarMsg={radar.radarMsg}
            onScan={radar.runRadar}
            onClose={() => radar.setShowRadar(false)}
            selectedWard={radar.selectedWard}
          />
        )}

        {(activeTab === 'overview' || activeTab === 'workload') && (
          <OverviewTab
            deptMetrics={metrics.deptMetrics}
            areaHotspots={metrics.areaHotspots}
            slaMetrics={metrics.slaMetrics}
            onDeptClick={(deptId) => { setDeptFilter(deptId); setActiveTab('complaints'); }}
            onAreaClick={handleAreaClick}
            isDeputyOrHigher={isDeputyOrHigher}
          />
        )}

        {activeTab === 'complaints' && (
          <ComplaintsTab
            filtered={filtered}
            wards={wards}
            departments={departments}
            staffById={staffById}
            staff={staff}
            viewer={viewer}
            onShowDetail={setDetail}
            onAllot={setAllotting}
            onBulkAllot={handleBulkAllot}
          />
        )}

        {activeTab === 'analytics' && (
          <EmployeeLeaderboardTab
            employees={metrics.employeePerformance}
            departments={departments}
          />
        )}

        {activeTab === 'wards' && (
          <WardsTab
            wards={wards}
            wardMetrics={metrics.wardMetrics}
            unassignedWardComplaints={metrics.unassignedWardComplaints}
            scopedComplaints={scopedComplaints}
            staff={staff}
            departments={departments}
            canManageWardAssignments={myTier <= 2}
            canManageWards={canManageWards}
            assignmentDepartmentId={myTier <= 1 ? null : profile?.linked_department_id || null}
            onAssignmentSaved={fetchData}
            onManageWards={() => setActiveTab('ward-manager')}
            onViewTasks={handleViewWardTasks}
          />
        )}

        {activeTab === 'departments' && (
          <DepartmentsTab
            deptMetrics={metrics.deptMetrics}
            deptFilter={deptFilter}
            setDeptFilter={setDeptFilter}
            setActiveTab={setActiveTab}
            isDeputyOrHigher={isDeputyOrHigher}
          />
        )}

        {activeTab === 'ward-manager' && canManageWards && <WardManager language="en" />}

        {activeTab === 'location-viewer' && (
          <LocationFilterPanel
            complaints={scopedComplaints as unknown as any}
            wards={wards}
            language="en"
            onAllocate={(c: any) => handleAllocateFromLocationFilter(c.id)}
          />
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. MOBILE MODULAR SCREEN-BY-SCREEN ARCHITECTURE
         ══════════════════════════════════════════════════════════ */}
      <div className="municipal-mobile-view">
        {activeTab === 'overview' ? (
          /* ── 2A. MOBILE HUB & SUMMARY VIEW ── */
          <div>
            <ExecutiveHeader myTier={myTier} loading={loading} onRefresh={fetchData} />

            {dataError && (
              <div role="alert" style={{ padding: '6px 10px', borderRadius: 6, background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.7rem', margin: '6px 0' }}>
                {dataError}
              </div>
            )}

            {/* Compact Mini-KPI Matrix Strip (Minimal Vertical Footprint) */}
            <div style={{ marginTop: 6, marginBottom: 8 }}>
              <KpiGrid
                total={metrics.total}
                pending={metrics.pending}
                inProgress={metrics.inProgress}
                resolved={metrics.resolved}
                resolutionRate={metrics.resolutionRate}
                slaOverdue={metrics.slaMetrics.overdueCount}
                slaCompliant={metrics.slaMetrics.fastCount + metrics.slaMetrics.standardCount}
                deptCount={visibleDepartments.length}
                wardCount={wards.length}
                compactMobileOnly={true}
              />
            </div>

            {/* Section Header: Feature Selection */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px', marginBottom: 6 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Municipal Features & Modules
              </span>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#146C94' }}>
                {canManageWards ? '7 Modules' : '6 Modules'}
              </span>
            </div>

            {/* Clean 2-Column Modular App Tiles */}
            <NavigationTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              filteredCount={filtered.length}
              wardsCount={wards.length}
              canManageWards={canManageWards}
              mode="mobile-hub"
            />

            {/* Quick Executive Insights Banner */}
            <div
              onClick={() => setActiveTab('workload')}
              style={{
                marginTop: 8,
                padding: '9px 12px',
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid #e6e2d8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(15, 37, 49, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0f7f9', border: '1px solid #b7dae4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#146C94', flexShrink: 0 }}>
                  <BarChart3 size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f2531' }}>
                    Executive Resolution & SLA Charts
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                    {metrics.slaMetrics.overdueCount > 0 ? `${metrics.slaMetrics.overdueCount} SLA overdue • ` : ''}Tap to open detailed department workload & hotspots
                  </div>
                </div>
              </div>
              <ChevronRight size={14} color="#94a3b8" />
            </div>
          </div>
        ) : (
          /* ── 2B. DEDICATED FULL-SCREEN FEATURE VIEW ── */
          <div>
            {/* Top Navigation Bar with Back Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#f0f7f9',
                  border: '1px solid #b7dae4',
                  color: '#146C94',
                  borderRadius: 999,
                  padding: '4px 11px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(15, 37, 49, 0.04)',
                }}
              >
                <ArrowLeft size={13} /> Back to Hub
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 800, color: '#0f2531' }}>
                <span style={{ color: '#146C94', display: 'flex', alignItems: 'center' }}>
                  {getTabIcon(activeTab)}
                </span>
                <span>{getTabLabel(activeTab)}</span>
                {activeTab === 'complaints' && (
                  <span style={{ background: '#146C94', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: '0.6rem', fontWeight: 900 }}>
                    {filtered.length}
                  </span>
                )}
                {activeTab === 'wards' && (
                  <span style={{ background: '#146C94', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: '0.6rem', fontWeight: 900 }}>
                    {wards.length}
                  </span>
                )}
              </div>
            </div>

            {/* Filter Bar with Filter Toggle (for Complaints & Task Allocation) */}
            {activeTab === 'complaints' && (
              <div style={{ marginBottom: 10 }}>
                <FilterBar
                  query={query} setQuery={setQuery}
                  statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                  deptFilter={deptFilter} setDeptFilter={setDeptFilter}
                  wardFilter={wardFilter} setWardFilter={setWardFilter}
                  departments={departments}
                  wards={wards}
                  isDeputyOrHigher={isDeputyOrHigher}
                  showRadar={radar.showRadar}
                  onToggleRadar={() => radar.setShowRadar(!radar.showRadar)}
                />
              </div>
            )}

            {radar.showRadar && (
              <div style={{ marginBottom: 10 }}>
                <RadarPanel
                  wards={wards}
                  wardId={radar.wardId}
                  setWardId={radar.setWardId}
                  nearby={radar.nearby}
                  radarMsg={radar.radarMsg}
                  onScan={radar.runRadar}
                  onClose={() => radar.setShowRadar(false)}
                  selectedWard={radar.selectedWard}
                />
              </div>
            )}

            {/* Dedicated Feature Content (No Clutter, Full Screen Focus) */}
            <div>
              {activeTab === 'workload' && (
                <OverviewTab
                  deptMetrics={metrics.deptMetrics}
                  areaHotspots={metrics.areaHotspots}
                  slaMetrics={metrics.slaMetrics}
                  onDeptClick={(deptId) => { setDeptFilter(deptId); setActiveTab('complaints'); }}
                  onAreaClick={handleAreaClick}
                  isDeputyOrHigher={isDeputyOrHigher}
                />
              )}

              {activeTab === 'complaints' && (
                <ComplaintsTab
                  filtered={filtered}
                  wards={wards}
                  departments={departments}
                  staffById={staffById}
                  staff={staff}
                  viewer={viewer}
                  onShowDetail={setDetail}
                  onAllot={setAllotting}
                  onBulkAllot={handleBulkAllot}
                />
              )}

              {activeTab === 'analytics' && (
                <EmployeeLeaderboardTab
                  employees={metrics.employeePerformance}
                  departments={departments}
                />
              )}

              {activeTab === 'wards' && (
                <WardsTab
                  wards={wards}
                  wardMetrics={metrics.wardMetrics}
                  unassignedWardComplaints={metrics.unassignedWardComplaints}
                  scopedComplaints={scopedComplaints}
                  staff={staff}
                  departments={departments}
                  canManageWardAssignments={myTier <= 2}
                  canManageWards={canManageWards}
                  assignmentDepartmentId={myTier <= 1 ? null : profile?.linked_department_id || null}
                  onAssignmentSaved={fetchData}
                  onManageWards={() => setActiveTab('ward-manager')}
                  onViewTasks={handleViewWardTasks}
                />
              )}

              {activeTab === 'departments' && (
                <DepartmentsTab
                  deptMetrics={metrics.deptMetrics}
                  deptFilter={deptFilter}
                  setDeptFilter={setDeptFilter}
                  setActiveTab={setActiveTab}
                  isDeputyOrHigher={isDeputyOrHigher}
                />
              )}

              {activeTab === 'ward-manager' && canManageWards && <WardManager language="en" />}

              {activeTab === 'location-viewer' && (
                <LocationFilterPanel
                  complaints={scopedComplaints as unknown as any}
                  wards={wards}
                  language="en"
                  onAllocate={(c: any) => handleAllocateFromLocationFilter(c.id)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          3. FIXED MOBILE BOTTOM DOCK
         ══════════════════════════════════════════════════════════ */}
      <nav className="municipal-mobile-dock">
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'overview' ? '#146C94' : '#64748b',
            fontSize: '0.6rem',
            fontWeight: activeTab === 'overview' ? 800 : 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <LayoutDashboard size={16} color={activeTab === 'overview' ? '#146C94' : '#64748b'} />
          <span>Hub</span>
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            position: 'relative',
            color: activeTab === 'complaints' ? '#146C94' : '#64748b',
            fontSize: '0.6rem',
            fontWeight: activeTab === 'complaints' ? 800 : 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <Briefcase size={16} color={activeTab === 'complaints' ? '#146C94' : '#64748b'} />
          <span>Tasks</span>
          {filtered.length > 0 && (
            <span
              style={{
                position: 'absolute', top: 1, right: 10,
                width: 5, height: 5, borderRadius: '50%', background: '#146C94',
              }}
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('wards')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'wards' ? '#146C94' : '#64748b',
            fontSize: '0.6rem',
            fontWeight: activeTab === 'wards' ? 800 : 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <MapPin size={16} color={activeTab === 'wards' ? '#146C94' : '#64748b'} />
          <span>Wards</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'analytics' ? '#146C94' : '#64748b',
            fontSize: '0.6rem',
            fontWeight: activeTab === 'analytics' ? 800 : 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <TrendingUp size={16} color={activeTab === 'analytics' ? '#146C94' : '#64748b'} />
          <span>Team</span>
        </button>

        <button
          onClick={() => setActiveTab('location-viewer')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            color: activeTab === 'location-viewer' ? '#146C94' : '#64748b',
            fontSize: '0.6rem',
            fontWeight: activeTab === 'location-viewer' ? 800 : 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <Compass size={16} color={activeTab === 'location-viewer' ? '#146C94' : '#64748b'} />
          <span>Radar</span>
        </button>
      </nav>

      {/* ── Modals ── */}
      {detail && (
        <ComplaintDetailModal
          detail={detail}
          wards={wards}
          staffById={staffById}
          viewer={viewer}
          onClose={() => setDetail(null)}
          onAllot={() => { setAllotting(detail); setDetail(null); }}
        />
      )}

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
          onClose={() => { setAllotting(null); setBulkIds(null); }}
          onAllotted={async () => {
            await fetchData();
            if (bulkIds && bulkIds.length > 1) {
              const remaining = bulkIds.slice(1);
              const next = complaints.find((c) => c.id === remaining[0]);
              if (next) {
                setBulkIds(remaining);
                setAllotting(next);
                return;
              }
            }
            setBulkIds(null);
            setAllotting(null);
          }}
          assignComplaint={assignComplaint}
        />
      )}
    </div>
  );
};

export const MunicipalAdministratorDashboard: React.FC<MunicipalAdministratorDashboardProps> = ({
  embedded = false,
}) => {
  if (embedded) {
    return <MunicipalAdministratorDashboardContent embedded />;
  }

  return (
    <RoleGuard
      allowedRoles={[
        'admin',
        'municipal_administrator',
        'municipal_commissioner',
        'commissioner',
        'deputy_commissioner',
        'platform_owner',
        'super_admin',
      ]}
      allowAdminFlag
      unauthenticatedRedirect="/dept/login"
      loadingTitle="Municipal Console"
    >
      <MunicipalAdministratorDashboardContent />
    </RoleGuard>
  );
};

export default MunicipalAdministratorDashboard;
