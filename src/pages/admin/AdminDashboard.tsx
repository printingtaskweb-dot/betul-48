import React, { useState, useEffect, useRef } from 'react';
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
import PushNotificationSender from '../../components/admin/PushNotificationSender';
import { supabase } from '../../lib/supabase';
import { gsap } from 'gsap';
import { DepartmentServiceIcon } from '../../components/common/DepartmentServiceIcon';
import { ArcLoader } from '../../components/common/ArcLoader';

import type { Department } from '../../lib/supabase';
import {
  LogOut, LayoutDashboard, Menu, X, ArrowLeft, UserPlus, Newspaper,
  Users, Building2, ClipboardCheck, ShieldCheck, BellRing,
  FileText, TrendingUp, CheckCircle2, Clock, AlertTriangle,
  Activity, ArrowRight, ChevronRight,
} from 'lucide-react';

type Tab = 'complaints' | 'overview' | 'municipal' | 'users' | 'register' | 'local_news' | 'staff_approvals' | 'staff_directory' | 'push_notifications';

/* ─── Animated Stat Card ─────────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  bgColor: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, suffix = '', color, bgColor, delay = 0 }) => {
  const numRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!numRef.current || !cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 24, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, delay, ease: 'back.out(1.4)' }
    );
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 1.8,
      delay: delay + 0.2,
      ease: 'power2.out',
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.textContent = Math.round(obj.val).toLocaleString() + suffix;
        }
      },
    });
  }, [value, delay, suffix]);

  return (
    <div
      ref={cardRef}
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '20px 22px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        border: `1px solid ${bgColor}`,
        cursor: 'default',
        opacity: 0,
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 28px ${color}30`;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 12,
          background: bgColor, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>
          <span ref={numRef}>0{suffix}</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Service Action Card ─────────────────────────────────────── */
interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  onClick: () => void;
  badge?: string;
  delay?: number;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, description, gradient, onClick, badge, delay = 0 }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, delay, ease: 'power3.out' }
    );
  }, [delay]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{
        background: gradient,
        borderRadius: 16,
        padding: '20px 18px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        opacity: 0,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.01)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) scale(1)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      }}
    >
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 100, height: 100,
        borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
      }} />
      <div style={{
        position: 'absolute', bottom: -30, right: 20, width: 60, height: 60,
        borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
      }} />

      {badge && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(255,255,255,0.95)',
          color: '#dc2626', borderRadius: 20, padding: '2px 8px',
          fontSize: '0.7rem', fontWeight: 900,
        }}>
          {badge}
        </div>
      )}

      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12, color: '#fff',
      }}>
        {icon}
      </div>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginBottom: 6 }}>{title}</div>
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.76rem', lineHeight: 1.5 }}>{description}</div>
      <div style={{
        marginTop: 14, display: 'flex', alignItems: 'center', gap: 4,
        color: 'rgba(255,255,255,0.9)', fontSize: '0.76rem', fontWeight: 700,
      }}>
        Open <ChevronRight size={13} />
      </div>
    </div>
  );
};

