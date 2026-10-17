import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDeptComplaints } from '../../hooks/useDeptComplaints';
import { AllotModal } from '../../components/dept/AllotModal';
import type { AllotTarget } from '../../components/dept/AllotModal';
import { WardManager } from '../../components/departments/WardManager';
import { LocationFilterPanel } from '../../components/departments/LocationFilterPanel';

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

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1440, margin: '0 auto' }}>
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

      {activeTab === 'overview' && (
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
              // Move on to the next complaint in the bulk list
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
