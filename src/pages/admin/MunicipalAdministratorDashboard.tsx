import { ArcLoader } from '../../components/common/ArcLoader';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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

export const MunicipalAdministratorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { assignComplaint } = useDeptComplaints('all');

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin', { replace: true });
  }, [user, authLoading, navigate]);

  const { departments, complaints, staff, wards, loading, error: dataError, fetchData } = useMunicipalData();



  const { viewer, myTier, isDeputyOrHigher, scopedComplaints, visibleDepartments } =
    useViewerScope(complaints, departments, wards);

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
    if (!ward || ward.center_latitude == null || ward.center_longitude == null) {
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
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <style>{`
        .municipal-desktop-view {
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-width: 1440px;
          margin: 0 auto;
          padding: 20px 24px;
        }
        .municipal-mobile-view {
          display: none;
        }
        .municipal-mobile-dock {
          display: none;
        }

        @media (max-width: 768px) {
          .municipal-desktop-view {
            display: none !important;
          }
          .municipal-mobile-view {
            display: flex !important;
            flex-direction: column;
            gap: 8px;
            padding: 8px 10px 58px;
          }
          .municipal-mobile-dock {
            display: flex !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 48px !important;
            background: rgba(255, 255, 255, 0.98) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border-top: 1px solid #e2e8f0 !important;
            z-index: 1000 !important;
            justify-content: space-around !important;
            align-items: center !important;
            box-shadow: 0 -4px 18px rgba(0, 0, 0, 0.07) !important;
          }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          1. DESKTOP RICH SINGLE-PAGE LAYOUT (as praised by user)
         ══════════════════════════════════════════════════════════ */}
      <div className="municipal-desktop-view">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <ArrowLeft size={14} /> Admin Command Center
          </button>
        </div>

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

        {activeTab === 'ward-manager' && <WardManager language="en" />}

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <button
                onClick={() => navigate('/admin/dashboard')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  borderRadius: 999,
                  padding: '3px 9px',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={11} /> Admin Command Center
              </button>
            </div>

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
                7 Modules
              </span>
            </div>

            {/* Clean 2-Column Modular App Tiles */}
            <NavigationTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              filteredCount={filtered.length}
              wardsCount={wards.length}
              mode="mobile-hub"
            />

            {/* Quick Executive Insights Banner */}
            <div
              onClick={() => setActiveTab('workload')}
              style={{
                marginTop: 8,
                padding: '7px 10px',
                borderRadius: 10,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(20, 108, 148, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#146C94', flexShrink: 0 }}>
                  <BarChart3 size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
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
                  background: '#ffffff',
                  border: '1.5px solid #146C94',
                  color: '#146C94',
                  borderRadius: 999,
                  padding: '4px 11px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(20, 108, 148, 0.12)',
                }}
              >
                <ArrowLeft size={13} /> Back to Hub
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                <span style={{ color: '#146C94', display: 'flex', alignItems: 'center' }}>
                  {getTabIcon(activeTab)}
                </span>
                <span>{getTabLabel(activeTab)}</span>
                {activeTab === 'complaints' && (
                  <span style={{ background: '#7c3aed', color: '#fff', borderRadius: 999, padding: '1px 5px', fontSize: '0.6rem', fontWeight: 900 }}>
                    {filtered.length}
                  </span>
                )}
                {activeTab === 'wards' && (
                  <span style={{ background: '#d97706', color: '#fff', borderRadius: 999, padding: '1px 5px', fontSize: '0.6rem', fontWeight: 900 }}>
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

              {activeTab === 'ward-manager' && <WardManager language="en" />}

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
            gap: 1,
            color: activeTab === 'overview' ? '#146C94' : '#94a3b8',
            fontSize: '0.6rem',
            fontWeight: activeTab === 'overview' ? 900 : 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <LayoutDashboard size={16} color={activeTab === 'overview' ? '#146C94' : '#94a3b8'} />
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
            gap: 1,
            position: 'relative',
            color: activeTab === 'complaints' ? '#7c3aed' : '#94a3b8',
            fontSize: '0.6rem',
            fontWeight: activeTab === 'complaints' ? 900 : 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <Briefcase size={16} color={activeTab === 'complaints' ? '#7c3aed' : '#94a3b8'} />
          <span>Tasks</span>
          {filtered.length > 0 && (
            <span
              style={{
                position: 'absolute', top: 1, right: 10,
                width: 5, height: 5, borderRadius: '50%', background: '#7c3aed',
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
            gap: 1,
            color: activeTab === 'wards' ? '#d97706' : '#94a3b8',
            fontSize: '0.6rem',
            fontWeight: activeTab === 'wards' ? 900 : 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <MapPin size={16} color={activeTab === 'wards' ? '#d97706' : '#94a3b8'} />
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
            gap: 1,
            color: activeTab === 'analytics' ? '#059669' : '#94a3b8',
            fontSize: '0.6rem',
            fontWeight: activeTab === 'analytics' ? 900 : 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <TrendingUp size={16} color={activeTab === 'analytics' ? '#059669' : '#94a3b8'} />
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
            gap: 1,
            color: activeTab === 'location-viewer' ? '#475569' : '#94a3b8',
            fontSize: '0.6rem',
            fontWeight: activeTab === 'location-viewer' ? 900 : 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <Compass size={16} color={activeTab === 'location-viewer' ? '#475569' : '#94a3b8'} />
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

export default MunicipalAdministratorDashboard;
