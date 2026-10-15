import { useMemo } from 'react';
import { getTier } from '../../../../lib/hierarchy';
import type { StaffMember } from '../../../../lib/hierarchy';
import type { Ward } from '../../../../lib/wardTypes';
import type { ComplaintRecord } from '../types';
import { isDone } from '../utils/statusStyle';

interface Args {
  scopedComplaints: ComplaintRecord[];
  complaints: ComplaintRecord[];
  staff: StaffMember[];
  wards: Ward[];
  isDeputyOrHigher: boolean;
  linkedDeptId: string | null | undefined;
}

export const useMunicipalMetrics = ({
  scopedComplaints,
  complaints,
  staff,
  wards,
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
    const wardNumToId: Record<string, string> = {};
    wards.forEach((w) => { wardNumToId[String(w.ward_number)] = w.id; });

    scopedComplaints.forEach((c) => {
      let key: string | null = null;
      if (c.ward_id && byId[c.ward_id]) key = c.ward_id;
      else {
        const m =
          c.address?.match(/ward\s*(\d+)/i) || c.description.match(/ward\s*(\d+)/i);
        if (m && wardNumToId[m[1]]) key = wardNumToId[m[1]];
      }
      if (key && byId[key]) {
        byId[key].total++;
        if (isDone(c.status)) byId[key].resolved++;
        else if (c.status === 'in_progress') byId[key].inProgress++;
        else byId[key].pending++;
      }
    });

    staff.forEach((s) => {
      if (!s.ward_number) return;
      const key = wardNumToId[String(s.ward_number)];
      if (key && byId[key]) byId[key].officers.push(s);
    });

    return Object.values(byId).sort(
      (a, b) => a.ward.ward_number - b.ward.ward_number
    );
  }, [scopedComplaints, staff, wards]);

  const unassignedWardComplaints = useMemo(() => {
    const knownIds = new Set(wards.map((w) => w.id));
    return scopedComplaints.filter((c) => !c.ward_id || !knownIds.has(c.ward_id)).length;
  }, [scopedComplaints, wards]);

  return {
    total, pending, inProgress, resolved, resolutionRate,
    slaMetrics, employeePerformance, wardMetrics, unassignedWardComplaints,
  };
};
