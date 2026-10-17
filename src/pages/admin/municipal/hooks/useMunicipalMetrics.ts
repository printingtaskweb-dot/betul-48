import { useMemo } from 'react';
import { getTier } from '../../../../lib/hierarchy';
import type { StaffMember } from '../../../../lib/hierarchy';
import type { Ward } from '../../../../lib/wardTypes';
import type {
  ComplaintRecord,
  DepartmentRow,
  DeptMetric,
  AreaHotspot,
} from '../types';
import { isDone } from '../utils/statusStyle';
import { isComplaintInWard } from '../utils/complaintWard';

interface Args {
  scopedComplaints: ComplaintRecord[];
  complaints: ComplaintRecord[];
  staff: StaffMember[];
  wards: Ward[];
  departments: DepartmentRow[];
  isDeputyOrHigher: boolean;
  linkedDeptId: string | null | undefined;
}

export const useMunicipalMetrics = ({
  scopedComplaints,
  complaints,
  staff,
  wards,
  departments,
  isDeputyOrHigher,
  linkedDeptId,
}: Args) => {
  const total = scopedComplaints.length;
  const pending = scopedComplaints.filter((c) => c.status === 'pending').length;
  const inProgress = scopedComplaints.filter((c) => c.status === 'in_progress').length;
  const resolved = scopedComplaints.filter((c) => isDone(c.status)).length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const slaMetrics = useMemo(() => {
    let fastCount = 0, standardCount = 0, overdueCount = 0;
    const now = Date.now();
    scopedComplaints.forEach((c) => {
      const diffHours = (now - new Date(c.created_at).getTime()) / 3_600_000;
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

  /* ── Per-department bar chart metrics ── */
  const deptMetrics: DeptMetric[] = useMemo(() => {
    const now = Date.now();
    return departments
      .map((dept) => {
        const comps = scopedComplaints.filter((c) => c.department_id === dept.id);
        const res = comps.filter((c) => isDone(c.status)).length;
        const prog = comps.filter((c) => c.status === 'in_progress').length;
        const pend = comps.filter((c) => c.status === 'pending').length;
        const overdue = comps.filter((c) => {
          if (isDone(c.status)) return false;
          return (now - new Date(c.created_at).getTime()) / 3_600_000 > 72;
        }).length;
        const head =
          staff.find(
            (s) =>
              s.linked_department_id === dept.id &&
              getTier(s.role, s.hierarchy_code, s.authority_role) === 2
          ) || null;
        return {
          dept,
          total: comps.length,
          resolved: res,
          inProgress: prog,
          pending: pend,
          overdue,
          rate: comps.length > 0 ? Math.round((res / comps.length) * 100) : 0,
          head: head
            ? {
                id: head.id,
                full_name: head.full_name,
                phone: head.phone,
                role: head.role,
                hierarchy_code: head.hierarchy_code,
                authority_role: head.authority_role,
                linked_department_id: head.linked_department_id,
                ward_number: head.ward_number,
              }
            : null,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [departments, scopedComplaints, staff]);

  /* ── Area / ward hotspots ── */
  const areaHotspots: AreaHotspot[] = useMemo(() => {
    const wardById: Record<string, Ward> = {};
    wards.forEach((w) => (wardById[w.id] = w));

    const buckets: Record<string, AreaHotspot & { deptCount: Record<string, number> }> = {};

    const ensureBucket = (
      key: string,
      label: string,
      ward?: Ward
    ): AreaHotspot & { deptCount: Record<string, number> } => {
      if (!buckets[key]) {
        buckets[key] = {
          key,
          label,
          total: 0,
          resolved: 0,
          pending: 0,
          topDepartment: null,
          center_lat: ward?.center_latitude ?? null,
          center_lon: ward?.center_longitude ?? null,
          radius_m: ward?.radius_meters ?? null,
          deptCount: {},
        };
      }
      return buckets[key];
    };

    scopedComplaints.forEach((c) => {
      let key = 'unassigned';
      let label = 'Unassigned / Other';
      let ward: Ward | undefined;

      if (c.ward_id && wardById[c.ward_id]) {
        ward = wardById[c.ward_id];
        key = `ward-${ward.id}`;
        label = `Ward ${ward.ward_number} · ${ward.name}`;
      } else {
        const m =
          c.address?.match(/ward\s*(\d+)/i) || c.description.match(/ward\s*(\d+)/i);
        if (m) {
          const w = wards.find((x) => String(x.ward_number) === m[1]);
          if (w) {
            ward = w;
            key = `ward-${w.id}`;
            label = `Ward ${w.ward_number} · ${w.name}`;
          }
        }
      }

      const b = ensureBucket(key, label, ward);
      b.total++;
      if (isDone(c.status)) b.resolved++;
      else b.pending++;
      b.deptCount[c.department_id] = (b.deptCount[c.department_id] || 0) + 1;
    });

    return Object.values(buckets)
      .map((b) => {
        let topDept: string | null = null;
        let topCount = 0;
        Object.entries(b.deptCount).forEach(([deptId, n]) => {
          if (n > topCount) {
            topCount = n;
            topDept = departments.find((d) => d.id === deptId)?.name || null;
          }
        });
        const { deptCount, ...rest } = b;
        return { ...rest, topDepartment: topDept };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [scopedComplaints, wards, departments]);

  const employeePerformance = useMemo(() => {
    return staff
      .filter((s) => (isDeputyOrHigher ? true : s.linked_department_id === linkedDeptId))
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
  }, [staff, complaints, isDeputyOrHigher, linkedDeptId]);

  const wardMetrics = useMemo(() => {
    const byId: Record<string, {
      ward: Ward; total: number; resolved: number;
      pending: number; inProgress: number; officers: StaffMember[];
    }> = {};
    wards.forEach((w) => {
      byId[w.id] = { ward: w, total: 0, resolved: 0, pending: 0, inProgress: 0, officers: [] };
    });
    scopedComplaints.forEach((c) => {
      wards.filter((ward) => isComplaintInWard(c, ward)).forEach((ward) => {
        byId[ward.id].total++;
        if (isDone(c.status)) byId[ward.id].resolved++;
        else if (c.status === 'in_progress') byId[ward.id].inProgress++;
        else byId[ward.id].pending++;
      });
    });

    staff.forEach((s) => {
      const ward = wards.find((item) => item.id === s.assigned_ward_id)
        || wards.find((item) => String(item.ward_number) === s.ward_number);
      if (ward) byId[ward.id].officers.push(s);
    });

    return Object.values(byId).sort(
      (a, b) => a.ward.ward_number - b.ward.ward_number
    );
  }, [scopedComplaints, staff, wards]);

  const unassignedWardComplaints = useMemo(() => {
    return scopedComplaints.filter((complaint) =>
      !wards.some((ward) => isComplaintInWard(complaint, ward))
    ).length;
  }, [scopedComplaints, wards]);

  return {
    total, pending, inProgress, resolved, resolutionRate,
    slaMetrics,
    deptMetrics,
    areaHotspots,
    employeePerformance,
    wardMetrics,
    unassignedWardComplaints,
  };
};
