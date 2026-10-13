import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDepartments } from '../../hooks/useComplaints';
import { ComplaintTable } from '../../components/admin/ComplaintTable';
import AdminStaffRegistration from '../../components/admin/AdminStaffRegistration';
import AdminNewsModeration from '../../components/admin/AdminNewsModeration';
import AdminUserDirectory from '../../components/admin/AdminUserDirectory';
import { StaffApprovalTable } from '../../components/admin/StaffApprovalTable';
import StaffApprovals from './StaffApprovals';
import MunicipalAdministratorDashboard from './MunicipalAdministratorDashboard';
import { supabase } from '../../lib/supabase';

import type { Department } from '../../lib/supabase';
import { LogOut, LayoutDashboard, Menu, X, ArrowLeft, UserPlus, Newspaper, Users, Building2, ClipboardCheck, ShieldCheck } from 'lucide-react';

type Tab = 'complaints' | 'municipal' | 'users' | 'register' | 'local_news' | 'staff_approvals' | 'staff_directory';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { departments, loading } = useDepartments();
  const [activeTab, setActiveTab] = useState<Tab>('complaints');
  const [activeDept, setActiveDept] = useState<Department | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingNewsCount, setPendingNewsCount] = useState(0);

  // Fetch pending news count for moderation badge
  useEffect(() => {
    const fetchPendingNewsCount = async () => {
      try {
        const { count, error } = await supabase
          .from('local_news')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (!error && typeof count === 'number') {
          setPendingNewsCount(count);
        }
      } catch (e) {
        // silently ignore if table not created yet
      }
    };
    if (user && isAdmin) {
      fetchPendingNewsCount();
    }
  }, [user, isAdmin, activeTab]);

  // Auth guard: must be logged in AND admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Prevent flash of dashboard before redirect
  if (authLoading || !user || !isAdmin) {
    return null;
  }

  const navBtnStyle = (active: boolean, marginBottom: number): React.CSSProperties => ({
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    marginBottom,
    background: active ? 'var(--theme-primary, #660033)' : 'transparent',
    color: active ? '#fff' : 'var(--gray-700)',
    fontWeight: active ? 800 : 600,
    fontSize: '0.88rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'var(--transition)',
  });

  const sectionHeader = (icon: React.ReactNode, title: string, subtitle: string) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--gray-900)' }}>
            {title}
          </h2>
          <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.82rem' }}>{subtitle}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Bar ── */}
      <header
        style={{
          background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
          padding: '12px clamp(12px, 3vw, 24px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 8px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="mobile-dept-toggle"
            title="Toggle departments"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Exit
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LayoutDashboard size={20} color="#a5b4fc" />
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(0.95rem, 1.2vw, 1.2rem)', fontWeight: 800, color: '#fff' }}>
                Municipal Admin Dashboard
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>
                {user?.email ? `Admin: ${user.email}` : 'IMC & Betul Grievance Console'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'var(--transition)',
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* ── Main Area with Responsive Sidebar ── */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        <aside
          style={{
            width: 240,
            background: 'var(--theme-component, #d9d9d9)',
            borderRight: '1px solid var(--theme-component-border, #bfbfbf)',
            padding: '16px 12px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
          className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}
        >
          {/* All Complaints */}
          <button
            onClick={() => {
              setActiveTab('complaints');
              setActiveDept(null);
              setMobileMenuOpen(false);
            }}
            style={{
              ...navBtnStyle(activeTab === 'complaints' && activeDept === null, 4),
              justifyContent: 'flex-start',
              gap: 10,
            }}
          >
            <span>🗂️</span> All Complaints
          </button>

          {/* Municipal Administrator Dashboard */}
          <button
            onClick={() => {
              setActiveTab('municipal');
              setActiveDept(null);
              setMobileMenuOpen(false);
            }}
            style={navBtnStyle(activeTab === 'municipal', 4)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={16} color={activeTab === 'municipal' ? '#fff' : 'var(--gray-500)'} />
              <span>Municipal Head</span>
            </div>
          </button>

          {/* User Search & Directory */}
          <button
            onClick={() => {
              setActiveTab('users');
              setActiveDept(null);
              setMobileMenuOpen(false);
            }}
            style={navBtnStyle(activeTab === 'users', 4)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={16} color={activeTab === 'users' ? '#fff' : 'var(--gray-500)'} />
              <span>User Directory & Search</span>
            </div>
          </button>

          {/* Register Staff */}
          <button
            onClick={() => {
              setActiveTab('register');
              setActiveDept(null);
              setMobileMenuOpen(false);
            }}
            style={navBtnStyle(activeTab === 'register', 4)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserPlus size={16} color={activeTab === 'register' ? '#fff' : 'var(--gray-500)'} />
              <span>Register Staff</span>
            </div>
          </button>

          {/* Local News Moderation */}
          <button
            onClick={() => {
              setActiveTab('local_news');
              setActiveDept(null);
              setMobileMenuOpen(false);
            }}
            style={navBtnStyle(activeTab === 'local_news', 12)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Newspaper size={16} color={activeTab === 'local_news' ? '#fff' : 'var(--gray-500)'} />
              <span>Local News & Thoughts</span>
            </div>
            {pendingNewsCount > 0 && (
              <span
                style={{
                  background: activeTab === 'local_news' ? '#fff' : 'var(--theme-primary, #660033)',
                  color: activeTab === 'local_news' ? 'var(--theme-primary, #660033)' : '#fff',
                  borderRadius: 'var(--radius-full)',
                  padding: '1px 7px',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                }}
              >
                {pendingNewsCount}
              </span>
            )}
          </button>

          {/* Staff Approvals */}
          <button
            onClick={() => {
              setActiveTab('staff_approvals');
              setActiveDept(null);
              setMobileMenuOpen(false);
            }}
            style={navBtnStyle(activeTab === 'staff_approvals', 4)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardCheck size={16} color={activeTab === 'staff_approvals' ? '#fff' : 'var(--gray-500)'} />
              <span>Staff Approvals</span>
            </div>
          </button>

          {/* Staff Management */}
          <button
            onClick={() => {
              setActiveTab('staff_directory');
              setActiveDept(null);
              setMobileMenuOpen(false);
            }}
            style={navBtnStyle(activeTab === 'staff_directory', 12)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={16} color={activeTab === 'staff_directory' ? '#fff' : 'var(--gray-500)'} />
              <span>Staff Management</span>
            </div>
          </button>

          <div
            style={{
              margin: '6px 0 6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--gray-400)',
              paddingLeft: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Filter by Department
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="shimmer" style={{ height: 38, borderRadius: 8, marginBottom: 4 }} />
              ))
            ) : (
              departments.map((dept) => {
                const isActive = activeTab === 'complaints' && activeDept?.id === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => {
                      setActiveTab('complaints');
                      setActiveDept(dept);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? `${dept.color}15` : 'transparent',
                      color: isActive ? dept.color : 'var(--gray-700)',
                      fontWeight: isActive ? 800 : 500,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      borderLeft: isActive ? `3px solid ${dept.color}` : '3px solid transparent',
                      transition: 'var(--transition)',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{dept.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dept.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 90,
            }}
          />
        )}

        <main style={{ flex: 1, padding: 'clamp(14px, 2.5vw, 24px)', overflowX: 'hidden', minWidth: 0 }}>
          {activeTab === 'municipal' ? (
            <div>
              <MunicipalAdministratorDashboard />
            </div>
          ) : activeTab === 'users' ? (
            <div>
              <AdminUserDirectory />
            </div>
          ) : activeTab === 'register' ? (
            <div>
              {sectionHeader(
                <UserPlus size={22} color="var(--theme-primary, #660033)" />,
                'Register Staff',
                'Create a staff login and give the email and password to the officer',
              )}
              <AdminStaffRegistration onDone={() => {}} />
            </div>
          ) : activeTab === 'local_news' ? (
            <div>
              <AdminNewsModeration />
            </div>
          ) : activeTab === 'staff_approvals' ? (
            <div>
              {sectionHeader(
                <ClipboardCheck size={22} color="var(--theme-primary, #660033)" />,
                'Staff Approvals',
                'Review and approve or reject pending staff registration requests',
              )}
              <StaffApprovals />
            </div>
          ) : activeTab === 'staff_directory' ? (
            <div>
              {sectionHeader(
                <ShieldCheck size={22} color="var(--theme-primary, #660033)" />,
                'Staff Approval Table',
                'Manage department staff applications — approve, reject, or revoke access',
              )}
              <StaffApprovalTable />
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.6rem' }}>{activeDept ? activeDept.icon : '🗂️'}</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--gray-900)' }}>
                      {activeDept ? `${activeDept.name} Department` : 'All Municipal Complaints'}
                    </h2>
                    <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.82rem' }}>
                      {activeDept ? activeDept.description : 'Real-time feed across all civic categories'}
                    </p>
                  </div>
                </div>
              </div>

              <ComplaintTable departmentSlug={activeDept?.slug} />
            </div>
          )}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            top: 56px;
            bottom: 0;
            left: -260px;
            z-index: 100;
            transition: left 0.3s ease;
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          }
          .admin-sidebar.open {
            left: 0 !important;
          }
          .mobile-dept-toggle {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-dept-toggle {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
