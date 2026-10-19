import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getTier, roleLabel } from '../../lib/hierarchy';
import {
  Search, Phone, Mail, MapPin, FileText, Copy, Check, X, Filter, RefreshCw,
} from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
  staff_code: string | null;
  linked_department_id: string | null;
  ward_number: string | null;
  city_id: string | null;
  authority_role: string | null;
  hierarchy_code: string | null;
  is_admin: boolean | null;
  created_at: string | null;
  approval_status: string | null;
  department?: { id: string; name: string; icon: string } | null;
}

interface UserComplaint {
  id: string;
  ticket_number: string;
  description: string;
  status: string;
  created_at: string;
  address: string | null;
}

const BORDER = '1.5px solid var(--theme-component-border, #bfbfbf)';
const PRIMARY = 'var(--theme-primary, #146C94)';

const metricPill: React.CSSProperties = {
  background: 'var(--theme-bg, #F6F1F1)',
  border: '1px solid var(--theme-component-border, #bfbfbf)',
  padding: '4px 10px',
  borderRadius: 'var(--radius-full)',
  fontSize: '0.76rem',
  fontWeight: 800,
  color: PRIMARY,
};

const ROLE_FILTERS = [
  { key: 'all', label: 'All Users' },
  { key: 'citizen', label: 'Citizens' },
  { key: 'admin', label: 'Administrators' },
  { key: 'head', label: 'Dept Heads' },
  { key: 'supervisor', label: 'Area Supervisors' },
  { key: 'field', label: 'Field Employees' },
];

