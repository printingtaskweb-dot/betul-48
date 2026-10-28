import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface DeptComplaint {
  id: string;
  ticket_number: string;
  department_id: string;
  dept_name: string;
  dept_slug: string;
  dept_color: string;
  dept_icon: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  assignment_notes?: string | null;
  assigned_name?: string | null;
  assigned_phone?: string | null;
  assigned_role?: string | null;
  assigned_code?: string | null;
  ward_id?: string | null;
  area_id?: string | null;
  resolution_note: string | null;
  resolution_photo: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  citizen_satisfied: boolean | null;
  citizen_verified_at: string | null;
}

export function useDeptComplaints(departmentId: string | null) {
  const [complaints, setComplaints] = useState<DeptComplaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaints = useCallback(async (statusFilter?: string, searchQuery?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('dept_complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (departmentId && departmentId !== 'all') {
        query = query.eq('department_id', departmentId);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchQuery) {
        query = query.or(
          `ticket_number.ilike.%${searchQuery}%,citizen_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      let { data, error: qErr } = await query;

      // If view doesn't exist, fall back to standard table query
      if (qErr) {
        console.warn('dept_complaints view query failed, falling back to direct table:', qErr.message);
        let fbQuery = supabase
          .from('complaints')
          .select('*, department:departments(*)')
          .order('created_at', { ascending: false });

        if (departmentId && departmentId !== 'all') {
          fbQuery = fbQuery.eq('department_id', departmentId);
        }

        if (statusFilter && statusFilter !== 'all') {
          fbQuery = fbQuery.eq('status', statusFilter);
        }
        if (searchQuery) {
          fbQuery = fbQuery.or(
            `ticket_number.ilike.%${searchQuery}%,citizen_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
          );
        }

        const { data: fbData, error: fbErr } = await fbQuery;
        if (fbErr) throw fbErr;

        // Fetch staff profiles for any assigned_to IDs
        const assignedIds = Array.from(new Set((fbData || []).map((r: any) => r.assigned_to).filter(Boolean)));
        let profileMap: Record<string, any> = {};
        if (assignedIds.length > 0) {
          const { data: pData } = await supabase
            .from('user_profiles')
            .select('id, full_name, phone, role, staff_code')
            .in('id', assignedIds);
          if (pData) {
            pData.forEach((p) => { profileMap[p.id] = p; });
          }
        }

        data = (fbData || []).map((row: any) => {
          const staff = row.assigned_to ? profileMap[row.assigned_to] : null;
          return {
            ...row,
            dept_name: row.department?.name || '',
            dept_slug: row.department?.slug || '',
            dept_color: row.department?.color || '#146C94',
            dept_icon: row.department?.icon || 'apartment',
            assigned_name: staff?.full_name || null,
            assigned_phone: staff?.phone || null,
            assigned_role: staff?.role || null,
            assigned_code: staff?.staff_code || null,
            resolution_note: null,
            resolution_photo: null,
            resolved_by: null,
            resolved_at: null,
            citizen_satisfied: null,
            citizen_verified_at: null,
          };
        });
      }

      setComplaints(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  const assignComplaint = useCallback(async (
    complaintId: string,
    assignedToId: string,
    assignedById?: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      const payload: Record<string, any> = {
        assigned_to: assignedToId,
        assigned_at: new Date().toISOString(),
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      };
      if (assignedById) payload.assigned_by = assignedById;
      if (notes) payload.assignment_notes = notes;

      const { error: updErr } = await supabase
        .from('complaints')
        .update(payload)
        .eq('id', complaintId);

      if (updErr) {
        console.warn('Assignment column update warning:', updErr.message);
        // Fallback update status only if assigned_to column does not exist yet
        await supabase
          .from('complaints')
          .update({
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', complaintId);
      }

      return true;
    } catch (err: unknown) {
      console.warn('assignComplaint error:', err);
      return false;
    }
  }, []);

  const resolveComplaint = useCallback(async (
    complaintId: string,
    note: string,
    photoFile: File | null,
    resolvedBy: string
  ): Promise<boolean> => {
    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const path = `resolutions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('complaint-photos')
          .upload(path, photoFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from('complaint-photos')
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      // Insert resolution record
      const { error: resErr } = await supabase
        .from('resolutions')
        .insert({
          complaint_id: complaintId,
          admin_note: note,
          resolution_photo_url: photoUrl,
          resolved_by: resolvedBy,
        });
      if (resErr) throw resErr;

      // Update complaint status to resolved
      const { error: updErr } = await supabase
        .from('complaints')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', complaintId);
      if (updErr) throw updErr;

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve complaint');
      return false;
    }
  }, []);

  return { complaints, loading, error, fetchComplaints, assignComplaint, resolveComplaint };
}
