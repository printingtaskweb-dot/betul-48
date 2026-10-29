import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Complaint, Department } from '../lib/supabase';

export function useComplaints(departmentSlug?: string) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    let query = supabase
      .from('complaints')
      .select('*, department:departments(*)')
      .order('created_at', { ascending: false });

    if (departmentSlug) {
      // filter by department slug via join
      query = supabase
        .from('complaints')
        .select('*, department:departments!inner(*)')
        .eq('department.slug', departmentSlug)
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) setError(error.message);
    else setComplaints(data as Complaint[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchComplaints();
  }, [departmentSlug]);

  const submitComplaint = async (payload: {
    department_id: string;
    citizen_name: string | null;
    citizen_phone: string | null;
    description: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    photo_url: string | null;
    created_by?: string | null;
  }) => {
    const { data, error } = await supabase
      .from('complaints')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const updateStatus = async (
    id: string,
    status: Complaint['status']
  ) => {
    const { error } = await supabase.from('complaints').update({ status }).eq('id', id);
    if (error) throw error;
    await fetchComplaints();
  };

  const getComplaintByTicket = async (ticket: string): Promise<Complaint | null> => {
    const { data, error } = await supabase
      .from('complaints')
      .select('*, department:departments(*)')
      .eq('ticket_number', ticket)
      .single();
    if (error) return null;
    return data as Complaint;
  };

  return { complaints, loading, error, submitComplaint, updateStatus, getComplaintByTicket, refetch: fetchComplaints };
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setDepartments(data || []);
        setLoading(false);
      });
  }, []);

  return { departments, loading };
}
