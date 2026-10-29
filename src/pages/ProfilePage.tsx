import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Hash,
  Globe,
  ChevronLeft,
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck,
  FileText,
  Edit2,
  Save,
  Bell,
  BellOff,
  MessageSquare,
  Eye,
  Heart,
  Repeat,
  Sparkles,
  Plus,
  MapPin,
  Camera,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { LocalNews } from '../lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { useFCM } from '../hooks/useFCM';
import { isValidMobile, lettersAndSpaces, mobileDigits, wholeNumber } from '../lib/inputValidation';

/* ─── Types ─── */
interface Complaint {
  id: string;
  ticket_number: string;
  status: string;
  created_at: string;
  dept_name?: string | null;
}

/* ─── Status helpers ─── */
const STATUS_STYLES: Record<string, { bg: string; color: string; label_en: string; label_hi: string; icon: React.ReactNode }> = {
  pending:     { bg: 'var(--status-pending-bg, #fef3c7)', color: 'var(--status-pending, #b45309)', label_en: 'Pending',     label_hi: 'लंबित',      icon: <Clock size={13} /> },
  in_progress: { bg: 'var(--primary-100, #e0f2fe)', color: 'var(--burgundy, #146C94)', label_en: 'In Progress', label_hi: 'प्रगति में', icon: <Clock size={13} /> },
  resolved:    { bg: '#d1fae5', color: '#065f46', label_en: 'Resolved',    label_hi: 'हल किया',    icon: <CheckCircle size={13} /> },
  verified:    { bg: '#ede9fe', color: '#5b21b6', label_en: 'Verified',    label_hi: 'सत्यापित',   icon: <ShieldCheck size={13} /> },
  rejected:    { bg: '#fee2e2', color: '#991b1b', label_en: 'Rejected',    label_hi: 'अस्वीकृत',  icon: <XCircle size={13} /> },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: '#e5e7eb', color: '#374151', label_en: status, label_hi: status, icon: null };
}

