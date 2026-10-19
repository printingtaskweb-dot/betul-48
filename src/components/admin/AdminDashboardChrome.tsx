import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { ArrowLeft, BellRing, Building2, ClipboardCheck, LayoutDashboard, LogOut, Menu, Newspaper, ShieldCheck, UserPlus, Users, X, FileText } from 'lucide-react';
import type { Department } from '../../lib/supabase';
import { DepartmentServiceIcon } from '../common/DepartmentServiceIcon';

export type AdminTab = 'complaints' | 'municipal' | 'users' | 'register' | 'local_news' | 'staff_approvals' | 'staff_directory' | 'push_notifications';

interface AdminDashboardChromeProps {
  activeTab: AdminTab;
  activeDept: Department | null;
  setActiveTab: Dispatch<SetStateAction<AdminTab>>;
  setActiveDept: Dispatch<SetStateAction<Department | null>>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  pendingNewsCount: number;
  departments: Department[];
  loading: boolean;
  email?: string;
  onLogout: () => void;
  onExit: () => void;
  children: ReactNode;
}

export function AdminDashboardChrome({ activeTab, activeDept, setActiveTab, setActiveDept, mobileMenuOpen, setMobileMenuOpen, pendingNewsCount, departments, loading, email, onLogout, onExit, children }: AdminDashboardChromeProps) {
  const navBtnStyle = (active: boolean, marginBottom: number): React.CSSProperties => ({
    width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    border: 'none', cursor: 'pointer', marginBottom,
    background: active ? 'var(--theme-primary, #660033)' : 'transparent',
    color: active ? '#fff' : 'var(--gray-700)', fontWeight: active ? 800 : 600, fontSize: '0.88rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'var(--transition)',
  });
  return (
    <>      {/* ── Top Bar ── */}
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
            onClick={onExit}
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
                {email ? `Admin: ${email}` : 'IMC & Betul Grievance Console'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onLogout}
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
      </header>      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>        <aside
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={16} color={activeTab === 'complaints' && activeDept === null ? '#fff' : 'var(--gray-500)'} />
              <span>All Complaints</span>
            </div>
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
            style={navBtnStyle(activeTab === 'staff_directory', 4)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={16} color={activeTab === 'staff_directory' ? '#fff' : 'var(--gray-500)'} />
              <span>Staff Management</span>
            </div>
          </button>

          {/* Push Notifications */}
          <button
            onClick={() => {
              setActiveTab('push_notifications');
              setActiveDept(null);
              setMobileMenuOpen(false);
            }}
            style={navBtnStyle(activeTab === 'push_notifications', 12)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BellRing size={16} color={activeTab === 'push_notifications' ? '#fff' : 'var(--gray-500)'} />
              <span>Push Notifications</span>
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
                    <DepartmentServiceIcon slugOrName={dept.slug || dept.name} size={26} iconSize={14} />
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
        {children}
      </div>
    </>
  );
}