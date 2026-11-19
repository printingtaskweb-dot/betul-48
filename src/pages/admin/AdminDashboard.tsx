import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Users, Building2, ClipboardCheck, ShieldCheck,
  FileText, TrendingUp, CheckCircle2, AlertTriangle,
  Activity, ArrowRight, ChevronRight, Landmark, RefreshCw, Send,
} from 'lucide-react';

type Tab =
  | 'complaints'
  | 'overview'
  | 'municipal'
  | 'users'
  | 'register'
  | 'local_news'
  | 'staff_approvals'
  | 'staff_directory'
  | 'push_notifications';

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
      { opacity: 0, y: 16, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, delay, ease: 'power2.out' }
    );
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 1.4,
      delay: delay + 0.1,
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
        background: '#ffffff',
        borderRadius: 16,
        padding: '18px 20px',
        boxShadow: '0 2px 10px rgba(15, 37, 49, 0.04)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        border: '1px solid #e6e2d8',
        cursor: 'default',
        opacity: 0,
        transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${color}20`;
        (e.currentTarget as HTMLDivElement).style.borderColor = color;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(15, 37, 49, 0.04)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#e6e2d8';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginBottom: 4, letterSpacing: '0.02em' }}>
          {label}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f2531', lineHeight: 1 }}>
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
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.45, delay, ease: 'power2.out' }
    );
  }, [delay]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{
        background: gradient,
        borderRadius: 18,
        padding: '20px 18px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        opacity: 0,
        boxShadow: '0 4px 18px rgba(15, 37, 49, 0.1)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px) scale(1.01)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 28px rgba(15, 37, 49, 0.18)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) scale(1)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 18px rgba(15, 37, 49, 0.1)';
      }}
    >
      {/* Decorative ambient rings */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.12)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -25,
          right: 25,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
        }}
      />

      {badge && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#dc2626',
            borderRadius: 20,
            padding: '2px 8px',
            fontSize: '0.68rem',
            fontWeight: 900,
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {badge}
        </div>
      )}

      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          color: '#fff',
        }}
      >
        {icon}
      </div>
      <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.94rem', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.74rem', lineHeight: 1.45 }}>
        {description}
      </div>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: '#ffffff',
          fontSize: '0.74rem',
          fontWeight: 800,
        }}
      >
        Open Console <ChevronRight size={13} />
      </div>
    </div>
  );
};

/* ─── Department Activity Row ─────────────────────────────────── */
interface DeptRowProps {
  dept: Department;
  onClick: () => void;
}
const DeptRow: React.FC<DeptRowProps> = ({ dept, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      border: 'none',
      background: 'transparent',
      borderRadius: 10,
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background 0.15s',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = '#f3f1ec';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
    }}
  >
    <DepartmentServiceIcon slugOrName={dept.slug || dept.name} size={28} iconSize={15} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f2531', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {dept.name}
      </div>
      {dept.description && (
        <div style={{ fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {dept.description}
        </div>
      )}
    </div>
    <ArrowRight size={14} color="#94a3b8" />
  </button>
);

/* ─── Admin Overview Panel ─────────────────────────────────────── */
interface LiveStats {
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  resolutionRate: number;
  resolvedToday: number;
  totalUsers: number;
  pendingStaffCount: number;
  pendingNewsCount: number;
  loading: boolean;
}

interface OverviewProps {
  departments: Department[];
  loadingDepts: boolean;
  onTab: (tab: Tab, dept?: Department) => void;
  stats: LiveStats;
  onRefreshStats: () => void;
}

const AdminOverview: React.FC<OverviewProps> = ({
  departments,
  loadingDepts,
  onTab,
  stats,
  onRefreshStats,
}) => {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: -12 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  const quickActions: ActionCardProps[] = [
    {
      icon: <FileText size={20} />,
      title: 'All Complaints',
      description: 'Real-time feed across all civic categories',
      gradient: 'linear-gradient(135deg, #146C94, #19A7CE)',
      onClick: () => onTab('complaints'),
      badge: stats.pendingComplaints > 0 ? `${stats.pendingComplaints} pending` : undefined,
      delay: 0.05,
    },
    {
      icon: <Building2 size={20} />,
      title: 'Municipal Console',
      description: 'District SLA radar, ward mapping & officer dispatch',
      gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      onClick: () => navigate('/municipal/dashboard'),
      delay: 0.1,
    },
    {
      icon: <Send size={20} />,
      title: 'Push Notifications',
      description: 'Broadcast alerts to Android APK & web devices',
      gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)',
      onClick: () => onTab('push_notifications'),
      delay: 0.15,
    },
    {
      icon: <ClipboardCheck size={20} />,
      title: 'Staff Approvals',
      description: 'Review and verify municipal staff access',
      gradient: 'linear-gradient(135deg, #dc2626, #f87171)',
      onClick: () => onTab('staff_approvals'),
      badge: stats.pendingStaffCount > 0 ? `${stats.pendingStaffCount} new` : undefined,
      delay: 0.2,
    },
    {
      icon: <Users size={20} />,
      title: 'User Directory',
      description: 'Search citizens, officers & registered staff',
      gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)',
      onClick: () => onTab('users'),
      badge: stats.totalUsers > 0 ? `${stats.totalUsers} registered` : undefined,
      delay: 0.25,
    },
    {
      icon: <UserPlus size={20} />,
      title: 'Register Staff',
      description: 'Create new departmental officer credentials',
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      onClick: () => onTab('register'),
      delay: 0.3,
    },
    {
      icon: <Newspaper size={20} />,
      title: 'Local News',
      description: 'Moderate & publish community notices',
      gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
      onClick: () => onTab('local_news'),
      badge: stats.pendingNewsCount > 0 ? `${stats.pendingNewsCount} review` : undefined,
      delay: 0.35,
    },
    {
      icon: <ShieldCheck size={20} />,
      title: 'Staff Management',
      description: 'Manage officer permissions, roles & departments',
      gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)',
      onClick: () => onTab('staff_directory'),
      delay: 0.4,
    },
  ];

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      {/* ─── DESKTOP OVERVIEW (Hidden on mobile) ─── */}
      <div className="admin-desktop-view">
        {/* Header */}
        <div ref={headerRef} style={{ marginBottom: 24, opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #146C94, #0E526F)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(20, 108, 148, 0.2)',
                }}
              >
                <LayoutDashboard size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0f2531', letterSpacing: '-0.02em' }}>
                  Admin Command Center
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Live municipal telemetry, grievance resolution & officer dispatch
                </p>
              </div>
            </div>

            <button
              onClick={onRefreshStats}
              disabled={stats.loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                border: '1px solid #e6e2d8',
                background: '#ffffff',
                color: '#146C94',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: '0 1px 3px rgba(15, 37, 49, 0.04)',
              }}
            >
              <RefreshCw size={13} className={stats.loading ? 'animate-spin' : ''} />
              <span>{stats.loading ? 'Syncing…' : 'Sync Live Data'}</span>
            </button>
          </div>
        </div>

        {/* Real Live Stat Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
            gap: 14,
            marginBottom: 28,
          }}
        >
          <StatCard
            icon={<Activity size={20} />}
            label="Total Complaints"
            value={stats.totalComplaints}
            color="#146C94"
            bgColor="#e0f2fe"
            delay={0}
          />
          <StatCard
            icon={<CheckCircle2 size={20} />}
            label="Resolved Complaints"
            value={stats.resolvedComplaints}
            color="#059669"
            bgColor="#dcfce7"
            delay={0.06}
          />
          <StatCard
            icon={<AlertTriangle size={20} />}
            label="Pending Review"
            value={stats.pendingComplaints}
            color="#dc2626"
            bgColor="#fee2e2"
            delay={0.12}
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Resolution Rate"
            value={stats.resolutionRate}
            suffix="%"
            color="#7c3aed"
            bgColor="#ede9fe"
            delay={0.18}
          />
          <StatCard
            icon={<Users size={20} />}
            label="Registered Citizens & Staff"
            value={stats.totalUsers}
            color="#0f766e"
            bgColor="#ccfbf1"
            delay={0.24}
          />
        </div>

        {/* Quick Action Cards Grid */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Administrative Capabilities
          </span>
          <span style={{ fontSize: '0.74rem', color: '#146C94', fontWeight: 700 }}>
            {quickActions.length} Modules Available
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
            marginBottom: 32,
          }}
        >
          {quickActions.map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
        </div>

        {/* Department Quick-filter */}
        {!loadingDepts && departments.length > 0 && (
          <>
            <div style={{ marginBottom: 12, fontSize: '0.78rem', fontWeight: 800, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Complaints by Department Portfolio
            </div>
            <div
              style={{
                background: '#ffffff',
                borderRadius: 18,
                border: '1px solid #e6e2d8',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 8,
                boxShadow: '0 2px 10px rgba(15, 37, 49, 0.03)',
              }}
            >
              {departments.map((dept) => (
                <DeptRow key={dept.id} dept={dept} onClick={() => onTab('complaints', dept)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── DEDICATED MOBILE SCREEN FEATURE HUB (Shown ONLY on mobile) ─── */}
      <div className="admin-mobile-view">
        {/* Mobile Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #146C94 0%, #0E526F 100%)',
            borderRadius: 16,
            padding: '12px 14px',
            color: '#fff',
            marginBottom: 12,
            boxShadow: '0 4px 16px rgba(20, 108, 148, 0.18)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Landmark size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '0.94rem', fontWeight: 900, lineHeight: 1.2 }}>
                  Betul Admin Hub
                </div>
                <div style={{ fontSize: '0.64rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Central Civic Management
                </div>
              </div>
            </div>

            <button
              onClick={onRefreshStats}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: 8,
                padding: '5px 8px',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={11} className={stats.loading ? 'animate-spin' : ''} />
              <span>{stats.loading ? 'Syncing' : 'Sync'}</span>
            </button>
          </div>

          {/* Real Live Metrics Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
              paddingTop: 8,
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.96rem', fontWeight: 900 }}>{stats.totalComplaints}</div>
              <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', opacity: 0.85, fontWeight: 700 }}>Total</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#86efac' }}>{stats.resolvedComplaints}</div>
              <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', opacity: 0.85, fontWeight: 700 }}>Resolved</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#fde047' }}>{stats.pendingComplaints}</div>
              <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', opacity: 0.85, fontWeight: 700 }}>Pending</div>
            </div>
          </div>
        </div>

        {/* Feature Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Administrative Modules
          </span>
          <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#146C94' }}>
            {quickActions.length} Modules Active
          </span>
        </div>

        {/* Feature-by-Feature Option Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
          {quickActions.map((action) => (
            <div
              key={action.title}
              onClick={action.onClick}
              style={{
                background: '#ffffff',
                borderRadius: 14,
                padding: '9px 12px',
                border: '1px solid #e6e2d8',
                boxShadow: '0 1px 4px rgba(15, 37, 49, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: action.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {action.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f2531' }}>
                      {action.title}
                    </span>
                    {action.badge && (
                      <span
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: 999,
                          padding: '1px 6px',
                          fontSize: '0.58rem',
                          fontWeight: 800,
                        }}
                      >
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '1px 0 0', fontSize: '0.66rem', color: '#64748b', lineHeight: 1.25 }}>
                    {action.description}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                style={{
                  background: 'linear-gradient(135deg, #146C94, #0E526F)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  padding: '4px 10px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 1px 4px rgba(20, 108, 148, 0.2)',
                }}
              >
                Open <ChevronRight size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Mobile Department Selector */}
        {!loadingDepts && departments.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, padding: '0 2px' }}>
              Filter by Department
            </div>
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e6e2d8', overflow: 'hidden' }}>
              {departments.map((dept) => (
                <DeptRow key={dept.id} dept={dept} onClick={() => onTab('complaints', dept)} />
              ))}
            </div>
          </div>
        )}
      </div>
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

  const [stats, setStats] = useState<LiveStats>({
    totalComplaints: 0,
    resolvedComplaints: 0,
    pendingComplaints: 0,
    resolutionRate: 0,
    resolvedToday: 0,
    totalUsers: 0,
    pendingStaffCount: 0,
    pendingNewsCount: 0,
    loading: true,
  });

  const fetchLiveStats = useCallback(async () => {
    try {
      setStats((prev) => ({ ...prev, loading: true }));
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        totalRes,
        resolvedRes,
        pendingRes,
        resolvedTodayRes,
        usersRes,
        staffApprovalsRes,
        newsRes,
      ] = await Promise.all([
        supabase.from('complaints').select('*', { count: 'exact', head: true }),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'verified']),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress', 'escalated']),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'verified']).gte('updated_at', todayStart.toISOString()),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('local_news').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const total = totalRes.count || 0;
      const resolved = resolvedRes.count || 0;
      const pending = pendingRes.count || 0;
      const resolvedToday = resolvedTodayRes.count || 0;
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;

      setStats({
        totalComplaints: total,
        resolvedComplaints: resolved,
        pendingComplaints: pending,
        resolutionRate: rate,
        resolvedToday: resolvedToday,
        totalUsers: usersRes.count || 0,
        pendingStaffCount: staffApprovalsRes.count || 0,
        pendingNewsCount: newsRes.count || 0,
        loading: false,
      });
    } catch (e) {
      console.warn('Error loading live admin stats:', e);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) {
      fetchLiveStats();
    }
  }, [user, isAdmin, fetchLiveStats]);

  const handleTabChange = (tab: Tab, dept?: Department) => {
    setActiveTab(tab);
    setActiveDept(dept ?? null);
    setMobileMenuOpen(false);
  };

  // Lock background scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [mobileMenuOpen]);

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f6' }}>
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f6' }}>
        <ArcLoader
          mode="inline"
          status="Admin Command Center"
          subtitle="Fetching municipal grievance records & department telemetry…"
          theme="portal"
        />
      </div>
    );
  }

  const navItem = (
    tab: Tab,
    icon: React.ReactNode,
    label: string,
    badge?: number | string,
    colorScheme?: string
  ) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => handleTabChange(tab)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '10px 14px',
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: active ? 'linear-gradient(135deg, #146C94, #0E526F)' : 'transparent',
          color: active ? '#ffffff' : '#334155',
          fontWeight: active ? 800 : 600,
          fontSize: '0.84rem',
          transition: 'all 0.15s ease',
          marginBottom: 4,
          boxShadow: active ? '0 4px 12px rgba(20, 108, 148, 0.25)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#f3f1ec';
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <span style={{ color: active ? '#ffffff' : colorScheme || '#64748b', display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {badge !== undefined && Number(badge) > 0 && (
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 999,
              fontSize: '0.65rem',
              fontWeight: 800,
              background: active ? '#ffffff' : '#dc2626',
              color: active ? '#dc2626' : '#ffffff',
            }}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  const sectionHeader = (icon: React.ReactNode, title: string, subtitle: string) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f0f7f9, #d9ecf1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#146C94',
            border: '1px solid #b7dae4',
          }}
        >
          {icon}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f2531' }}>{title}</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>{subtitle}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f6', display: 'flex', flexDirection: 'column' }}>
      {/* ── Modern Civic Top Header ── */}
      <header
        className="admin-top-header"
        style={{
          background: 'rgba(250, 249, 246, 0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e6e2d8',
          padding: '10px clamp(12px, 3vw, 24px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: '#ffffff',
              border: '1px solid #e6e2d8',
              borderRadius: 10,
              padding: '6px 8px',
              color: '#0f2531',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(15, 37, 49, 0.04)',
            }}
            className="mobile-dept-toggle"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo / Crest */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #146C94, #0E526F)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(20, 108, 148, 0.25)',
              }}
            >
              <Landmark size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f2531', letterSpacing: '-0.02em' }}>
                  Betul 311
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 6,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                  }}
                >
                  Admin Console
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                Nagar Palika Parishad Betul
              </p>
            </div>
          </Link>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            className="hidden sm:flex items-center gap-2"
            style={{
              background: '#ffffff',
              border: '1px solid #e6e2d8',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: '0.74rem',
              color: '#334155',
              fontWeight: 600,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            <span>{user?.email || 'Admin'}</span>
          </div>

          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #e6e2d8',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.76rem',
              transition: 'all 0.15s',
            }}
          >
            <ArrowLeft size={13} /> Exit
          </button>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#dc2626',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.76rem',
              transition: 'all 0.15s',
            }}
          >
            <LogOut size={13} /> Logout
          </button>
        </div>
      </header>

      {/* ── Main Dashboard Layout ── */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Modern Sidebar */}
        <aside
          style={{
            width: 260,
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            borderRight: '1px solid #e6e2d8',
            padding: '16px 12px 90px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
          className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}
        >
          {/* Mobile Drawer Header with Close Button (shown only on mobile) */}
          <div
            className="sidebar-mobile-header"
            style={{
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 4px 10px',
              marginBottom: 8,
              borderBottom: '1px solid #e6e2d8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg, #146C94, #0E526F)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 2px 6px rgba(20, 108, 148, 0.25)',
                }}
              >
                <Landmark size={16} />
              </div>
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f2531' }}>
                Betul 311 Admin
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: 8,
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px', marginBottom: 8 }}>
            Core Console
          </div>

          {navItem('overview', <LayoutDashboard size={17} />, 'Command Center', undefined, '#146C94')}
          {navItem('complaints', <FileText size={17} />, 'All Complaints', stats.pendingComplaints, '#0284c7')}
          {navItem('push_notifications', <Send size={17} />, 'Push Notifications', undefined, '#e11d48')}

          <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px', marginTop: 16, marginBottom: 8 }}>
            Administration
          </div>

          {navItem('staff_approvals', <ClipboardCheck size={17} />, 'Staff Approvals', stats.pendingStaffCount, '#dc2626')}
          {navItem('staff_directory', <ShieldCheck size={17} />, 'Staff Management', undefined, '#2563eb')}
          {navItem('users', <Users size={17} />, 'Citizen Directory', stats.totalUsers, '#0d9488')}
          {navItem('register', <UserPlus size={17} />, 'Register Staff', undefined, '#059669')}
          {navItem('local_news', <Newspaper size={17} />, 'Local News Moderation', stats.pendingNewsCount, '#d97706')}

          <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px', marginTop: 16, marginBottom: 8 }}>
            Executive Services
          </div>

          <button
            onClick={() => navigate('/municipal/dashboard')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #ddd6fe',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#f5f3ff',
              color: '#6d28d9',
              fontWeight: 800,
              fontSize: '0.84rem',
              transition: 'all 0.15s ease',
              marginBottom: 4,
            }}
          >
            <Building2 size={17} color="#7c3aed" />
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Municipal Console
            </div>
            <ChevronRight size={13} color="#7c3aed" />
          </button>

          {/* Department Quick Links in Sidebar */}
          {!loading && departments.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e6e2d8' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px', marginBottom: 6 }}>
                Portfolios
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {departments.map((dept) => (
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
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: activeDept?.id === dept.id && activeTab === 'complaints' ? '#e0f2fe' : 'transparent',
                      color: activeDept?.id === dept.id && activeTab === 'complaints' ? '#0369a1' : '#475569',
                      fontWeight: activeDept?.id === dept.id && activeTab === 'complaints' ? 800 : 600,
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <DepartmentServiceIcon slugOrName={dept.slug || dept.name} size={20} iconSize={11} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dept.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Mobile menu overlay backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 37, 49, 0.45)',
              zIndex: 90,
              backdropFilter: 'blur(3px)',
              touchAction: 'none',
            }}
          />
        )}

        {/* Main Content Viewport */}
        <main style={{ flex: 1, padding: 'clamp(14px, 2.5vw, 28px)', overflowX: 'hidden', minWidth: 0 }}>
          {/* Mobile Active Header breadcrumb */}
          {activeTab !== 'overview' && (
            <div className="admin-mobile-active-header" style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: '8px 12px',
                  border: '1px solid #e6e2d8',
                  boxShadow: '0 1px 4px rgba(15, 37, 49, 0.04)',
                }}
              >
                <button
                  onClick={() => handleTabChange('overview')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#f0f7f9',
                    border: '1px solid #b7dae4',
                    color: '#146C94',
                    borderRadius: 999,
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={13} /> Back to Hub
                </button>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f2531', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  {activeTab === 'complaints'
                    ? (activeDept ? activeDept.name : 'All Complaints')
                    : activeTab === 'municipal'
                    ? 'Municipal Console'
                    : activeTab === 'users'
                    ? 'User Directory'
                    : activeTab === 'register'
                    ? 'Register Staff'
                    : activeTab === 'local_news'
                    ? 'Local News'
                    : activeTab === 'staff_approvals'
                    ? 'Staff Approvals'
                    : activeTab === 'staff_directory'
                    ? 'Staff Management'
                    : 'Push Notifications'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overview' ? (
            <AdminOverview
              departments={departments}
              loadingDepts={loading}
              onTab={handleTabChange}
              stats={stats}
              onRefreshStats={fetchLiveStats}
            />
          ) : activeTab === 'municipal' ? (
            <MunicipalAdministratorDashboard />
          ) : activeTab === 'users' ? (
            <AdminUserDirectory />
          ) : activeTab === 'register' ? (
            <div>
              {sectionHeader(<UserPlus size={22} color="#146C94" />, 'Register Staff', 'Create new staff login credentials for municipal officers')}
              <AdminStaffRegistration onDone={() => {}} />
            </div>
          ) : activeTab === 'local_news' ? (
            <AdminNewsModeration />
          ) : activeTab === 'staff_approvals' ? (
            <div>
              {sectionHeader(<ClipboardCheck size={22} color="#146C94" />, 'Staff Approvals', 'Review, verify and approve pending officer registrations')}
              <StaffApprovals />
            </div>
          ) : activeTab === 'staff_directory' ? (
            <div>
              {sectionHeader(<ShieldCheck size={22} color="#146C94" />, 'Staff Approval Directory', 'Manage all officer accounts, designations and permissions')}
              <StaffApprovalTable />
            </div>
          ) : activeTab === 'push_notifications' ? (
            <PushNotificationSender />
          ) : (
            <div>
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                {activeDept ? (
                  <DepartmentServiceIcon slugOrName={activeDept.slug || activeDept.name} size={42} iconSize={22} />
                ) : (
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #146C94, #19A7CE)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    <FileText size={20} />
                  </div>
                )}
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f2531' }}>
                    {activeDept ? `${activeDept.name} Department` : 'All Municipal Complaints'}
                  </h2>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
                    {activeDept ? activeDept.description : 'Real-time grievance telemetry across Betul municipal areas'}
                  </p>
                </div>
              </div>
              <ComplaintTable departmentSlug={activeDept?.slug} />
            </div>
          )}
        </main>
      </div>

      {/* ── MOBILE ADMIN BOTTOM DOCK BAR ── */}
      {activeTab !== 'municipal' && (
        <nav className="admin-mobile-bottom-dock">
          <button
            onClick={() => handleTabChange('overview')}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: activeTab === 'overview' ? '#146C94' : '#64748b',
              fontSize: '0.62rem',
              fontWeight: activeTab === 'overview' ? 800 : 600,
              cursor: 'pointer',
              padding: '2px 8px',
            }}
          >
            <LayoutDashboard size={17} color={activeTab === 'overview' ? '#146C94' : '#64748b'} />
            <span>Hub</span>
          </button>

          <button
            onClick={() => {
              handleTabChange('complaints');
              setActiveDept(null);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: activeTab === 'complaints' ? '#146C94' : '#64748b',
              fontSize: '0.62rem',
              fontWeight: activeTab === 'complaints' ? 800 : 600,
              cursor: 'pointer',
              padding: '2px 8px',
            }}
          >
            <FileText size={17} color={activeTab === 'complaints' ? '#146C94' : '#64748b'} />
            <span>Complaints</span>
          </button>

          <button
            onClick={() => handleTabChange('push_notifications')}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color: activeTab === 'push_notifications' ? '#146C94' : '#64748b',
              fontSize: '0.62rem',
              fontWeight: activeTab === 'push_notifications' ? 800 : 600,
              cursor: 'pointer',
              padding: '2px 8px',
            }}
          >
            <Send size={17} color={activeTab === 'push_notifications' ? '#146C94' : '#64748b'} />
            <span>Push</span>
          </button>

          <button
            onClick={() => handleTabChange('staff_approvals')}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              position: 'relative',
              color: activeTab === 'staff_approvals' || activeTab === 'staff_directory' ? '#146C94' : '#64748b',
              fontSize: '0.62rem',
              fontWeight: activeTab === 'staff_approvals' || activeTab === 'staff_directory' ? 800 : 600,
              cursor: 'pointer',
              padding: '2px 8px',
            }}
          >
            <ShieldCheck size={17} color={activeTab === 'staff_approvals' || activeTab === 'staff_directory' ? '#146C94' : '#64748b'} />
            <span>Staff</span>
            {stats.pendingStaffCount > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 8, width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
            )}
          </button>

          <button
            onClick={() => handleTabChange('local_news')}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              position: 'relative',
              color: activeTab === 'local_news' ? '#146C94' : '#64748b',
              fontSize: '0.62rem',
              fontWeight: activeTab === 'local_news' ? 800 : 600,
              cursor: 'pointer',
              padding: '2px 8px',
            }}
          >
            <Newspaper size={17} color={activeTab === 'local_news' ? '#146C94' : '#64748b'} />
            <span>News</span>
            {stats.pendingNewsCount > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 8, width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
            )}
          </button>
        </nav>
      )}

      {/* Responsive Styles */}
      <style>{`
        .admin-sidebar {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), left 0.25s ease;
        }

        @media (max-width: 768px) {
          .admin-top-header {
            padding: 8px 12px !important;
          }
          .admin-sidebar {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: -320px !important;
            width: min(290px, 84vw) !important;
            height: 100vh !important;
            height: 100dvh !important;
            max-height: 100vh !important;
            max-height: 100dvh !important;
            padding: 12px 12px 90px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            overscroll-behavior: contain !important;
            overscroll-behavior-y: contain !important;
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-y !important;
            z-index: 100 !important;
            box-shadow: 6px 0 28px rgba(15, 37, 49, 0.22) !important;
          }
          .admin-sidebar.open {
            left: 0 !important;
          }
          .sidebar-mobile-header {
            display: flex !important;
          }
          .mobile-dept-toggle {
            display: flex !important;
          }

          .admin-desktop-view {
            display: none !important;
          }
          .admin-mobile-view {
            display: block !important;
          }
          .admin-mobile-active-header {
            display: block !important;
          }

          .admin-mobile-bottom-dock {
            display: flex !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 52px !important;
            background: rgba(255, 255, 255, 0.96) !important;
            backdrop-filter: blur(12px) !important;
            border-top: 1px solid #e6e2d8 !important;
            z-index: 95 !important;
            justify-content: space-around !important;
            align-items: center !important;
            box-shadow: 0 -4px 18px rgba(15, 37, 49, 0.06) !important;
          }
          main {
            padding: 8px 10px 64px !important;
          }
        }

        @media (min-width: 769px) {
          .sidebar-mobile-header {
            display: none !important;
          }
          .mobile-dept-toggle {
            display: none !important;
          }
          .admin-desktop-view {
            display: block !important;
          }
          .admin-mobile-view {
            display: none !important;
          }
          .admin-mobile-active-header {
            display: none !important;
          }
          .admin-mobile-bottom-dock {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