/* ─── Department Activity Row ─────────────────────────────────── */
interface DeptRowProps { dept: Department; onClick: () => void; }
const DeptRow: React.FC<DeptRowProps> = ({ dept, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', border: 'none', background: 'transparent',
      borderRadius: 10, cursor: 'pointer', textAlign: 'left',
      transition: 'background 0.15s',
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
  >
    <DepartmentServiceIcon slugOrName={dept.slug || dept.name} size={30} iconSize={16} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {dept.name}
      </div>
    </div>
    <ArrowRight size={14} color="#9ca3af" />
  </button>
);

/* ─── Admin Overview Panel ─────────────────────────────────────── */
interface OverviewProps {
  departments: Department[];
  loadingDepts: boolean;
  onTab: (tab: Tab, dept?: Department) => void;
  pendingNewsCount: number;
}

const AdminOverview: React.FC<OverviewProps> = ({ departments, loadingDepts, onTab, pendingNewsCount }) => {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
    );
  }, []);

  const quickActions: ActionCardProps[] = [
    {
      icon: <FileText size={20} />,
      title: 'All Complaints',
      description: 'Real-time feed across all civic categories',
      gradient: 'linear-gradient(135deg, #146C94, #19A7CE)',
      onClick: () => onTab('complaints'),
      delay: 0.05,
    },
    {
      icon: <Building2 size={20} />,
      title: 'Municipal Head',
      description: 'View district-level overview & reports',
      gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      onClick: () => onTab('municipal'),
      delay: 0.1,
    },
    {
      icon: <Users size={20} />,
      title: 'User Directory',
      description: 'Search citizens, staff & administrators',
      gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)',
      onClick: () => onTab('users'),
      delay: 0.15,
    },
    {
      icon: <UserPlus size={20} />,
      title: 'Register Staff',
      description: 'Create new staff accounts & credentials',
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      onClick: () => onTab('register'),
      delay: 0.2,
    },
    {
      icon: <Newspaper size={20} />,
      title: 'Local News',
      description: 'Moderate & approve community posts',
      gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
      onClick: () => onTab('local_news'),
      badge: pendingNewsCount > 0 ? `${pendingNewsCount} pending` : undefined,
      delay: 0.25,
    },
    {
      icon: <ClipboardCheck size={20} />,
      title: 'Staff Approvals',
      description: 'Review pending staff applications',
      gradient: 'linear-gradient(135deg, #dc2626, #f87171)',
      onClick: () => onTab('staff_approvals'),
      delay: 0.3,
    },
    {
      icon: <ShieldCheck size={20} />,
      title: 'Staff Management',
      description: 'Manage department staff & roles',
      gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)',
      onClick: () => onTab('staff_directory'),
      delay: 0.35,
    },
    {
      icon: <BellRing size={20} />,
      title: 'Push Notifications',
      description: 'Send alerts to registered citizens',
      gradient: 'linear-gradient(135deg, #be185d, #ec4899)',
      onClick: () => onTab('push_notifications'),
      delay: 0.4,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div ref={headerRef} style={{ marginBottom: 28, opacity: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #146C94, #19A7CE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LayoutDashboard size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#111827' }}>
              Admin Command Center
            </h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
              Municipal grievance management & oversight
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 14,
        marginBottom: 28,
      }}>
        <StatCard
          icon={<Activity size={20} />}
          label="Total Complaints"
          value={1248}
          color="#146C94"
          bgColor="#e0f2fe"
          delay={0}
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="Resolved Today"
          value={47}
          color="#059669"
          bgColor="#dcfce7"
          delay={0.08}
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Avg. Response (hrs)"
          value={4}
          suffix="h"
          color="#d97706"
          bgColor="#fef3c7"
          delay={0.16}
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Pending Review"
          value={23}
          color="#dc2626"
          bgColor="#fee2e2"
          delay={0.24}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Resolution Rate"
          value={94}
          suffix="%"
          color="#7c3aed"
          bgColor="#ede9fe"
          delay={0.32}
        />
      </div>

      {/* Quick Action Cards Grid */}
      <div style={{ marginBottom: 10, fontSize: '0.8rem', fontWeight: 800, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Quick Actions
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 14,
        marginBottom: 32,
      }}>
        {quickActions.map((action) => (
          <ActionCard key={action.title} {...action} />
        ))}
      </div>

      {/* Department Quick-filter */}
      {!loadingDepts && departments.length > 0 && (
        <>
          <div style={{ marginBottom: 10, fontSize: '0.8rem', fontWeight: 800, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Browse by Department
          </div>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          }}>
            {departments.map((dept) => (
              <DeptRow key={dept.id} dept={dept} onClick={() => onTab('complaints', dept)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Main AdminDashboard ─────────────────────────────────────── */
export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { departments, loading } = useDepartments();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [activeDept, setActiveDept] = useState<Department | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingNewsCount, setPendingNewsCount] = useState(0);

  const handleTabChange = (tab: Tab, dept?: Department) => {
    setActiveTab(tab);
    setActiveDept(dept ?? null);
    setMobileMenuOpen(false);
  };

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

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

    if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F1F1' }}>
        <ArcLoader
          mode="inline"
          status="Admin Command Center"
          subtitle="Verifying municipal credentials & authenticating session…"
          theme="portal"
        />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  if (loading && departments.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F1F1' }}>
        <ArcLoader
          mode="inline"
          status="Admin Command Center"
          subtitle="Fetching municipal grievance records & department telemetry…"
          theme="portal"
        />
      </div>
    );
  }

  const navBtnStyle = (active: boolean, marginBottom: number): React.CSSProperties => ({
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    marginBottom,
    background: active ? 'var(--theme-primary, #146C94)' : 'transparent',
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
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--gray-900)' }}>{title}</h2>
          <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.82rem' }}>{subtitle}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Bar ── */}
      <header style={{
        background: 'linear-gradient(135deg, #0E526F 0%, #146C94 50%, #0E526F 100%)',
        padding: '12px clamp(12px, 3vw, 24px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="mobile-dept-toggle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <button
            onClick={() => navigate('/')}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600 }}
          >
            <ArrowLeft size={14} /> Exit
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={18} color="#a5b4fc" />
            </div>
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
          {/* Overview shortcut */}
          <button
            onClick={() => handleTabChange('overview')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 8,
              border: activeTab === 'overview' ? '1.5px solid rgba(255,255,255,0.7)' : '1.5px solid rgba(255,255,255,0.25)',
              background: activeTab === 'overview' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
              color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem',
            }}
          >
            <Activity size={13} /> Overview
          </button>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Sidebar */}
        <aside
          style={{ width: 240, background: '#fff', borderRight: '1px solid #e5e7eb', padding: '16px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}
          className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}
        >
          {/* Overview */}
          <button onClick={() => handleTabChange('overview')} style={{ ...navBtnStyle(activeTab === 'overview', 4), justifyContent: 'flex-start', gap: 10 }}>
            <Activity size={16} color={activeTab === 'overview' ? '#fff' : 'var(--gray-500)'} />
            <span>Dashboard Overview</span>
          </button>

          {/* All Complaints */}
          <button
            onClick={() => { handleTabChange('complaints'); setActiveDept(null); }}
            style={{ ...navBtnStyle(activeTab === 'complaints' && activeDept === null, 4), justifyContent: 'flex-start', gap: 10 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={16} color={activeTab === 'complaints' && activeDept === null ? '#fff' : 'var(--gray-500)'} />
              <span>All Complaints</span>
            </div>
          </button>

          {/* Municipal Head */}
          <button onClick={() => handleTabChange('municipal')} style={navBtnStyle(activeTab === 'municipal', 4)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={16} color={activeTab === 'municipal' ? '#fff' : 'var(--gray-500)'} />
              <span>Municipal Head</span>
            </div>
          </button>

          {/* Users */}
          <button onClick={() => handleTabChange('users')} style={navBtnStyle(activeTab === 'users', 4)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={16} color={activeTab === 'users' ? '#fff' : 'var(--gray-500)'} />
              <span>User Directory</span>
            </div>
          </button>

          {/* Register Staff */}
          <button onClick={() => handleTabChange('register')} style={navBtnStyle(activeTab === 'register', 4)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserPlus size={16} color={activeTab === 'register' ? '#fff' : 'var(--gray-500)'} />
              <span>Register Staff</span>
            </div>
          </button>

          {/* Local News */}
          <button onClick={() => handleTabChange('local_news')} style={navBtnStyle(activeTab === 'local_news', 12)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Newspaper size={16} color={activeTab === 'local_news' ? '#fff' : 'var(--gray-500)'} />
              <span>Local News</span>
            </div>
            {pendingNewsCount > 0 && (
              <span style={{ background: activeTab === 'local_news' ? '#fff' : '#dc2626', color: activeTab === 'local_news' ? '#dc2626' : '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 900 }}>
                {pendingNewsCount}
              </span>
            )}
          </button>

          {/* Staff Approvals */}
          <button onClick={() => handleTabChange('staff_approvals')} style={navBtnStyle(activeTab === 'staff_approvals', 4)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardCheck size={16} color={activeTab === 'staff_approvals' ? '#fff' : 'var(--gray-500)'} />
              <span>Staff Approvals</span>
            </div>
          </button>

          {/* Staff Management */}
          <button onClick={() => handleTabChange('staff_directory')} style={navBtnStyle(activeTab === 'staff_directory', 4)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={16} color={activeTab === 'staff_directory' ? '#fff' : 'var(--gray-500)'} />
              <span>Staff Management</span>
            </div>
          </button>

          {/* Push Notifications */}
          <button onClick={() => handleTabChange('push_notifications')} style={navBtnStyle(activeTab === 'push_notifications', 12)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BellRing size={16} color={activeTab === 'push_notifications' ? '#fff' : 'var(--gray-500)'} />
              <span>Push Notifications</span>
            </div>
          </button>

          {/* Dept filter label */}
          <div style={{ margin: '6px 0', fontSize: '0.72rem', fontWeight: 800, color: '#9ca3af', paddingLeft: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            By Department
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
                    onClick={() => { setActiveTab('complaints'); setActiveDept(dept); setMobileMenuOpen(false); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 8, border: 'none',
                      cursor: 'pointer', background: isActive ? `${dept.color}15` : 'transparent',
                      color: isActive ? dept.color : 'var(--gray-700)', fontWeight: isActive ? 800 : 500,
                      fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 10,
                      borderLeft: isActive ? `3px solid ${dept.color}` : '3px solid transparent',
                      transition: 'var(--transition)',
                    }}
                  >
                    <DepartmentServiceIcon slugOrName={dept.slug || dept.name} size={26} iconSize={14} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90 }}
          />
        )}

        {/* Main Content */}
        <main style={{ flex: 1, padding: 'clamp(14px, 2.5vw, 28px)', overflowX: 'hidden', minWidth: 0 }}>
          {activeTab === 'overview' ? (
            <AdminOverview
              departments={departments}
              loadingDepts={loading}
              onTab={handleTabChange}
              pendingNewsCount={pendingNewsCount}
            />
          ) : activeTab === 'municipal' ? (
            <MunicipalAdministratorDashboard />
          ) : activeTab === 'users' ? (
            <AdminUserDirectory />
          ) : activeTab === 'register' ? (
            <div>
              {sectionHeader(<UserPlus size={22} color="#146C94" />, 'Register Staff', 'Create a staff login and give the email and password to the officer')}
              <AdminStaffRegistration onDone={() => {}} />
            </div>
          ) : activeTab === 'local_news' ? (
            <AdminNewsModeration />
          ) : activeTab === 'staff_approvals' ? (
            <div>
              {sectionHeader(<ClipboardCheck size={22} color="#146C94" />, 'Staff Approvals', 'Review and approve or reject pending staff registration requests')}
              <StaffApprovals />
            </div>
          ) : activeTab === 'staff_directory' ? (
            <div>
              {sectionHeader(<ShieldCheck size={22} color="#146C94" />, 'Staff Approval Table', 'Manage department staff applications — approve, reject, or revoke access')}
              <StaffApprovalTable />
            </div>
          ) : activeTab === 'push_notifications' ? (
            <PushNotificationSender />
          ) : (
            <div>
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                {activeDept ? (
                  <DepartmentServiceIcon slugOrName={activeDept.slug || activeDept.name} size={42} iconSize={22} />
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #146C94, #19A7CE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} color="#fff" />
                  </div>
                )}
                <div>
                  <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 800, color: '#111827' }}>
                    {activeDept ? `${activeDept.name} Department` : 'All Municipal Complaints'}
                  </h2>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.82rem' }}>
                    {activeDept ? activeDept.description : 'Real-time feed across all civic categories'}
                  </p>
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
            top: 56px; bottom: 0; left: -260px;
            z-index: 100; transition: left 0.3s ease;
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          }
          .admin-sidebar.open { left: 0 !important; }
          .mobile-dept-toggle { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-dept-toggle { display: none !important; }
        }
      `}</style>
    </div>
  );
};
