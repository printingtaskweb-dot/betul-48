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

import type { ComplaintRecord, ViewTab } from './municipal/types';

export const MunicipalAdministratorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { assignComplaint } = useDeptComplaints('all');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate('/admin', { replace: true });
  }, [user, authLoading, navigate]);

  // Data
  const { departments, complaints, staff, wards, loading, fetchData } = useMunicipalData();

  // Viewer / scope
  const { viewer, myTier, isDeputyOrHigher, scopedComplaints, visibleDepartments } =
    useViewerScope(complaints, departments);

  // UI state
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<ComplaintRecord | null>(null);
  const [allotting, setAllotting] = useState<ComplaintRecord | null>(null);

  // Lock dept filter for non-admin viewers
  useEffect(() => {
    if (!isDeputyOrHigher && profile?.linked_department_id) {
      setDeptFilter(profile.linked_department_id);
    }
  }, [isDeputyOrHigher, profile]);

  // Staff lookup
  const staffById = useMemo(() => {
    const m: Record<string, typeof staff[number]> = {};
    staff.forEach((s) => { m[s.id] = s; });
    return m;
  }, [staff]);

  // Filtered complaints
  const filtered = useMemo(() => {
    return scopedComplaints.filter((c) => {
      const okStatus =
        statusFilter === 'all' ||
        (statusFilter === 'resolved'
          ? c.status === 'resolved' || c.status === 'verified'
          : c.status === statusFilter);
      const okDept = deptFilter === 'all' || c.department_id === deptFilter;
      const okWard = wardFilter === 'all' || c.ward_id === wardFilter;
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
  }, [scopedComplaints, statusFilter, deptFilter, wardFilter, query, staffById]);

  // Metrics
  const metrics = useMunicipalMetrics({
    scopedComplaints, complaints, staff, wards,
    isDeputyOrHigher,
    linkedDeptId: profile?.linked_department_id,
  });

  // Radar
  const radar = useRadarScanner(scopedComplaints);

  const handleAllocateFromLocationFilter = (complaintId: string) => {
    const match = complaints.find((c) => c.id === complaintId);
    if (match) setAllotting(match);
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1440, margin: '0 auto' }}>
      <ExecutiveHeader myTier={myTier} loading={loading} onRefresh={fetchData} />

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
          lat={radar.lat} setLat={radar.setLat}
          lon={radar.lon} setLon={radar.setLon}
          radius={radar.radius} setRadius={radar.setRadius}
          radarLoading={radar.radarLoading}
          nearby={radar.nearby}
          radarMsg={radar.radarMsg}
          onScan={radar.runRadar}
          onClose={() => radar.setShowRadar(false)}
        />
      )}

      {activeTab === 'overview' && (
        <OverviewTab
          visibleDepartments={visibleDepartments}
          scopedComplaints={scopedComplaints}
          staff={staff}
          deptFilter={deptFilter}
          setDeptFilter={setDeptFilter}
          isDeputyOrHigher={isDeputyOrHigher}
          slaMetrics={metrics.slaMetrics}
        />
      )}

      {activeTab === 'complaints' && (
        <ComplaintsTab
          filtered={filtered}
          wards={wards}
          staffById={staffById}
          viewer={viewer}
          onShowDetail={setDetail}
          onAllot={setAllotting}
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
          onManageWards={() => setActiveTab('ward-manager')}
          onViewTasks={(wardId) => { setWardFilter(wardId); setActiveTab('complaints'); }}
        />
      )}

      {activeTab === 'departments' && (
        <DepartmentsTab
          visibleDepartments={visibleDepartments}
          scopedComplaints={scopedComplaints}
          staff={staff}
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
          onClose={() => setAllotting(null)}
          onAllotted={fetchData}
          assignComplaint={assignComplaint}
        />
      )}
    </div>
  );
};

export default MunicipalAdministratorDashboard;
