import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Hash, Globe, ChevronLeft, CheckCircle, Clock, XCircle, ShieldCheck, FileText, Edit2, Save, Bell, BellOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
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
  pending:     { bg: '#fef3c7', color: '#92400e', label_en: 'Pending',     label_hi: 'लंबित',      icon: <Clock size={13} /> },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label_en: 'In Progress', label_hi: 'प्रगति में', icon: <Clock size={13} /> },
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
const ProfilePage: React.FC = () => {
  const { user, profile, language, setLanguage, refreshProfile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { permission, loading: fcmLoading, requestPermission } = useFCM(user?.id ?? null);

  /* form state */
  const [fullName, setFullName]     = useState('');
  const [phone, setPhone]           = useState('');
  const [wardNumber, setWardNumber] = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');

  /* complaints */
  const [complaints, setComplaints]         = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

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
      const { data } = await supabase
        .from('complaints')
        .select('id, ticket_number, status, created_at, departments:departments(name)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const mapped: Complaint[] = (data || []).map((c: any) => ({
        id: c.id,
        ticket_number: c.ticket_number,
        status: c.status,
        created_at: c.created_at,
        dept_name: Array.isArray(c.departments) ? c.departments[0]?.name : c.departments?.name,
      }));
      setComplaints(mapped);
    } catch {
      /* ignore */
    } finally {
      setComplaintsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

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
        .update({ full_name: lettersAndSpaces(fullName).trim(), phone: mobileDigits(phone), ward_number: wholeNumber(wardNumber, 3), language })
        .eq('id', user.id);
      await refreshProfile();
      setSaveMsg(language === 'hi' ? '✅ प्रोफ़ाइल अपडेट हो गई!' : '✅ Profile updated!');
    } catch {
      setSaveMsg(language === 'hi' ? '❌ अपडेट विफल' : '❌ Update failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  /* ─── Not logged in ─── */
  if (!authLoading && !user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--theme-bg, #fff4e7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'var(--theme-component, #d9d9d9)', borderRadius: 16, padding: '32px 24px', maxWidth: 380, width: '100%', textAlign: 'center', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
          <User size={48} color="var(--theme-primary, #660033)" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#660033', margin: '0 0 10px', fontWeight: 800 }}>
            {language === 'hi' ? 'लॉगिन करें' : 'Login Required'}
          </h2>
          <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: 20 }}>
            {language === 'hi'
              ? 'अपनी प्रोफ़ाइल देखने के लिए लॉगिन करें।'
              : 'Please log in to view your profile.'}
          </p>
          <button
            onClick={() => navigate('/auth')}
            style={{ padding: '12px 28px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#660033,#800040)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}
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
    <div style={{ minHeight: '100vh', background: 'var(--theme-bg, #fff4e7)', paddingBottom: 90 }}>

      {/* ── Header card (maroon gradient) ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #660033 0%, #800040 60%, #99004d 100%)',
          color: '#fff',
          padding: '20px 20px 32px',
        }}
      >
        {/* Back + logout row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <ChevronLeft size={18} />
            {language === 'hi' ? 'होम' : 'Home'}
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer' }}
          >
            {language === 'hi' ? 'लॉगआउट' : 'Logout'}
          </button>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2.5px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={32} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.18rem', lineHeight: 1.3 }}>
              {profile?.full_name || (language === 'hi' ? 'नागरिक' : 'Citizen')}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', opacity: 0.85 }}>
              {user?.email}
            </p>
            <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: 0.5 }}>
              {profile?.role === 'admin'
                ? (language === 'hi' ? '🛡️ एडमिन' : '🛡️ Admin')
                : profile?.role === 'staff'
                ? (language === 'hi' ? '👷 स्टाफ' : '👷 Staff')
                : (language === 'hi' ? '🏙️ नागरिक' : '🏙️ Citizen')}
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ── Quick stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: -20, marginBottom: 20 }}>
          {[
            { label: language === 'hi' ? 'कुल' : 'Total', value: total, color: '#660033' },
            { label: language === 'hi' ? 'हल किए' : 'Resolved', value: resolved, color: '#065f46' },
            { label: language === 'hi' ? 'लंबित' : 'Pending', value: pending, color: '#92400e' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--theme-component, #d9d9d9)', borderRadius: 12, padding: '14px 8px', textAlign: 'center', border: '1.5px solid var(--theme-component-border, #bfbfbf)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#666', marginTop: 3 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Editable profile form ── */}
        <section style={{ background: 'var(--theme-component, #d9d9d9)', borderRadius: 14, border: '1.5px solid var(--theme-component-border, #bfbfbf)', padding: '18px 16px', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', color: '#660033', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit2 size={18} />
            {language === 'hi' ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}
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
                      border: language === lang ? '2px solid #660033' : '1.5px solid #bfbfbf',
                      background: language === lang ? 'linear-gradient(135deg,#660033,#800040)' : '#fff4e7',
                      color: language === lang ? '#fff' : '#660033',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {lang === 'en' ? '🇬🇧 English' : '🇮🇳 हिंदी'}
                  </button>
                ))}
              </div>
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, border: 'none', background: saving ? '#999' : 'linear-gradient(135deg,#660033,#800040)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: saving ? 'wait' : 'pointer', marginTop: 4 }}
            >
              <Save size={16} />
              {saving
                ? (language === 'hi' ? 'सहेज रहे हैं...' : 'Saving...')
                : (language === 'hi' ? 'परिवर्तन सहेजें' : 'Save Changes')}
            </button>

            {saveMsg && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: '0.88rem', fontWeight: 700, color: saveMsg.startsWith('✅') ? '#065f46' : '#991b1b' }}>
                {saveMsg}
              </p>
            )}
          </form>
        </section>

        {/* ── Push Notifications ── */}
        <section style={{ background: 'var(--theme-component, #d9d9d9)', borderRadius: 14, border: '1.5px solid var(--theme-component-border, #bfbfbf)', padding: '18px 16px', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', color: '#660033', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} />
            {language === 'hi' ? 'सूचनाएं' : 'Notifications'}
          </h3>
          {permission === 'granted' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#d1fae5', border: '1.5px solid #6ee7b7' }}>
              <Bell size={18} color="#065f46" />
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#065f46' }}>
                {language === 'hi' ? '✅ पुश सूचनाएं सक्षम हैं' : '✅ Push notifications are enabled'}
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: fcmLoading ? '#999' : 'linear-gradient(135deg,#660033,#800040)', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: fcmLoading ? 'wait' : 'pointer' }}
              >
                <Bell size={16} />
                {fcmLoading
                  ? (language === 'hi' ? 'कृपया प्रतीक्षा करें...' : 'Please wait...')
                  : (language === 'hi' ? '🔔 सूचनाएं सक्षम करें' : '🔔 Enable Notifications')}
              </button>
            </div>
          )}
        </section>

        {/* ── My Complaints ── */}
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', color: '#660033', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} />
            {language === 'hi' ? 'मेरी शिकायतें' : 'My Complaints'}
          </h3>

          {complaintsLoading ? (
            <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', padding: 20 }}>
              {language === 'hi' ? 'लोड हो रहा है...' : 'Loading...'}
            </p>
          ) : complaints.length === 0 ? (
            <div style={{ background: 'var(--theme-component, #d9d9d9)', borderRadius: 12, padding: '24px 16px', textAlign: 'center', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
              <FileText size={36} color="#bfbfbf" style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>
                {language === 'hi' ? 'अभी तक कोई शिकायत नहीं।' : 'No complaints submitted yet.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {complaints.map(c => {
                const st = getStatusStyle(c.status);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`/track?ticket=${c.ticket_number}`)}
                    style={{
                      background: 'var(--theme-component, #d9d9d9)',
                      borderRadius: 12,
                      padding: '14px 14px',
                      border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'box-shadow 0.15s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#660033', fontSize: '0.9rem', marginBottom: 2 }}>
                          #{c.ticket_number}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: 4 }}>
                          {c.dept_name ?? (language === 'hi' ? 'अज्ञात विभाग' : 'Unknown Dept')}
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
  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
  background: 'var(--theme-bg, #fff4e7)',
  color: '#1a1a1a',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};

export default ProfilePage;
