import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Bell, Send, Users, User, CheckCircle, AlertCircle,
  RefreshCw, ChevronDown, MessageSquare, BellRing,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
interface FCMToken {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  updated_at: string;
  user?: { full_name: string | null; email: string | null; role: string | null };
}

type SendMode = 'all' | 'role' | 'user';
type Status   = 'idle' | 'sending' | 'success' | 'error';

const ROLES = [
  { value: 'citizen',              label: 'Citizens' },
  { value: 'dept_staff',           label: 'Department Staff' },
  { value: 'department_head',      label: 'Department Heads' },
  { value: 'supervisor',           label: 'Supervisors' },
  { value: 'field_employee',       label: 'Field Employees' },
  { value: 'municipal_administrator', label: 'Municipal Administrators' },
];

const BORDER  = '1.5px solid var(--theme-component-border, #bfbfbf)';
const PRIMARY = 'var(--theme-primary, #660033)';

/* ─── Component ─────────────────────────────────────────── */
export const PushNotificationSender: React.FC = () => {
  const { user } = useAuth();

  /* form state */
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [urlLink,  setUrlLink]  = useState('/');
  const [sendMode, setSendMode] = useState<SendMode>('all');
  const [roleTarget, setRoleTarget] = useState('citizen');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId]   = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [userResults, setUserResults] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);

  /* data & status */
  const [tokens,   setTokens]   = useState<FCMToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [status,   setStatus]   = useState<Status>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  /* ── Fetch registered tokens ── */
  const fetchTokens = async () => {
    setLoadingTokens(true);
    const { data } = await supabase
      .from('fcm_tokens')
      .select('*, user:user_id(full_name, email, role)')
      .order('updated_at', { ascending: false });
    setTokens(
      (data || []).map((r: any) => ({
        ...r,
        user: Array.isArray(r.user) ? r.user[0] : r.user,
      }))
    );
    setLoadingTokens(false);
  };

  useEffect(() => { fetchTokens(); }, []);

  /* ── User search ── */
  useEffect(() => {
    if (userSearch.trim().length < 2) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%,phone.ilike.%${userSearch}%`)
        .limit(10);
      setUserResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  /* ── Determine target tokens ── */
  const targetTokens: FCMToken[] = (() => {
    if (sendMode === 'all')  return tokens;
    if (sendMode === 'role') return tokens.filter(t => t.user?.role === roleTarget);
    if (sendMode === 'user') return tokens.filter(t => t.user_id === selectedUserId);
    return [];
  })();

  /* ── Send via Supabase Edge Function ── */
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setStatus('error');
      setStatusMsg('Title and message body are required.');
      return;
    }
    if (targetTokens.length === 0) {
      setStatus('error');
      setStatusMsg('No registered devices found for the selected target.');
      return;
    }

    setStatus('sending');
    setStatusMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          title:    title.trim(),
          body:     body.trim(),
          url:      urlLink.trim() || '/',
          tokens:   targetTokens.map(t => t.token),
          sent_by:  user?.id,
        },
      });

      if (error) throw new Error(error.message);

      setStatus('success');
      setStatusMsg(`Successfully sent to ${data?.sent ?? targetTokens.length} device(s).`);

      // Reset form
      setTitle('');
      setBody('');
      setUrlLink('/');
    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err?.message || 'Failed to send notifications.');
    }
  };

  /* ── Styles ── */
  const card: React.CSSProperties = {
    background: 'var(--theme-component, #d9d9d9)',
    border: BORDER,
    borderRadius: 'var(--radius-lg, 12px)',
    padding: '18px 20px',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: BORDER,
    borderRadius: 'var(--radius-md, 8px)',
    background: 'var(--theme-bg, #fff4e7)',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
    color: 'var(--gray-900)',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.76rem',
    fontWeight: 800,
    color: 'var(--gray-600)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
  const modeBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 8px',
    border: `1.5px solid ${active ? PRIMARY : 'var(--theme-component-border, #bfbfbf)'}`,
    borderRadius: 'var(--radius-md, 8px)',
    background: active ? PRIMARY : 'var(--theme-bg, #fff4e7)',
    color: active ? '#fff' : 'var(--gray-700)',
    fontWeight: 800,
    fontSize: '0.78rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Header ── */}
      <div style={{ ...card, background: 'var(--header-gradient, linear-gradient(135deg,#4d0026,#660033,#800040))', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BellRing size={28} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>Push Notification Center</h2>
            <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.85 }}>
              Send real-time push alerts to citizens and staff via Firebase Cloud Messaging
            </p>
          </div>
        </div>
      </div>

      {/* ── Registered Devices ── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bell size={16} color={PRIMARY} /> Registered Devices
          </span>
          <button onClick={fetchTokens}
            style={{ background: 'none', border: BORDER, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 700 }}>
            <RefreshCw size={12} className={loadingTokens ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {loadingTokens ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>Loading devices…</p>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ background: PRIMARY, color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: '0.78rem', fontWeight: 800 }}>
              Total: {tokens.length}
            </span>
            {ROLES.map(r => {
              const count = tokens.filter(t => t.user?.role === r.value).length;
              if (!count) return null;
              return (
                <span key={r.value} style={{ background: 'var(--theme-bg, #fff4e7)', border: BORDER, borderRadius: 20, padding: '4px 12px', fontSize: '0.76rem', fontWeight: 700, color: PRIMARY }}>
                  {r.label}: {count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Compose Form ── */}
      <div style={card}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 900, color: 'var(--gray-900)' }}>
          📝 Compose Notification
        </h3>

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Notification Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Water supply disruption alert"
            style={inputStyle}
            maxLength={100}
          />
          <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 3, textAlign: 'right' }}>{title.length}/100</div>
        </div>

        {/* Body */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Message Body *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="e.g. Ward 12 water supply will be disrupted from 10am–2pm for maintenance."
            rows={3}
            maxLength={300}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 3, textAlign: 'right' }}>{body.length}/300</div>
        </div>

        {/* Deep Link URL */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Deep Link URL (optional)</label>
          <input
            value={urlLink}
            onChange={e => setUrlLink(e.target.value)}
            placeholder="/track  or  /complaint/new  or  /"
            style={inputStyle}
          />
          <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
            URL to open when user taps the notification.
          </p>
        </div>

        {/* Send Mode */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Send To</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={modeBtn(sendMode === 'all')}  onClick={() => setSendMode('all')}>
              <Users size={14} /> All Users
            </button>
            <button style={modeBtn(sendMode === 'role')} onClick={() => setSendMode('role')}>
              <MessageSquare size={14} /> By Role
            </button>
            <button style={modeBtn(sendMode === 'user')} onClick={() => setSendMode('user')}>
              <User size={14} /> Specific User
            </button>
          </div>
        </div>

        {/* Role picker */}
        {sendMode === 'role' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Select Role</label>
            <div style={{ position: 'relative' }}>
              <select
                value={roleTarget}
                onChange={e => setRoleTarget(e.target.value)}
                style={{ ...inputStyle, paddingRight: 32, appearance: 'none', cursor: 'pointer' }}
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--gray-500)' }} />
            </div>
          </div>
        )}

        {/* User picker */}
        {sendMode === 'user' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Search User</label>
            {selectedUserId ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--theme-bg,#fff4e7)', border: BORDER, borderRadius: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: PRIMARY }}>{selectedUserName}</span>
                <button onClick={() => { setSelectedUserId(''); setSelectedUserName(''); setUserSearch(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontWeight: 800 }}>✕</button>
              </div>
            ) : (
              <>
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name, email or phone..."
                  style={inputStyle}
                />
                {userResults.length > 0 && (
                  <div style={{ border: BORDER, borderRadius: 8, marginTop: 4, overflow: 'hidden', background: 'var(--theme-bg,#fff4e7)' }}>
                    {userResults.map(u => (
                      <button key={u.id}
                        onClick={() => { setSelectedUserId(u.id); setSelectedUserName(u.full_name || u.email || u.id); setUserResults([]); setUserSearch(''); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', border: 'none', borderBottom: '1px solid var(--theme-component-border,#bfbfbf)', background: 'none', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600 }}>
                        {u.full_name || 'Unnamed'} <span style={{ color: 'var(--gray-500)', fontSize: '0.76rem' }}>{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Target summary */}
        <div style={{ padding: '10px 14px', background: 'var(--theme-bg,#fff4e7)', border: BORDER, borderRadius: 8, marginBottom: 18, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={14} color={PRIMARY} />
          <span>
            This will send to <strong style={{ color: PRIMARY }}>{targetTokens.length} device(s)</strong>
            {sendMode === 'role' && <> with role <strong>{ROLES.find(r => r.value === roleTarget)?.label}</strong></>}
            {sendMode === 'user' && selectedUserName && <> — <strong>{selectedUserName}</strong></>}
          </span>
        </div>

        {/* Status banner */}
        {status !== 'idle' && (
          <div style={{
            padding: '11px 16px', borderRadius: 8, marginBottom: 14, fontSize: '0.85rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
            background: status === 'success' ? '#f0fdf4' : status === 'error' ? '#fef2f2' : 'var(--theme-bg,#fff4e7)',
            border: `1px solid ${status === 'success' ? '#bbf7d0' : status === 'error' ? '#fecaca' : BORDER}`,
            color: status === 'success' ? '#15803d' : status === 'error' ? '#dc2626' : PRIMARY,
          }}>
            {status === 'success' && <CheckCircle size={16} />}
            {status === 'error'   && <AlertCircle size={16} />}
            {status === 'sending' && <RefreshCw size={16} className="animate-spin" />}
            <span>{status === 'sending' ? `Sending to ${targetTokens.length} device(s)…` : statusMsg}</span>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={status === 'sending' || !title.trim() || !body.trim()}
          style={{
            width: '100%', padding: '13px 0', border: 'none',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--primary-gradient, linear-gradient(135deg,#660033,#800040))',
            color: '#fff', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: (status === 'sending' || !title.trim() || !body.trim()) ? 0.6 : 1,
            boxShadow: '0 4px 14px rgba(102,0,51,0.3)',
          }}
        >
          <Send size={16} />
          {status === 'sending' ? 'Sending…' : `Send Push Notification to ${targetTokens.length} Device(s)`}
        </button>
      </div>

      {/* ── Recent Token List ── */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 900 }}>📱 Registered Devices ({tokens.length})</h3>
        {tokens.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', textAlign: 'center', padding: 20 }}>
            No devices registered yet. Users must open the app and grant notification permission.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {tokens.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--theme-bg,#fff4e7)', border: BORDER, borderRadius: 8, fontSize: '0.8rem' }}>
                <div>
                  <span style={{ fontWeight: 800 }}>{t.user?.full_name || t.user?.email || 'Unknown'}</span>
                  <span style={{ color: 'var(--gray-500)', marginLeft: 8 }}>{t.user?.role}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', background: '#e0e7ff', color: '#3730a3', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>{t.platform}</span>
                  <span style={{ color: 'var(--gray-400)', fontSize: '0.72rem' }}>{new Date(t.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PushNotificationSender;
