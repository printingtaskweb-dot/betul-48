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
import { StatusBadge } from '../../components/common/StatusBadge';

import type { Department } from '../../lib/supabase';
import {
  LogOut, LayoutDashboard, Menu, X, ArrowLeft, UserPlus, Newspaper,
  Users, Building2, ClipboardCheck, ShieldCheck,
  FileText, CheckCircle2, AlertTriangle,
  Activity, ArrowRight, ChevronRight, Landmark, RefreshCw, Send,
  MapPin, Phone, ExternalLink, Calendar, User,
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

/* ─── Animated Compact Stat Card ─────────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  bgColor: string;
  badge?: string;
  badgeColor?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  suffix = '',
  color,
  bgColor,
  badge,
  badgeColor = '#059669',
  delay = 0,
}) => {
  const numRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!numRef.current || !cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.4, delay, ease: 'power2.out' }
    );
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 1.2,
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
      className="admin-stat-card"
      style={{
        background: '#ffffff',
        borderRadius: 14,
        padding: '11px 13px',
        boxShadow: '0 1px 4px rgba(15, 37, 49, 0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        border: '1px solid #e6e2d8',
        cursor: 'default',
        opacity: 0,
        position: 'relative',
        transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${color}18`;
        (e.currentTarget as HTMLDivElement).style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(15, 37, 49, 0.04)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#e6e2d8';
      }}
    >
      <div
        className="stat-icon-wrap"
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ color }}>{icon}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 2 }}>
          <span className="stat-label" style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
          {badge && (
            <span
              style={{
                fontSize: '0.58rem',
                fontWeight: 800,
                color: badgeColor,
                background: `${badgeColor}15`,
                borderRadius: 4,
                padding: '1px 5px',
                lineHeight: 1.2,
                flexShrink: 0,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="stat-value" style={{ fontSize: '1.22rem', fontWeight: 900, color: '#0f2531', lineHeight: 1 }}>
          <span ref={numRef}>0{suffix}</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Admin Overview Panel Types ──────────────────────────────── */
export interface RecentComplaintSummary {
  id: string;
  ticket_number: string;
  description: string;
  address?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  citizen_name?: string;
  citizen_phone?: string;
  photo_url?: string;
  ward_id?: string;
  latitude?: number;
  longitude?: number;
  department_id?: string;
  department?: { name: string; slug: string } | null;
}

export interface DeptBreakdownItem {
  id: string;
  name: string;
  slug: string;
  total: number;
  resolved: number;
  pending: number;
  rate: number;
}

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
  recentComplaints: RecentComplaintSummary[];
  deptBreakdowns: DeptBreakdownItem[];
}

interface OverviewProps {
  departments: Department[];
  loadingDepts?: boolean;
  onTab: (tab: Tab, dept?: Department) => void;
  stats: LiveStats;
  onRefreshStats: () => void;
}

