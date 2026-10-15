import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { StaffMember } from '../../../../lib/hierarchy';
import type { Ward } from '../../../../lib/wardTypes';
import type { ComplaintRecord, DepartmentRow } from '../types';

const PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<PageResult<T>> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };

    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return { data: rows, error: null };
}

export const useMunicipalData = () => {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [depts, comps, people, wardData] = await Promise.all([
        fetchAllPages((from, to) => supabase
            .from('departments')
            .select('*')
            .eq('is_active', true)
            .order('name')
            .range(from, to)),
        fetchAllPages((from, to) => supabase
            .from('complaints')
            .select(
              `*,
               department:departments!complaints_department_id_fkey(*),
               ward:wards!complaints_ward_id_fkey(*),
               area:areas!complaints_area_id_fkey(*),
               assignee:user_profiles!complaints_assigned_to_fkey(id, full_name, phone, email, role, staff_code, linked_department_id, ward_number, authority_role, hierarchy_code),
               assigner:user_profiles!complaints_assigned_by_fkey(id, full_name, phone, email, role),
               resolutions(*),
               verifications(*)`
            )
            .order('created_at', { ascending: false })
            .range(from, to)),
        fetchAllPages((from, to) => supabase
            .from('user_profiles')
            .select('*')
            .neq('role', 'citizen')
            .order('full_name')
            .range(from, to)),
        fetchAllPages((from, to) => supabase
            .from('wards')
            .select('*')
            .order('ward_number', { ascending: true })
            .range(from, to)),
      ]);

      const queryErrors = [
        ['departments', depts.error],
        ['complaints', comps.error],
        ['staff profiles', people.error],
        ['wards', wardData.error],
      ].filter((entry): entry is [string, { message: string }] => entry[1] !== null);

      if (queryErrors.length > 0) {
        const message = queryErrors.map(([table, queryError]) => `${table}: ${queryError.message}`).join('; ');
        setError(message);
        console.error('Municipal dashboard data fetch error:', message);
      }

      setDepartments(
        (depts.data || []).map((d: any) => ({ ...d, icon: d.icon || '🏢' }))
      );
      setComplaints(
        (comps.data || []).map((c: any) => ({
          ...c,
          ticket_number: c.ticket_number || c.id.slice(0, 8),
          ward_id: c.ward_id ?? null,
          area_id: c.area_id ?? null,
          department: Array.isArray(c.department) ? c.department[0] : c.department,
        }))
      );
      setStaff((people.data || []) as StaffMember[]);
      setWards((wardData.data || []) as Ward[]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unexpected error while loading municipal data.';
      setError(message);
      console.error('Municipal dashboard data fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { departments, complaints, staff, wards, loading, error, fetchData };
};
