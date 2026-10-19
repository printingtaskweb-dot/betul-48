import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Building2, ArrowRight, Clock, LogOut } from 'lucide-react';

import { FormInput } from '../components/auth/FormInput';
import { PasswordInput } from '../components/auth/PasswordInput';
import { AlertBanner } from '../components/auth/AlertBanner';

const STAFF_ROLES = [
  'dept_staff', 'admin', 'department_head', 'supervisor', 'control_room',
  'management_viewer', 'field_employee', 'municipal_administrator',
  'deputy_commissioner', 'area_officer', 'operational_staff', 'verification_officer',
];

export default function DeptLogin() {
  const { user, profile, signOut, language: rawLang } = useAuth();
  const navigate = useNavigate();
  const hi = rawLang === 'hi';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const role = profile?.role;
  const isPending = role === 'pending_staff';
  const isStaff = !!role && STAFF_ROLES.includes(role);

  useEffect(() => {
    if (user && profile && isStaff) navigate('/dept/dashboard', { replace: true });
  }, [user, profile, isStaff, navigate]);

  const handleLogin = async () => {
    const idInput = identifier.trim();
    if (!idInput) { setError(hi ? 'स्टाफ आईडी या ईमेल आवश्यक है' : 'Staff ID / Dept ID or Email is required'); return; }
    if (!password) { setError(hi ? 'पासवर्ड आवश्यक है' : 'Password is required'); return; }

    setLoading(true); setError('');
    try {
      let mail = idInput.toLowerCase();
      if (!mail.includes('@')) {
        // Query user_profiles by staff_code
        const { data: userProf, error: profErr } = await supabase
          .from('user_profiles')
          .select('email')
          .ilike('staff_code', idInput)
          .maybeSingle();

        if (profErr) throw profErr;
        if (!userProf?.email) {
          throw new Error(
            hi
              ? `स्टाफ आईडी "${idInput}" का कोई खाता नहीं मिला। कृपया अपने एडमिन से संपर्क करें।`
              : `No account found for Staff ID "${idInput}". Please contact your admin.`
          );
        }
        mail = userProf.email.toLowerCase();
      }

      const { error: signErr } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (signErr) throw signErr;
      navigate('/dept/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
    } finally { setLoading(false); }
  };

  const handleSignOut = async () => {
    await signOut();
    setIdentifier(''); setPassword(''); setError('');
  };

  const pageBg = 'var(--header-gradient, linear-gradient(135deg, #0E526F 0%, #146C94 50%, #0E526F 100%))';
  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: 13, border: 'none', borderRadius: 'var(--radius-md)',
    background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))', color: '#fff', fontWeight: 800,
    fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(102,0,51,0.35)',
  };
  const linkBtn: React.CSSProperties = {
    marginTop: 10, width: '100%', padding: 10, border: 'none', background: 'none',
    color: 'var(--gray-700)', fontSize: '0.82rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  };

  /* Logged in, but account not approved yet (or not a staff account) */
  if (user && profile && !isStaff) {
    return (
      <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 36, textAlign: 'center', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--theme-bg, #F6F1F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
            <Clock size={32} color={isPending ? 'var(--status-pending)' : 'var(--theme-primary, #146C94)'} />
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.25rem', fontWeight: 900 }}>
            {isPending ? (hi ? 'अनुमोदन की प्रतीक्षा' : 'Awaiting Approval')
                       : (hi ? 'स्टाफ खाता नहीं मिला' : 'Not a staff account')}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--gray-600)', lineHeight: 1.7 }}>
            {isPending
              ? (hi ? 'आपका खाता अभी अनुमोदित नहीं हुआ है।' : 'Your account has not been approved yet.')
              : (hi ? 'यह खाता स्टाफ के रूप में पंजीकृत नहीं है। कृपया एडमिन से संपर्क करें।'
                    : 'This account is not registered as staff. Please contact your admin.')}
          </p>
          <button onClick={() => navigate('/')} style={btnPrimary}>{hi ? 'होम पर जाएं' : 'Go to Home'}</button>
          <button onClick={handleSignOut} style={linkBtn}>
            <LogOut size={13} /> {hi ? 'लॉगआउट करें' : 'Log out / Switch User'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
        <div style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))', padding: '22px 26px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Building2 size={26} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
            {hi ? 'स्टाफ लॉगिन' : 'Staff Login'}
          </h1>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          <AlertBanner type="error" message={error} />

          <FormInput icon={Building2} type="text"
            placeholder={hi ? 'स्टाफ आईडी / विभाग कोड या ईमेल *' : 'Staff ID / Dept ID or Email *'}
            value={identifier} onChange={e => setIdentifier(e.target.value)} />
          <PasswordInput
            placeholder={hi ? 'पासवर्ड *' : 'Password *'}
            value={password} onChange={e => setPassword(e.target.value)} />

          <button type="button" onClick={handleLogin} disabled={loading}
            style={{ ...btnPrimary, marginTop: 12, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? (hi ? 'कृपया प्रतीक्षा करें…' : 'Please wait…')
                     : <>{hi ? 'लॉग इन' : 'Log in'} <ArrowRight size={15} /></>}
          </button>

          <p style={{ margin: '14px 0 0', fontSize: '0.75rem', color: 'var(--gray-500)', textAlign: 'center' }}>
            {hi ? 'खाता और स्टाफ आईडी एडमिन द्वारा प्रदान किए जाते हैं।'
                : 'Account & Staff ID are provided by your administrator.'}
          </p>

          <button type="button" onClick={() => navigate('/')}
            style={{ ...linkBtn, marginTop: 12 }}>
            <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} />
            {hi ? 'होम पर वापस जाएं' : 'Back to Home'}
          </button>
        </div>
      </div>
    </div>
  );
}