const AdminOverview: React.FC<OverviewProps> = ({
  departments,
  onTab,
  stats,
  onRefreshStats,
}) => {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLDivElement>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<RecentComplaintSummary | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);

  const handleQuickStatusChange = async (newStatus: string) => {
    if (!selectedComplaint) return;
    setUpdatingStatus(newStatus);
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedComplaint.id);

      if (error) throw error;

      setSelectedComplaint((prev) =>
        prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null
      );
      setUpdateSuccessMsg(`Status updated to ${newStatus.replace('_', ' ').toUpperCase()}`);
      setTimeout(() => setUpdateSuccessMsg(null), 3000);
      onRefreshStats();
    } catch (err: any) {
      alert(err?.message || 'Failed to update complaint status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: -12 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%' }}>
      {/* ─── Executive Command Header ─── */}
      <div
        ref={headerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #146C94, #0E526F)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(20, 108, 148, 0.2)',
            }}
          >
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.28rem', fontWeight: 900, color: '#0f2531', letterSpacing: '-0.02em' }}>
              Executive Command Center
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Real-time civic telemetry, citizen grievances & municipal portfolio performance
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/municipal/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid #ddd6fe',
              background: '#f5f3ff',
              color: '#7c3aed',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Building2 size={13} />
            <span>Municipal Radar</span>
            <ChevronRight size={11} />
          </button>

          <button
            onClick={onRefreshStats}
            disabled={stats.loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid #e6e2d8',
              background: '#ffffff',
              color: '#146C94',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: '0 1px 3px rgba(15, 37, 49, 0.04)',
            }}
          >
            <RefreshCw size={12} className={stats.loading ? 'animate-spin' : ''} />
            <span>{stats.loading ? 'Syncing…' : 'Sync Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* ─── Urgent Action Alerts ─── */}
      {(stats.pendingStaffCount > 0 || stats.pendingNewsCount > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {stats.pendingStaffCount > 0 && (
            <div
              onClick={() => onTab('staff_approvals')}
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                gap: 10,
                boxShadow: '0 1px 3px rgba(220, 38, 38, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={18} color="#dc2626" />
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#991b1b' }}>
                    {stats.pendingStaffCount} Staff Registration {stats.pendingStaffCount === 1 ? 'Request' : 'Requests'} Pending Verification
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#b91c1c', marginLeft: 8 }}>
                    Action required to grant municipal system access
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                Review <ChevronRight size={13} />
              </span>
            </div>
          )}

          {stats.pendingNewsCount > 0 && (
            <div
              onClick={() => onTab('local_news')}
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 12,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                gap: 10,
                boxShadow: '0 1px 3px rgba(217, 119, 6, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Newspaper size={18} color="#d97706" />
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#92400e' }}>
                    {stats.pendingNewsCount} Citizen News {stats.pendingNewsCount === 1 ? 'Post' : 'Posts'} Awaiting Moderation
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#b45309', marginLeft: 8 }}>
                    Pending public bulletin approval
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                Moderate <ChevronRight size={13} />
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── Core Executive Metrics Grid (Compact 2x2 on Mobile, 4-col on Desktop) ─── */}
      <div className="admin-stats-grid">
        <StatCard
          icon={<Activity size={16} />}
          label="Total Grievances"
          value={stats.totalComplaints}
          color="#146C94"
          bgColor="#e0f2fe"
          delay={0}
        />
        <StatCard
          icon={<CheckCircle2 size={16} />}
          label="Resolved"
          value={stats.resolvedComplaints}
          color="#059669"
          bgColor="#dcfce7"
          badge={stats.resolutionRate > 0 ? `${stats.resolutionRate}% rate` : undefined}
          badgeColor="#059669"
          delay={0.04}
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          label="Pending Action"
          value={stats.pendingComplaints}
          color="#dc2626"
          bgColor="#fee2e2"
          badge={stats.pendingComplaints > 0 ? `${stats.pendingComplaints} active` : undefined}
          badgeColor="#dc2626"
          delay={0.08}
        />
        <StatCard
          icon={<Users size={16} />}
          label="Citizens & Staff"
          value={stats.totalUsers}
          color="#0d9488"
          bgColor="#ccfbf1"
          delay={0.12}
        />
      </div>

      {/* ─── Resolution Pace & SLA Health Bar ─── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e6e2d8',
          padding: '12px 14px',
          boxShadow: '0 1px 4px rgba(15, 37, 49, 0.04)',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f2531' }}>
              District Grievance Resolution Health
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Turnaround benchmark across Betul Municipal Corporation
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.72rem', fontWeight: 800, flexWrap: 'wrap' }}>
            <span style={{ color: '#059669' }}>● {stats.resolvedComplaints} Resolved ({stats.resolutionRate}%)</span>
            <span style={{ color: '#dc2626' }}>● {stats.pendingComplaints} Pending</span>
            <span style={{ color: '#146C94' }}>● {stats.resolvedToday} Resolved Today</span>
          </div>
        </div>

        {/* Dual-tone Progress Bar */}
        <div style={{ height: 8, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
          <div
            style={{
              width: `${stats.resolutionRate}%`,
              background: 'linear-gradient(90deg, #10b981, #059669)',
              transition: 'width 0.8s ease',
            }}
          />
          <div
            style={{
              width: `${100 - stats.resolutionRate}%`,
              background: stats.pendingComplaints > 0 ? '#fca5a5' : '#e2e8f0',
              transition: 'width 0.8s ease',
            }}
          />
        </div>
      </div>

      {/* ─── Live Citizen Grievance Stream (Real Telemetry Feed) ─── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e6e2d8',
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(15, 37, 49, 0.04)',
          marginBottom: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f2531' }}>
              Live Citizen Grievance Stream
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Real-time complaint feed submitted by residents of Betul
            </div>
          </div>

          <button
            onClick={() => onTab('complaints')}
            style={{
              background: 'none',
              border: 'none',
              color: '#146C94',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 6,
            }}
          >
            View All ({stats.totalComplaints}) <ArrowRight size={13} />
          </button>
        </div>

        {stats.loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
            <RefreshCw size={22} className="animate-spin" color="#146C94" style={{ margin: '0 auto' }} />
            <div style={{ marginTop: 8 }}>Loading live telemetry…</div>
          </div>
        ) : stats.recentComplaints.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
            No complaints filed yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.recentComplaints.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedComplaint(item)}
                title="Click to view full complaint details"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid #f1f5f9',
                  background: '#faf9f6',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  gap: 10,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = '#f3f1ec';
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = '#faf9f6';
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#f1f5f9';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: '#e0f2fe',
                      color: '#0369a1',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      flexShrink: 0,
                    }}
                  >
                    {item.ticket_number || 'IMC-311'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f2531', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description || 'Civic Grievance'}
                      </span>
                      {item.department?.name && (
                        <span style={{ fontSize: '0.66rem', background: '#e2e8f0', color: '#334155', padding: '1px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>
                          {item.department.name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.68rem', color: '#64748b', marginTop: 2 }}>
                      {item.address && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                          <MapPin size={11} color="#94a3b8" /> {item.address}
                        </span>
                      )}
                      <span style={{ flexShrink: 0, color: '#94a3b8' }}>
                        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <StatusBadge status={item.status as any} />
                  <ChevronRight size={15} color="#94a3b8" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Interactive Complaint Details Modal ─── */}
      {selectedComplaint && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 37, 49, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 540,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(15, 37, 49, 0.35)',
              border: '1px solid #e2e8f0',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '3px 9px',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      letterSpacing: '0.03em',
                    }}
                  >
                    #{selectedComplaint.ticket_number || 'IMC-311'}
                  </span>
                  <StatusBadge status={selectedComplaint.status as any} />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} color="#94a3b8" />
                  Submitted {new Date(selectedComplaint.created_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <button
                onClick={() => setSelectedComplaint(null)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: '50%',
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0';
                  (e.currentTarget as HTMLButtonElement).style.color = '#0f2531';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
                  (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Success update notification */}
            {updateSuccessMsg && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <CheckCircle2 size={16} /> {updateSuccessMsg}
              </div>
            )}

            {/* Evidence photo if available */}
            {selectedComplaint.photo_url && (
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', maxHeight: 220, background: '#0f2531' }}>
                <img
                  src={selectedComplaint.photo_url}
                  alt="Complaint Evidence"
                  style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
                />
                <a
                  href={selectedComplaint.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    background: 'rgba(15, 37, 49, 0.85)',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    textDecoration: 'none',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <ExternalLink size={12} /> Full Image
                </a>
              </div>
            )}

            {/* Grievance Description */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 4, letterSpacing: '0.04em' }}>
                Grievance Description
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#0f2531', lineHeight: 1.5, wordBreak: 'break-word', fontWeight: 500 }}>
                {selectedComplaint.description || 'No description provided.'}
              </p>
            </div>

            {/* Information Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {/* Department Card */}
              <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #f1f5f9', background: '#faf9f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  <Building2 size={13} color="#146C94" /> Department
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f2531', marginTop: 4 }}>
                  {selectedComplaint.department?.name || 'General Municipal Service'}
                </div>
              </div>

              {/* Citizen Contact Card */}
              <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #f1f5f9', background: '#faf9f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  <User size={13} color="#146C94" /> Citizen Details
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f2531', marginTop: 4 }}>
                  {selectedComplaint.citizen_name || 'Anonymous Resident'}
                </div>
                {selectedComplaint.citizen_phone ? (
                  <a
                    href={`tel:${selectedComplaint.citizen_phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                      fontSize: '0.76rem',
                      color: '#0284c7',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <Phone size={12} /> {selectedComplaint.citizen_phone} (Call)
                  </a>
                ) : (
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2 }}>Phone not provided</div>
                )}
              </div>

              {/* Location & Address Card */}
              <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #f1f5f9', background: '#faf9f6', gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  <MapPin size={13} color="#dc2626" /> Location / Address
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f2531', marginTop: 4 }}>
                  {selectedComplaint.address || 'Betul Municipal Jurisdiction'}
                </div>
                {(selectedComplaint.latitude && selectedComplaint.longitude) ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                      fontSize: '0.74rem',
                      color: '#0284c7',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={11} /> Open in Google Maps ({selectedComplaint.latitude.toFixed(4)}, {selectedComplaint.longitude.toFixed(4)})
                  </a>
                ) : selectedComplaint.address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedComplaint.address + ', Betul, MP')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                      fontSize: '0.74rem',
                      color: '#0284c7',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={11} /> Locate on Maps
                  </a>
                ) : null}
              </div>
            </div>

            {/* Quick Status Actions (Admin Control) */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 8, letterSpacing: '0.03em' }}>
                Quick Status Actions
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleQuickStatusChange('in_progress')}
                  disabled={updatingStatus !== null || selectedComplaint.status === 'in_progress'}
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #bae6fd',
                    background: selectedComplaint.status === 'in_progress' ? '#f0f9ff' : '#0284c7',
                    color: selectedComplaint.status === 'in_progress' ? '#0369a1' : '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: selectedComplaint.status === 'in_progress' ? 'default' : 'pointer',
                    opacity: updatingStatus === 'in_progress' ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {updatingStatus === 'in_progress' && <RefreshCw size={13} className="animate-spin" />}
                  {selectedComplaint.status === 'in_progress' ? 'Current: In Progress' : 'Set In Progress'}
                </button>

                <button
                  onClick={() => handleQuickStatusChange('resolved')}
                  disabled={updatingStatus !== null || selectedComplaint.status === 'resolved'}
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #bbf7d0',
                    background: selectedComplaint.status === 'resolved' ? '#f0fdf4' : '#16a34a',
                    color: selectedComplaint.status === 'resolved' ? '#15803d' : '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: selectedComplaint.status === 'resolved' ? 'default' : 'pointer',
                    opacity: updatingStatus === 'resolved' ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {updatingStatus === 'resolved' && <RefreshCw size={13} className="animate-spin" />}
                  {selectedComplaint.status === 'resolved' ? 'Current: Resolved' : 'Mark Resolved'}
                </button>

                <button
                  onClick={() => {
                    setSelectedComplaint(null);
                    onTab('complaints');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Open in Table <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Department Portfolios Workload & Resolution ─── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e6e2d8',
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(15, 37, 49, 0.04)',
          marginBottom: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f2531' }}>
              Department Portfolios & Workload
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Grievance volume and resolution rate across municipal divisions
            </div>
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#146C94' }}>
            {stats.deptBreakdowns.length} Portfolios
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {stats.deptBreakdowns.map((d) => (
            <div
              key={d.id}
              onClick={() => {
                const deptObj = departments.find((item) => item.id === d.id);
                onTab('complaints', deptObj);
              }}
              style={{
                border: '1px solid #e6e2d8',
                borderRadius: 12,
                padding: '10px 12px',
                background: '#faf9f6',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = '#f3f1ec';
                (e.currentTarget as HTMLDivElement).style.borderColor = '#146C94';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = '#faf9f6';
                (e.currentTarget as HTMLDivElement).style.borderColor = '#e6e2d8';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <DepartmentServiceIcon slugOrName={d.slug || d.name} size={24} iconSize={13} />
                  <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f2531', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </span>
                </div>
                <span
                  style={{
                    background: d.pending > 0 ? '#fee2e2' : '#e0f2fe',
                    color: d.pending > 0 ? '#dc2626' : '#0369a1',
                    borderRadius: 999,
                    padding: '1px 7px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {d.total} {d.total === 1 ? 'case' : 'cases'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginBottom: 4 }}>
                <span>{d.resolved} Resolved</span>
                <span>{d.pending} Pending ({d.rate}%)</span>
              </div>

              <div style={{ height: 5, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${d.rate}%`,
                    height: '100%',
                    background: d.rate >= 80 ? '#10b981' : d.rate >= 50 ? '#0284c7' : '#f59e0b',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Compact Administrative Quick Dispatch Strip ─── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
          Administrative Quick Actions
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 8,
          }}
        >
          <button
            onClick={() => onTab('push_notifications')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid #fecdd3',
              background: '#fff1f2',
              color: '#be123c',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <Send size={15} color="#e11d48" />
            <span>Broadcast Push Alert</span>
          </button>

          <button
            onClick={() => onTab('staff_approvals')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid #fed7aa',
              background: '#fff7ed',
              color: '#c2410c',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <ClipboardCheck size={15} color="#ea580c" />
            <span>Staff Approvals ({stats.pendingStaffCount})</span>
          </button>

          <button
            onClick={() => onTab('register')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid #bbf7d0',
              background: '#f0fdf4',
              color: '#15803d',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <UserPlus size={15} color="#16a34a" />
            <span>Register New Staff</span>
          </button>

          <button
            onClick={() => onTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid #ccfbf1',
              background: '#f0fdfa',
              color: '#0f766e',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <Users size={15} color="#0d9488" />
            <span>Citizen Directory ({stats.totalUsers})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main AdminDashboard ─────────────────────────────────────── */
export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading: authLoading, signOut } = useAuth();
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
    recentComplaints: [],
    deptBreakdowns: [],
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
        recentComplaintsRes,
        deptRowsRes,
        deptsListRes,
      ] = await Promise.all([
        supabase.from('complaints').select('*', { count: 'exact', head: true }),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'verified']),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress', 'escalated']),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'verified']).gte('updated_at', todayStart.toISOString()),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('local_news').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('complaints').select('id, ticket_number, description, address, status, created_at, updated_at, citizen_name, citizen_phone, photo_url, latitude, longitude, department_id, department:departments(name, slug)').order('created_at', { ascending: false }).limit(6),
        supabase.from('complaints').select('department_id, status'),
        supabase.from('departments').select('id, name, slug').order('name'),
      ]);

      const total = totalRes.count || 0;
      const resolved = resolvedRes.count || 0;
      const pending = pendingRes.count || 0;
      const resolvedToday = resolvedTodayRes.count || 0;
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;

      // Calculate departmental complaint distribution
      const deptMap: Record<string, { total: number; resolved: number; pending: number }> = {};
      (deptRowsRes.data || []).forEach((row: any) => {
        if (!row.department_id) return;
        if (!deptMap[row.department_id]) {
          deptMap[row.department_id] = { total: 0, resolved: 0, pending: 0 };
        }
        deptMap[row.department_id].total++;
        if (['resolved', 'verified'].includes(row.status)) {
          deptMap[row.department_id].resolved++;
        } else {
          deptMap[row.department_id].pending++;
        }
      });

      const depts = (deptsListRes.data || departments || []) as Department[];
      const breakdowns: DeptBreakdownItem[] = depts.map((d) => {
        const dStats = deptMap[d.id] || { total: 0, resolved: 0, pending: 0 };
        const dRate = dStats.total > 0 ? Math.round((dStats.resolved / dStats.total) * 100) : 100;
        return {
          id: d.id,
          name: d.name,
          slug: d.slug || '',
          total: dStats.total,
          resolved: dStats.resolved,
          pending: dStats.pending,
          rate: dRate,
        };
      }).sort((a, b) => b.total - a.total);

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
        recentComplaints: (recentComplaintsRes.data as any) || [],
        deptBreakdowns: breakdowns,
      });
    } catch (e) {
      console.warn('Error loading live admin stats:', e);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }, [departments]);

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

  const isAuthorizedAdmin = Boolean(
    user && (
      isAdmin ||
      (profile?.role && [
        'admin',
        'municipal_administrator',
        'platform_owner',
        'super_admin',
      ].includes(profile.role))
    )
  );

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || !isAuthorizedAdmin)) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAuthorizedAdmin, authLoading, navigate]);

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

  if (!user || !isAuthorizedAdmin) return null;

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
            <div className="hidden sm:block">
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
            <div className="sm:hidden">
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                  whiteSpace: 'nowrap',
                }}
              >
                Admin Console
              </span>
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
                Admin Console
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
            <MunicipalAdministratorDashboard embedded />
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

        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        @media (max-width: 768px) {
          .admin-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
            margin-bottom: 12px !important;
          }
          .admin-stat-card {
            padding: 9px 10px !important;
            gap: 8px !important;
            border-radius: 12px !important;
          }
          .admin-stat-card .stat-icon-wrap {
            width: 28px !important;
            height: 28px !important;
            border-radius: 8px !important;
          }
          .admin-stat-card .stat-icon-wrap svg {
            width: 14px !important;
            height: 14px !important;
          }
          .admin-stat-card .stat-value {
            font-size: 1.15rem !important;
          }
          .admin-stat-card .stat-label {
            font-size: 0.62rem !important;
          }

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