export const AdminUserDirectory: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userComplaints, setUserComplaints] = useState<UserComplaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id, full_name, phone, email, role, staff_code, linked_department_id,
          ward_number, city_id, authority_role, hierarchy_code, is_admin,
          created_at, approval_status,
          department:linked_department_id(id, name, icon)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Error fetching user profiles:', error.message);
        const { data: fallbackData } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        setUsers(fallbackData || []);
      } else {
        const mapped = (data || []).map((u: any) => ({
          ...u,
          department: Array.isArray(u.department) ? u.department[0] : u.department,
        }));
        setUsers(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openUserComplaints = async (user: UserProfile) => {
    setSelectedUser(user);
    setLoadingComplaints(true);
    setUserComplaints([]);
    try {
      let query = supabase.from('complaints').select('id, ticket_number, description, status, created_at, address');

      if (user.phone) {
        query = query.or(`created_by.eq.${user.id},citizen_phone.eq.${user.phone}`);
      } else {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(25);
      if (!error && data) setUserComplaints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  // Filter users (role filter follows the same hierarchy used for task assignment)
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.staff_code && u.staff_code.toLowerCase().includes(q)) ||
      (u.ward_number && u.ward_number.toLowerCase().includes(q));

    const isCitizen = !u.role || u.role === 'citizen';
    const tier = u.is_admin ? 0 : getTier(u.role);

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'citizen' && isCitizen) ||
      (roleFilter === 'admin' && tier === 0) ||
      (roleFilter === 'head' && tier === 1) ||
      (roleFilter === 'supervisor' && tier === 2) ||
      (roleFilter === 'field' && tier === 3);

    return matchesSearch && matchesRole;
  });

  const totalCount = users.length;
  const staffCount = users.filter((u) => u.role && u.role !== 'citizen').length;
  const citizenCount = users.filter((u) => !u.role || u.role === 'citizen').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header & stats */}
      <div style={{
        background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: '16px 20px',
        border: BORDER, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--gray-900)' }}>User & Staff Directory</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-600)' }}>
            Search citizens and officers by Name, Mobile, Email, Staff Code, or Ward.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={metricPill}>Total: {totalCount}</span>
            <span style={metricPill}>Staff: {staffCount}</span>
            <span style={metricPill}>Citizens: {citizenCount}</span>
          </div>
          <button
            onClick={fetchUsers}
            style={{
              background: 'var(--theme-bg, #F6F1F1)', border: BORDER, borderRadius: 'var(--radius-md)',
              padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.8rem', fontWeight: 700,
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Search & role filters */}
      <div style={{
        background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: '14px 16px',
        border: BORDER, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by User Name, Mobile Number, Email, Staff ID, or Ward..."
            style={{
              width: '100%', padding: '11px 16px 11px 42px', borderRadius: 'var(--radius-md)',
              border: BORDER, background: 'var(--theme-bg, #F6F1F1)', fontSize: '0.88rem',
              color: 'var(--gray-900)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--gray-600)', marginRight: 4 }}>
            <Filter size={13} style={{ display: 'inline', marginRight: 4 }} />
            Role Filter:
          </span>
          {ROLE_FILTERS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRoleFilter(r.key)}
              style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid',
                borderColor: roleFilter === r.key ? PRIMARY : 'var(--theme-component-border, #bfbfbf)',
                background: roleFilter === r.key ? PRIMARY : 'var(--theme-bg, #F6F1F1)',
                color: roleFilter === r.key ? '#fff' : 'var(--gray-800)',
                fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="shimmer" style={{ height: 80, borderRadius: 'var(--radius-md)', background: 'var(--theme-component, #d9d9d9)' }} />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{
          background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: '36px 20px',
          textAlign: 'center', border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
        }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>🔍</div>
          <h4 style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--gray-900)' }}>No users found</h4>
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.84rem' }}>
            No user matching "{searchQuery}" under the selected role filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredUsers.map((u) => {
            const isStaff = !!u.role && u.role !== 'citizen';
            const tier = u.is_admin ? 0 : getTier(u.role);
            const isHead = tier <= 1 && isStaff;

            return (
              <div
                key={u.id}
                style={{
                  background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', border: BORDER,
                  padding: '14px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                  justifyContent: 'space-between', gap: 14, boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: isHead ? 'linear-gradient(135deg, #146C94, #0E526F)' : isStaff ? 'var(--primary-gradient)' : 'var(--gray-400)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', fontWeight: 800, flexShrink: 0,
                  }}>
                    {u.full_name ? u.full_name[0].toUpperCase() : u.email ? u.email[0].toUpperCase() : 'U'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--gray-900)' }}>
                        {u.full_name || 'Unnamed Citizen'}
                      </span>
                      <span style={{
                        background: isHead ? PRIMARY : isStaff ? 'rgba(102,0,51,0.15)' : 'var(--theme-bg, #F6F1F1)',
                        color: isHead ? '#fff' : PRIMARY,
                        border: '1px solid var(--theme-component-border, #bfbfbf)',
                        borderRadius: 'var(--radius-full)', padding: '1px 8px', fontSize: '0.7rem', fontWeight: 800,
                      }}>
                        {u.is_admin ? roleLabel('admin', 'en') : isStaff ? roleLabel(u.role, 'en') : 'Citizen'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                      {u.phone && (
                        <a href={`tel:${u.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: PRIMARY, textDecoration: 'none', fontWeight: 700 }}>
                          <Phone size={12} /> {u.phone}
                        </a>
                      )}
                      {u.email && (
                        <a href={`mailto:${u.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--gray-700)', textDecoration: 'none' }}>
                          <Mail size={12} /> {u.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dept / code / ward */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {u.department && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                      <span>{u.department.icon}</span>
                      <span>{u.department.name}</span>
                    </div>
                  )}

                  {u.staff_code && (
                    <button
                      onClick={() => handleCopy(u.staff_code!, u.id)}
                      title="Click to copy Staff ID"
                      style={{
                        background: 'var(--theme-bg, #F6F1F1)', border: '1px solid var(--theme-component-border, #bfbfbf)',
                        borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', fontWeight: 700, color: PRIMARY,
                      }}
                    >
                      <span>ID: {u.staff_code}</span>
                      {copiedId === u.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}

                  {u.ward_number && (
                    <span style={{ fontSize: '0.76rem', color: 'var(--gray-600)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={12} /> Ward {u.ward_number}
                    </span>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => openUserComplaints(u)}
                    style={{
                      background: 'var(--primary-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
                      padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: '0.78rem', fontWeight: 800, boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <FileText size={13} /> View Activity
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User complaints modal */}
      {selectedUser && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedUser(null); }}
        >
          <div style={{
            background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-xl)',
            border: '2px solid var(--theme-component-border, #bfbfbf)', width: '100%', maxWidth: 580,
            maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{
              background: 'var(--header-gradient, linear-gradient(135deg, #0E526F 0%, #146C94 50%, #0E526F 100%))',
              padding: '14px 20px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  Activity: {selectedUser.full_name || selectedUser.email || 'User'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)' }}>
                  Complaints filed or handled by this user
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', cursor: 'pointer', padding: 5 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              <div style={{
                background: 'var(--theme-bg, #F6F1F1)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--theme-component-border, #bfbfbf)', padding: '12px 14px', marginBottom: 16,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.78rem',
              }}>
                <div><b>Phone:</b> {selectedUser.phone || 'N/A'}</div>
                <div><b>Email:</b> {selectedUser.email || 'N/A'}</div>
                <div><b>Role:</b> {selectedUser.is_admin ? roleLabel('admin', 'en') : selectedUser.role ? roleLabel(selectedUser.role, 'en') : 'Citizen'}</div>
                <div><b>Staff Code:</b> {selectedUser.staff_code || 'N/A'}</div>
              </div>

              <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                Registered Complaints ({userComplaints.length})
              </h4>

              {loadingComplaints ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--gray-600)' }}>Loading complaints...</div>
              ) : userComplaints.length === 0 ? (
                <div style={{
                  background: 'var(--theme-bg, #F6F1F1)', borderRadius: 'var(--radius-md)', padding: '24px 16px',
                  textAlign: 'center', border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
                }}>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--gray-600)' }}>No complaints recorded for this user yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {userComplaints.map((c) => {
                    const done = c.status === 'resolved' || c.status === 'verified';
                    return (
                      <div
                        key={c.id}
                        style={{
                          background: 'var(--theme-bg, #F6F1F1)', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--theme-component-border, #bfbfbf)', padding: '10px 14px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: PRIMARY }}>#{c.ticket_number}</span>
                            <span style={{
                              background: c.status === 'pending' ? 'var(--status-pending-bg)' : done ? '#dcfce7' : '#dbeafe',
                              color: c.status === 'pending' ? 'var(--status-pending)' : done ? '#15803d' : '#146C94',
                              padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                            }}>
                              {c.status}
                            </span>
                          </div>
                          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--gray-700)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.description}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDirectory;
