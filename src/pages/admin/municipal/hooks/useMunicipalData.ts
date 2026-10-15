import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { StaffMember } from '../../../../lib/hierarchy';
import type { Ward } from '../../../../lib/wardTypes';
import type { ComplaintRecord, DepartmentRow } from '../types';

export const useMunicipalData = () => {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: depts }, { data: comps }, { data: people }, { data: wardData }] =
        await Promise.all([
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
          supabase
            .from('wards')
            .select('*')
            .order('ward_number', { ascending: true }),
        ]);

      setDepartments(
        (depts || []).map((d: any) => ({ ...d, icon: d.icon || '🏢' }))
      );
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
      setWards((wardData || []) as Ward[]);
    } catch (e) {
      console.error('Data fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { departments, complaints, staff, wards, loading, fetchData };
};
