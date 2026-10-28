import { GoogleIcon } from '../common/GoogleIcon';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Department } from '../../lib/supabase';
import {
  Users, CheckCircle2, XCircle, Clock, RefreshCw,
  Search, ShieldCheck, Mail, Phone
} from 'lucide-react';

export interface StaffProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  linked_department_id: string | null;
  created_at: string;
  department?: Department;
}

export const StaffApprovalTable: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [departments, setDepartments] = useState<Record<string, Department>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending_staff' | 'dept_staff' | 'rejected_staff' | 'all'>('pending_staff');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch departments map
  const fetchDepartments = useCallback(async () => {
    const { data } = await supabase.from('departments').select('*');
    if (data) {
      const map: Record<string, Department> = {};
      data.forEach((d) => {
        map[d.id] = d;
      });
      setDepartments(map);
    }
  }, []);

  // Fetch staff applications
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['pending_staff', 'dept_staff', 'rejected_staff'])
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setStaffList(data || []);
    } catch (err: unknown) {
      console.error('Error fetching staff list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchStaff();
  }, [fetchDepartments, fetchStaff]);

  const handleUpdateRole = async (userId: string, newRole: 'dept_staff' | 'rejected_staff') => {
    setActionLoading(userId);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setMessage({
        text: newRole === 'dept_staff'
          ? 'Staff member approved! They can now log in at /dept/login.'
          : 'Staff request rejected.',
        type: 'success',
      });

      // Optimistic update
      setStaffList((prev) =>
        prev.map((s) => (s.id === userId ? { ...s, role: newRole } : s))
      );
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Action failed',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesFilter =
      statusFilter === 'all' ? true : s.role === statusFilter;
    const q = search.toLowerCase();
    const dept = s.linked_department_id ? departments[s.linked_department_id] : null;
    const matchesSearch =
      !q ||
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (dept && dept.name.toLowerCase().includes(q));

    return matchesFilter && matchesSearch;
  });

  const pendingCount = staffList.filter((s) => s.role === 'pending_staff').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Banner / Feedback Message */}
      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: message.type === 'success' ? '#15803d' : '#dc2626',
            fontWeight: 600,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          ><span className="material-symbols-rounded" style={{ fontSize: 16 }}>close</span></button>
        </div>
      )}

      {/* Top Filter Bar */}
      <div
        style={{
          background: '#fff',
          padding: '14px 18px',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--gray-200)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'pending_staff', label: `Pending Approvals (${pendingCount})`, color: 'var(--status-pending)', bg: 'var(--status-pending-bg)' },
            { id: 'dept_staff', label: 'Approved Staff', color: '#16a34a', bg: '#dcfce7' },
            { id: 'rejected_staff', label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
            { id: 'all', label: 'All Registrations', color: 'var(--gray-700)', bg: 'var(--gray-100)' },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? `1.5px solid ${tab.color}` : '1.5px solid transparent',
                  background: isSelected ? tab.bg : 'var(--gray-50)',
                  color: isSelected ? tab.color : 'var(--gray-600)',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Refresh */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input
              type="text"
              placeholder="Search staff, email, dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '7px 12px 7px 30px',
                fontSize: '0.82rem',
                border: '1.5px solid var(--gray-200)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                width: 200,
              }}
            />
          </div>

          <button
            onClick={() => { fetchStaff(); fetchDepartments(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '7px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--gray-200)',
              background: '#fff',
              color: 'var(--gray-700)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Staff List / Table */}
      <div
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--gray-200)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--gray-500)', fontSize: '0.88rem' }}>Loading staff registrations...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Users size={28} color="var(--gray-400)" />
            </div>
            <h4 style={{ margin: '0 0 4px', color: 'var(--gray-800)', fontWeight: 700 }}>
              No Staff Records Found
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-500)' }}>
              {statusFilter === 'pending_staff'
                ? 'Great! There are no pending department staff applications awaiting review.'
                : 'No staff match the selected criteria.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1.5px solid var(--gray-200)', color: 'var(--gray-600)', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>Staff Name & Details</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Department</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Applied Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => {
                  const dept = staff.linked_department_id ? departments[staff.linked_department_id] : null;
                  const isPending = staff.role === 'pending_staff';
                  const isApproved = staff.role === 'dept_staff';
                  const isRejected = staff.role === 'rejected_staff';
                  const isProcessing = actionLoading === staff.id;

                  return (
                    <tr
                      key={staff.id}
                      style={{
                        borderBottom: '1px solid var(--gray-100)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Name & Contact */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.9rem' }}>
                          {staff.full_name || 'Unnamed Staff'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                          {staff.email && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--gray-500)', fontSize: '0.78rem' }}>
                              <Mail size={12} /> {staff.email}
                            </span>
                          )}
                          {staff.phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--gray-500)', fontSize: '0.78rem' }}>
                              <Phone size={12} /> {staff.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Department */}
                      <td style={{ padding: '12px 16px' }}>
                        {dept ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: `${dept.color}15`,
                              color: dept.color,
                              fontWeight: 700,
                              fontSize: '0.82rem',
                            }}
                          >
                            <GoogleIcon name={dept.icon} size={16} />
                            <span>{dept.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        {isPending && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--status-pending-bg)',
                              color: 'var(--status-pending)',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                            }}
                          >
                            <Clock size={12} /> Awaiting Review
                          </span>
                        )}
                        {isApproved && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                            }}
                          >
                            <ShieldCheck size={12} /> Approved Staff
                          </span>
                        )}
                        {isRejected && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: '#fee2e2',
                              color: '#991b1b',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                            }}
                          >
                            <XCircle size={12} /> Rejected
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 16px', color: 'var(--gray-500)', fontSize: '0.8rem' }}>
                        {staff.created_at ? new Date(staff.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }) : 'Recent'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {/* Approve Button */}
                          {!isApproved && (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleUpdateRole(staff.id, 'dept_staff')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: '#16a34a',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 4px rgba(22,163,74,0.2)',
                              }}
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                          )}

                          {/* Reject / Revoke Button */}
                          {!isRejected && (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleUpdateRole(staff.id, 'rejected_staff')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: '#fff',
                                color: '#dc2626',
                                border: '1.5px solid #fecaca',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <XCircle size={13} /> {isApproved ? 'Revoke' : 'Reject'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
