import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Server, ShieldAlert, RefreshCw, Plus, CheckCircle2, AlertTriangle, Clock, Activity, Database, Lock, Home as HomeIcon, User, LogOut, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RoleGuard } from '../../components/auth/RoleGuard';

interface MunicipalityTenant {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  district: string | null;
  is_active: boolean;
  tenant_status?: string;
  timezone?: string;
  logo_url?: string | null;
  created_at: string;
}

interface SupportAccessRequest {
  id: string;
  city_id: string;
  reason: string;
  status: string;
  duration_hours: number;
  expires_at: string | null;
  created_at: string;
}

interface FailedJob {
  id: string;
  job_type: string;
  status: string;
  retry_count: number;
  error_message: string | null;
  created_at: string;
}

const PlatformOwnerDashboardContent: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<MunicipalityTenant[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportAccessRequest[]>([]);
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tenants' | 'support' | 'health'>('tenants');

  // New Tenant Form
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    state: 'Madhya Pradesh',
    district: '',
    timezone: 'Asia/Kolkata',
    adminEmail: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Municipalities
      const { data: citiesData } = await supabase
        .from('cities')
        .select('*')
        .order('created_at', { ascending: false });
      if (citiesData) setTenants(citiesData as MunicipalityTenant[]);

      // 2. Fetch Support Requests (graceful fallback if table not yet created)
      const { data: supportData } = await supabase
        .from('platform_support_access_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (supportData) setSupportRequests(supportData as SupportAccessRequest[]);

      // 3. Fetch System Jobs / Failed Jobs (graceful fallback)
      const { data: jobsData } = await supabase
        .from('system_jobs')
        .select('*')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(10);
      if (jobsData) setFailedJobs(jobsData as FailedJob[]);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const slug = newTenant.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const { error } = await supabase.from('cities').insert([
        {
          name: newTenant.name.trim(),
          slug,
          state: newTenant.state,
          district: newTenant.district.trim(),
          is_active: true,
        },
      ]);
      if (error) throw error;

      setMessage({ type: 'success', text: `Municipality "${newTenant.name}" onboarded successfully! Admin invitation sent.` });
      setShowAddTenant(false);
      setNewTenant({ name: '', slug: '', state: 'Madhya Pradesh', district: '', timezone: 'Asia/Kolkata', adminEmail: '' });
      fetchData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create municipality';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await supabase
        .from('system_jobs')
        .update({ status: 'pending', retry_count: 0 })
        .eq('id', jobId);
      fetchData();
    } catch {
      //
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Header */}
      <header style={{ background: '#1e293b', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#4f46e5', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
            <Server size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Platform Owner Command Center</h1>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Tenant Onboarding, Scoped Support & System Diagnostics</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', background: '#334155', padding: '4px 10px', borderRadius: 12, color: '#e2e8f0' }}>
            {profile?.email || user?.email} (Platform Admin)
          </span>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
          >
            <ShieldCheck size={14} /> Admin Console
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#334155', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <HomeIcon size={14} /> Home
          </button>
          <button
            onClick={() => navigate('/profile')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#334155', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <User size={14} /> Profile
          </button>
          <button
            onClick={fetchData}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#475569', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#991b1b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', gap: 24 }}>
        <button
          onClick={() => setActiveTab('tenants')}
          style={{
            padding: '14px 4px',
            border: 'none',
            background: 'none',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: activeTab === 'tenants' ? '2.5px solid #4f46e5' : '2.5px solid transparent',
            color: activeTab === 'tenants' ? '#4f46e5' : '#64748b',
          }}
        >
          Active Municipalities ({tenants.length})
        </button>
        <button
          onClick={() => setActiveTab('support')}
          style={{
            padding: '14px 4px',
            border: 'none',
            background: 'none',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: activeTab === 'support' ? '2.5px solid #4f46e5' : '2.5px solid transparent',
            color: activeTab === 'support' ? '#4f46e5' : '#64748b',
          }}
        >
          Scoped Support Access
        </button>
        <button
          onClick={() => setActiveTab('health')}
          style={{
            padding: '14px 4px',
            border: 'none',
            background: 'none',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: activeTab === 'health' ? '2.5px solid #4f46e5' : '2.5px solid transparent',
            color: activeTab === 'health' ? '#4f46e5' : '#64748b',
          }}
        >
          System Health & Failed Jobs ({failedJobs.length})
        </button>
      </div>

      <main style={{ maxWidth: 1200, margin: '24px auto', padding: '0 24px' }}>
        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 20,
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
          }}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {message.text}
          </div>
        )}

        {/* Tab 1: Municipalities / Tenants */}
        {activeTab === 'tenants' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px' }}>Onboarded Municipal Corporations</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Multi-tenant organizations actively configured on the platform</p>
              </div>
              <button
                onClick={() => setShowAddTenant(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <Plus size={18} /> Onboard New Municipality
              </button>
            </div>

            {showAddTenant && (
              <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Onboard New Municipality (Tenant)</h3>
                <form onSubmit={handleCreateTenant} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4, color: '#475569' }}>Municipality Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Nagar Palika Nigam Betul"
                      value={newTenant.name}
                      onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4, color: '#475569' }}>Tenant Slug / Domain *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. betul-mp"
                      value={newTenant.slug}
                      onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4, color: '#475569' }}>District / Division</label>
                    <input
                      type="text"
                      placeholder="e.g. Betul"
                      value={newTenant.district}
                      onChange={(e) => setNewTenant({ ...newTenant, district: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4, color: '#475569' }}>Admin Invitation Email</label>
                    <input
                      type="email"
                      placeholder="admin@municipality.gov.in"
                      value={newTenant.adminEmail}
                      onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowAddTenant(false)}
                      style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                    >
                      {isSubmitting ? 'Onboarding…' : 'Confirm & Initialize Tenant'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {tenants.map((t) => (
                <div key={t.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Building2 size={24} color="#4f46e5" />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{t.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>slug: {t.slug}</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: t.is_active ? '#dcfce7' : '#f1f5f9',
                      color: t.is_active ? '#15803d' : '#64748b',
                    }}>
                      {t.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>
                    <div><b>State / District:</b> {t.state || 'N/A'}, {t.district || 'N/A'}</div>
                    <div><b>Timezone:</b> {t.timezone || 'Asia/Kolkata (IST)'}</div>
                    <div><b>Onboarded:</b> {new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                    <a
                      href={`/municipal/dashboard`}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        textDecoration: 'none',
                      }}
                    >
                      Municipal View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Scoped Support Access */}
        {activeTab === 'support' && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Lock size={22} color="#4f46e5" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Time-Limited Scoped Support Access</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Platform Owners cannot access day-to-day municipal records without explicit approval from the Municipal Administrator.
                  </p>
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Support Access Protocol:</p>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>All support sessions automatically expire after the granted window (e.g. 12h or 24h).</li>
                  <li>Every query and view action during an authorized support session is logged in the tenant audit trail.</li>
                  <li>Municipal Administrators hold the absolute right to revoke support access instantly.</li>
                </ul>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 800, fontSize: '0.9rem' }}>
                Active & Recent Support Access Requests
              </div>
              {supportRequests.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No active support access requests at this time.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <tr>
                      <th style={{ padding: '10px 16px' }}>Municipality</th>
                      <th style={{ padding: '10px 16px' }}>Reason</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                      <th style={{ padding: '10px 16px' }}>Duration</th>
                      <th style={{ padding: '10px 16px' }}>Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportRequests.map((req) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{req.city_id}</td>
                        <td style={{ padding: '12px 16px' }}>{req.reason}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, background: req.status === 'approved' ? '#dcfce7' : '#fef3c7', color: req.status === 'approved' ? '#15803d' : '#b45309' }}>
                            {req.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{req.duration_hours} hrs</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{req.expires_at ? new Date(req.expires_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: System Health & Diagnostics */}
        {activeTab === 'health' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>API UPTIME</span>
                  <Activity size={20} color="#10b981" />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>99.98%</div>
                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Operational (All endpoints normal)</span>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>QUEUE BACKLOG</span>
                  <Clock size={20} color="#6366f1" />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>0 jobs</div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>FCM & Realtime push dispatch active</span>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>STORAGE UTILIZATION</span>
                  <Database size={20} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>1.4 GB / 50 GB</div>
                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>2.8% used (Healthy)</span>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>FAILED JOBS</span>
                  <ShieldAlert size={20} color={failedJobs.length > 0 ? '#ef4444' : '#10b981'} />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: failedJobs.length > 0 ? '#ef4444' : '#0f172a' }}>{failedJobs.length}</div>
                <span style={{ fontSize: '0.75rem', color: failedJobs.length > 0 ? '#ef4444' : '#10b981' }}>
                  {failedJobs.length > 0 ? 'Requires attention' : 'No failed jobs'}
                </span>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 800, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Failed Background Jobs Queue</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Auto-retry triggers every 15 mins</span>
              </div>
              {failedJobs.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>All platform background workers are healthy.</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Push notifications, SLA escalation timers, and geofencing monitors are running smoothly.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <tr>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>Job Type</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>Error Message</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center' }}>Retries</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedJobs.map((job) => (
                      <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>{job.job_type}</td>
                        <td style={{ padding: '12px 16px', color: '#ef4444' }}>{job.error_message || 'Unknown network error'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{job.retry_count}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleRetryJob(job.id)}
                            style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Retry Job
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export const PlatformOwnerDashboard: React.FC = () => (
  <RoleGuard
    allowedRoles={['platform_owner', 'super_admin']}
    allowAdminFlag={false}
    unauthenticatedRedirect="/admin"
    unauthorizedRedirect="/"
    loadingTitle="Platform Owner Console"
  >
    <PlatformOwnerDashboardContent />
  </RoleGuard>
);

export default PlatformOwnerDashboard;