function formatDate(iso: string, lang: 'en' | 'hi') {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/* ─── Component ─── */
export const ProfilePage: React.FC = () => {
  const { user, profile, language, setLanguage, refreshProfile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { permission, loading: fcmLoading, requestPermission } = useFCM(user?.id ?? null);

  /* navigation tabs */
  const [activeTab, setActiveTab] = useState<'complaints' | 'thoughts' | 'settings'>('complaints');

  /* form state */
  const [fullName, setFullName]     = useState('');
  const [phone, setPhone]           = useState('');
  const [wardNumber, setWardNumber] = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');

  /* complaints */
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  /* thoughts & social stats */
  const [myThoughts, setMyThoughts] = useState<LocalNews[]>([]);
  const [thoughtsLoading, setThoughtsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [profileViewsCount, setProfileViewsCount] = useState<number>(0);

  /* populate form from profile */
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setWardNumber(profile.ward_number ?? '');
    }
  }, [profile]);

  /* fetch citizen complaints */
  const fetchComplaints = useCallback(async () => {
    if (!user) return;
    setComplaintsLoading(true);
    try {
      const userPhone = (profile?.phone || user.phone || '').trim();
      const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);

      // Build flexible matching clauses: by created_by user ID, by citizen phone number, or by device tickets
      const clauses: string[] = [`created_by.eq.${user.id}`];
      if (userPhone) clauses.push(`citizen_phone.eq.${userPhone}`);
      if (cleanPhone && cleanPhone !== userPhone) clauses.push(`citizen_phone.eq.${cleanPhone}`);

      // Retrieve locally saved complaint tickets from this device
      let localItems: Complaint[] = [];
      try {
        const rawLocal = localStorage.getItem('betul_my_complaints');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            localItems = parsed;
            parsed.forEach((item: any) => {
              if (item.ticket_number) {
                clauses.push(`ticket_number.eq.${item.ticket_number}`);
              }
            });
          }
        }
      } catch {}

      const orFilter = clauses.join(',');

      const { data, error } = await supabase
        .from('complaints')
        .select('id, ticket_number, status, created_at, citizen_phone, department:departments(name), departments:departments(name)')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(60);

      let fetchedComplaints: Complaint[] = [];
      if (!error && data) {
        fetchedComplaints = data.map((c: any) => ({
          id: c.id,
          ticket_number: c.ticket_number,
          status: c.status,
          created_at: c.created_at,
          dept_name: c.department?.name || (Array.isArray(c.departments) ? c.departments[0]?.name : c.departments?.name) || 'Civic Services',
        }));
      }

      // Merge and deduplicate by ticket_number
      const seen = new Set<string>();
      const combined: Complaint[] = [];

      for (const item of fetchedComplaints) {
        if (!seen.has(item.ticket_number)) {
          seen.add(item.ticket_number);
          combined.push(item);
        }
      }

      for (const item of localItems) {
        if (item.ticket_number && !seen.has(item.ticket_number)) {
          seen.add(item.ticket_number);
          combined.push(item);
        }
      }

      setComplaints(combined);
    } catch (e) {
      console.warn('Error fetching citizen complaints:', e);
    } finally {
      setComplaintsLoading(false);
    }
  }, [user, profile?.phone]);

  /* fetch social metrics: followers, following, views */
  const fetchSocialStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [followersRes, followingRes, viewsRes] = await Promise.all([
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('user_profile_views').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
      ]);

      const localFollowers = parseInt(localStorage.getItem(`followers_count_${user.id}`) || '0', 10);
      setFollowersCount(Math.max(followersRes.count || 0, localFollowers));

      let localFollowing = 0;
      try {
        const rawFollows = localStorage.getItem('betul_followed_authors');
        if (rawFollows) {
          const arr = JSON.parse(rawFollows);
          if (Array.isArray(arr)) {
            localFollowing = new Set(arr.map((s: string) => s.replace(/^author_/, '').toLowerCase())).size;
          }
        }
      } catch {}
      setFollowingCount(Math.max(followingRes.count || 0, localFollowing));

      const localViews = parseInt(localStorage.getItem(`profile_views_${user.id}`) || '0', 10);
      setProfileViewsCount(Math.max(viewsRes.count || 0, localViews));
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  /* fetch thoughts posted by this user */
  const fetchMyThoughts = useCallback(async () => {
    if (!user) return;
    setThoughtsLoading(true);
    try {
      const filterClause = profile?.full_name
        ? `author_id.eq.${user.id},author_name.eq.${profile.full_name}`
        : `author_id.eq.${user.id}`;

      const { data, error } = await supabase
        .from('local_news')
        .select('*')
        .or(filterClause)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMyThoughts(data);
      }
    } catch {
      /* ignore */
    } finally {
      setThoughtsLoading(false);
    }
  }, [user, profile?.full_name]);

  useEffect(() => {
    void fetchComplaints();
    void fetchSocialStats();
    void fetchMyThoughts();
  }, [fetchComplaints, fetchSocialStats, fetchMyThoughts]);

  /* save profile */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isValidMobile(phone)) {
      setSaveMsg(language === 'hi' ? 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।' : 'Enter a valid 10-digit mobile number.');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    try {
      await supabase
        .from('user_profiles')
        .update({
          full_name: lettersAndSpaces(fullName).trim(),
          phone: mobileDigits(phone),
          ward_number: wholeNumber(wardNumber, 3),
          language,
        })
        .eq('id', user.id);
      await refreshProfile();
      setSaveMsg(language === 'hi' ? 'प्रोफ़ाइल अपडेट हो गई!' : 'Profile updated!');
    } catch {
      setSaveMsg(language === 'hi' ? 'अपडेट विफल' : 'Update failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  /* ─── Not logged in ─── */
  if (!authLoading && !user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--theme-bg, #F6F1F1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#ffffff', borderRadius: 20, padding: '36px 24px', maxWidth: 380, width: '100%', textAlign: 'center', border: '1px solid rgba(20, 108, 148, 0.15)', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
          <User size={48} color="#146C94" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#146C94', margin: '0 0 10px', fontWeight: 800 }}>
            {language === 'hi' ? 'लॉगिन करें' : 'Login Required'}
          </h2>
          <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: 20 }}>
            {language === 'hi'
              ? 'अपनी प्रोफ़ाइल, विचार और शिकायतें देखने के लिए लॉगिन करें।'
              : 'Please log in to view your profile, thoughts, and complaints.'}
          </p>
          <button
            onClick={() => navigate('/auth')}
            style={{ padding: '12px 28px', borderRadius: 999, border: 'none', background: 'linear-gradient(135deg,#146C94,#0E526F)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(20, 108, 148, 0.3)' }}
          >
            {language === 'hi' ? 'लॉगिन / पंजीकरण' : 'Login / Register'}
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ─── Stats ─── */
  const total    = complaints.length;
  const resolved = complaints.filter(c => c.status === 'resolved' || c.status === 'verified').length;
  const pending  = complaints.filter(c => c.status === 'pending' || c.status === 'in_progress').length;

  /* ─── Main render ─── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-background, #F6F1F1)', paddingBottom: 90 }}>
      {/* ── Header banner card ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #146C94 0%, #0E526F 100%)',
          color: '#fff',
          padding: '20px 20px 26px',
          boxShadow: '0 4px 20px rgba(20, 108, 148, 0.25)',
        }}
      >
        {/* Back + logout row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', padding: '7px 14px', borderRadius: 999, fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
          >
            <ChevronLeft size={16} />
            {language === 'hi' ? 'होम' : 'Home'}
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '7px 14px', borderRadius: 999, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            {language === 'hi' ? 'लॉगआउट' : 'Logout'}
          </button>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'linear-gradient(135deg, #AFD3E2, #19A7CE)', border: '2.5px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: '1.4rem', color: '#146C94', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            {profile?.full_name ? profile.full_name[0].toUpperCase() : <User size={30} color="#146C94" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.22rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.full_name || (language === 'hi' ? 'नागरिक' : 'Citizen')}
              </h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 13 }}>{profile?.role === 'admin' ? 'shield' : 'apartment'}</span>
                  <span>{profile?.role === 'admin' ? (language === 'hi' ? 'एडमिन' : 'Admin') : profile?.ward_number ? `Ward ${profile.ward_number}` : (language === 'hi' ? 'बेतूल नागरिक' : 'Betul Citizen')}</span>
                </span>
            </div>
          </div>
        </div>

        {/* ── Social Stats Header Bar (Followers, Following, Thoughts, Views) ── */}
        <div
          style={{
            marginTop: 18,
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 900 }}>{followersCount}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>
              {language === 'hi' ? 'फ़ॉलोअर्स' : 'Followers'}
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'rgba(255, 255, 255, 0.25)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 900 }}>{followingCount}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>
              {language === 'hi' ? 'फ़ॉलो किए' : 'Following'}
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'rgba(255, 255, 255, 0.25)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 900 }}>{myThoughts.length}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>
              {language === 'hi' ? 'विचार' : 'Thoughts'}
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'rgba(255, 255, 255, 0.25)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 900 }}>{profileViewsCount}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>
              {language === 'hi' ? 'दृश्य' : 'Views'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', maxWidth: 768, margin: '0 auto' }}>
        {/* ── Modern Navigation Tabs ── */}
        <div
          style={{
            display: 'flex',
            background: '#ffffff',
            borderRadius: 14,
            padding: 4,
            margin: '16px 0 18px',
            border: '1px solid rgba(20, 108, 148, 0.12)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('complaints')}
            style={{
              flex: 1,
              padding: '9px 4px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'complaints' ? '#146C94' : 'transparent',
              color: activeTab === 'complaints' ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={14} />
            <span>{language === 'hi' ? `शिकायतें (${complaints.length})` : `Complaints (${complaints.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('thoughts')}
            style={{
              flex: 1,
              padding: '9px 4px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'thoughts' ? '#146C94' : 'transparent',
              color: activeTab === 'thoughts' ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.15s ease',
            }}
          >
            <MessageSquare size={14} />
            <span>{language === 'hi' ? `मेरे विचार (${myThoughts.length})` : `My Thoughts (${myThoughts.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              flex: 1,
              padding: '9px 4px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === 'settings' ? '#146C94' : 'transparent',
              color: activeTab === 'settings' ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.15s ease',
            }}
          >
            <Edit2 size={14} />
            <span>{language === 'hi' ? 'सेटिंग' : 'Settings'}</span>
          </button>
        </div>

        {/* ── TAB 1: COMPLAINTS ── */}
        {activeTab === 'complaints' && (
          <div>
            {/* Quick stats pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { label: language === 'hi' ? 'कुल शिकायतें' : 'Total', value: total, color: '#146C94' },
                { label: language === 'hi' ? 'हल किए' : 'Resolved', value: resolved, color: '#065f46' },
                { label: language === 'hi' ? 'लंबित' : 'Pending', value: pending, color: '#b45309' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    padding: '14px 8px',
                    textAlign: 'center',
                    border: '1px solid rgba(20, 108, 148, 0.12)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Complaint List */}
            <section style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, color: '#146C94', fontWeight: 800, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={16} />
                  {language === 'hi' ? 'मेरी शिकायतें' : 'My Complaints'}
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/complaint/new')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#146C94',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Plus size={14} />
                  {language === 'hi' ? 'नई शिकायत दर्ज करें' : 'File Complaint'}
                </button>
              </div>

              {complaintsLoading ? (
                <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>
                  {language === 'hi' ? 'लोड हो रहा है...' : 'Loading...'}
                </p>
              ) : complaints.length === 0 ? (
                <div style={{ background: '#ffffff', borderRadius: 16, padding: '28px 16px', textAlign: 'center', border: '1px solid rgba(20, 108, 148, 0.12)' }}>
                  <FileText size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                  <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '0.9rem' }}>
                    {language === 'hi' ? 'अभी तक कोई शिकायत दर्ज नहीं है।' : 'No complaints submitted yet.'}
                  </p>
                  <button
                    onClick={() => navigate('/complaint/new')}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 999,
                      background: '#146C94',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'hi' ? 'शिकायत दर्ज करें' : 'Report an issue'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {complaints.map((c) => {
                    const st = getStatusStyle(c.status);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => navigate(`/track?ticket=${c.ticket_number}`)}
                        style={{
                          background: '#ffffff',
                          borderRadius: 14,
                          padding: '14px 16px',
                          border: '1px solid rgba(20, 108, 148, 0.12)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'transform 0.15s, box-shadow 0.15s',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#146C94', fontSize: '0.92rem', marginBottom: 2 }}>
                              #{c.ticket_number}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: 4 }}>
                              {c.dept_name ?? (language === 'hi' ? 'नगर पालिका विभाग' : 'Municipal Dept')}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#888' }}>
                              {formatDate(c.created_at, language)}
                            </div>
                          </div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: st.bg,
                              color: st.color,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {st.icon}
                            {language === 'hi' ? st.label_hi : st.label_en}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── TAB 2: MY THOUGHTS ── */}
        {activeTab === 'thoughts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#146C94', fontWeight: 800, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={16} />
                {language === 'hi' ? 'मेरे द्वारा साझा विचार' : 'Thoughts You Posted'}
              </h3>
              <button
                type="button"
                onClick={() => navigate('/news')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#146C94',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={14} />
                {language === 'hi' ? 'समाचार पोस्ट करें' : 'Post News'}
              </button>
            </div>

            {thoughtsLoading ? (
              <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>
                {language === 'hi' ? 'विचार लोड हो रहे हैं...' : 'Loading thoughts...'}
              </p>
            ) : myThoughts.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: 16, padding: '32px 16px', textAlign: 'center', border: '1px solid rgba(20, 108, 148, 0.12)' }}>
                <Sparkles size={36} color="#146C94" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#0f1419', fontSize: '1rem', fontWeight: 800 }}>
                  {language === 'hi' ? 'अभी तक कोई विचार पोस्ट नहीं किया' : 'No thoughts posted yet'}
                </h4>
                <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>
                  {language === 'hi'
                    ? 'अपने वार्ड या शहर के बारे में नागरिकों और नगर पालिका के साथ विचार साझा करें।'
                    : 'Share updates, civic thoughts, or photos with Betul citizens and municipality.'}
                </p>
                <button
                  onClick={() => navigate('/news')}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 999,
                    background: '#146C94',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  {language === 'hi' ? 'पहली खबर साझा करें' : 'Post your first news item'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myThoughts.map((thought) => (
                  <article
                    key={thought.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: 16,
                      padding: 16,
                      border: '1px solid rgba(20, 108, 148, 0.14)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#e0f2fe',
                          color: '#0284c7',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                        }}
                      >
                        {thought.category}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#888' }}>
                        {formatDate(thought.created_at, language)}
                      </span>
                    </div>

                    {thought.title && (
                      <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 700, color: '#0f1419' }}>
                        {thought.title}
                      </h4>
                    )}

                    <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#334155', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {thought.content}
                    </p>

                    {/* Highlighted image if uploaded */}
                    {thought.photo_url && (
                      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', maxHeight: 240, marginBottom: 10, border: '1px solid rgba(20, 108, 148, 0.12)' }}>
                        <img
                          src={thought.photo_url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            background: 'rgba(15, 23, 42, 0.78)',
                            color: '#fff',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 999,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Camera size={11} />
                          <span>{language === 'hi' ? 'फोटो' : 'Photo'}</span>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: '0.75rem', marginBottom: 10 }}>
                      <MapPin size={12} />
                      <span>{thought.area}</span>
                    </div>

                    {/* Social counts */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 10,
                        borderTop: '1px solid #f1f5f9',
                        fontSize: '0.78rem',
                        color: '#64748b',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MessageSquare size={14} />
                        <span>{thought.comments_count || 0}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Repeat size={14} />
                        <span>{thought.reshares_count || 0}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Heart size={14} color="#e11d48" />
                        <span>{thought.likes_count || 0}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={14} />
                        <span>{thought.views_count || 0}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: EDIT PROFILE & SETTINGS ── */}
        {activeTab === 'settings' && (
          <div>
            {/* Editable profile form */}
            <section style={{ background: '#ffffff', borderRadius: 16, border: '1px solid rgba(20, 108, 148, 0.14)', padding: '20px 16px', marginBottom: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 16px', color: '#146C94', fontWeight: 800, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit2 size={16} />
                {language === 'hi' ? 'प्रोफ़ाइल विवरण संपादित करें' : 'Edit Profile Details'}
              </h3>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Full name */}
                <label style={labelStyle}>
                  <span style={labelTextStyle}><User size={14} /> {language === 'hi' ? 'पूरा नाम' : 'Full Name'}</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(lettersAndSpaces(e.target.value))}
                    placeholder={language === 'hi' ? 'नाम दर्ज करें' : 'Enter your name'}
                    style={inputStyle}
                  />
                </label>

                {/* Phone */}
                <label style={labelStyle}>
                  <span style={labelTextStyle}><Phone size={14} /> {language === 'hi' ? 'फोन नंबर' : 'Phone Number'}</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={e => setPhone(mobileDigits(e.target.value))}
                    placeholder={language === 'hi' ? 'फोन नंबर' : 'Phone number'}
                    style={inputStyle}
                  />
                </label>

                {/* Ward number */}
                <label style={labelStyle}>
                  <span style={labelTextStyle}><Hash size={14} /> {language === 'hi' ? 'वार्ड नंबर' : 'Ward Number'}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={wardNumber}
                    onChange={e => setWardNumber(wholeNumber(e.target.value, 3))}
                    placeholder={language === 'hi' ? 'वार्ड नंबर' : 'Ward number'}
                    style={inputStyle}
                  />
                </label>

                {/* Language toggle */}
                <div>
                  <span style={labelTextStyle}><Globe size={14} /> {language === 'hi' ? 'भाषा' : 'Language'}</span>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    {(['en', 'hi'] as const).map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setLanguage(lang)}
                        style={{
                          flex: 1,
                          padding: '9px 0',
                          borderRadius: 8,
                          border: language === lang ? '2px solid #146C94' : '1px solid #cbd5e1',
                          background: language === lang ? 'linear-gradient(135deg,#146C94,#0E526F)' : '#F6F1F1',
                          color: language === lang ? '#fff' : '#146C94',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {lang === 'en' ? 'English' : 'हिंदी'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, border: 'none', background: saving ? '#999' : 'linear-gradient(135deg,#146C94,#0E526F)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: saving ? 'wait' : 'pointer', marginTop: 4 }}
                >
                  <Save size={16} />
                  {saving
                    ? (language === 'hi' ? 'सहेज रहे हैं...' : 'Saving...')
                    : (language === 'hi' ? 'परिवर्तन सहेजें' : 'Save Changes')}
                </button>

                {saveMsg && (
                  <p style={{ margin: 0, textAlign: 'center', fontSize: '0.88rem', fontWeight: 700, color: !saveMsg.includes('विफल') && !saveMsg.includes('failed') ? '#065f46' : '#991b1b' }}>
                    {saveMsg}
                  </p>
                )}
              </form>
            </section>

            {/* Push Notifications */}
            <section style={{ background: '#ffffff', borderRadius: 16, border: '1px solid rgba(20, 108, 148, 0.14)', padding: '20px 16px', marginBottom: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 12px', color: '#146C94', fontWeight: 800, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} />
                {language === 'hi' ? 'सूचनाएं' : 'Notifications'}
              </h3>
              {permission === 'granted' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#d1fae5', border: '1.5px solid #6ee7b7' }}>
                  <Bell size={18} color="#065f46" />
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#065f46' }}>
                    {language === 'hi' ? 'पुश सूचनाएं सक्षम हैं' : 'Push notifications are enabled'}
                  </p>
                </div>
              ) : permission === 'denied' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#fee2e2', border: '1.5px solid #fca5a5' }}>
                  <BellOff size={18} color="#991b1b" />
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b' }}>
                    {language === 'hi'
                      ? 'सूचनाएं ब्लॉक हैं। ब्राउज़र सेटिंग से अनुमति दें।'
                      : 'Notifications are blocked. Enable them in your browser settings.'}
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: '0.87rem', color: '#555', lineHeight: 1.5 }}>
                    {language === 'hi'
                      ? 'अपनी शिकायत की स्थिति और नगर पालिका की अपडेट के लिए पुश सूचनाएं सक्षम करें।'
                      : 'Enable push notifications to stay updated on your complaint status and municipal announcements.'}
                  </p>
                  <button
                    onClick={requestPermission}
                    disabled={fcmLoading}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: fcmLoading ? '#999' : 'linear-gradient(135deg,#146C94,#0E526F)', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: fcmLoading ? 'wait' : 'pointer' }}
                  >
                    <Bell size={16} />
                    {fcmLoading
                      ? (language === 'hi' ? 'कृपया प्रतीक्षा करें...' : 'Please wait...')
                      : (language === 'hi' ? 'सूचनाएं सक्षम करें' : 'Enable Notifications')}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

/* ─── Shared micro-styles ─── */
const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const labelTextStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#555',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1.5px solid rgba(20, 108, 148, 0.2)',
  background: '#ffffff',
  color: '#0f1419',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};

export default ProfilePage;
