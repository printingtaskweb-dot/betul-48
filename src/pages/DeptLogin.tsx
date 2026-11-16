import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Building2, ArrowRight, Clock, LogOut } from 'lucide-react';
import { CivicHeader } from '../components/common/CivicHeader';
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

  /* Logged in, but account not approved yet (or not a staff account) */
  if (user && profile && !isStaff) {
    return (
      <div className="min-h-screen bg-sand-50 text-civic-950 font-sans pb-16 flex flex-col justify-between">
        <CivicHeader
          title={hi ? 'स्टाफ पोर्टल' : 'Department Portal'}
          subtitle={hi ? 'नगर पालिका परिषद बैतूल' : 'Nagar Palika Parishad Betul'}
          showBack
        />
        <div className="max-w-md mx-auto px-4 w-full py-12">
          <div className="bg-white rounded-3xl border border-sand-200 shadow-card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
              <Clock size={32} />
            </div>
            <h2 className="text-xl font-extrabold text-civic-950 tracking-tight">
              {isPending ? (hi ? 'अनुमोदन की प्रतीक्षा' : 'Awaiting Approval')
                         : (hi ? 'स्टाफ खाता नहीं मिला' : 'Not a Staff Account')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {isPending
                ? (hi ? 'आपका खाता अभी नोडल अधिकारी द्वारा अनुमोदित नहीं हुआ है।' : 'Your account has not been approved by the municipal administrator yet.')
                : (hi ? 'यह खाता स्टाफ के रूप में पंजीकृत नहीं है। कृपया एडमिन से संपर्क करें।'
                      : 'This account is not registered as staff. Please contact your admin.')}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-3.5 rounded-2xl bg-civic-700 hover:bg-civic-800 text-white font-bold text-sm shadow-sm transition active:scale-[0.99] cursor-pointer"
              >
                {hi ? 'होम पर जाएं' : 'Go to Home'}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-3 rounded-2xl bg-sand-50 hover:bg-civic-50 text-civic-900 border border-sand-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut size={14} />
                <span>{hi ? 'लॉगआउट करें' : 'Log out / Switch User'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 text-civic-950 font-sans pb-16">
      <CivicHeader
        title={hi ? 'स्टाफ पोर्टल' : 'Department Portal'}
        subtitle={hi ? 'नगर पालिका परिषद बैतूल • विभागीय कंसोल' : 'Nagar Palika Parishad Betul • Staff Console'}
        showBack
      />

      <div className="max-w-md mx-auto px-4 pt-10">
        <div className="bg-white rounded-3xl border border-sand-200 shadow-card overflow-hidden">
          <div className="bg-gradient-to-r from-civic-800 to-civic-900 p-6 text-center text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-2 text-white">
              <Building2 size={24} />
            </div>
            <h1 className="text-lg font-extrabold tracking-tight">
              {hi ? 'विभागीय स्टाफ लॉगिन' : 'Department Staff Login'}
            </h1>
            <p className="text-xs text-civic-200 mt-0.5">
              {hi ? 'फील्ड इंजीनियर व विभागीय अधिकारी' : 'Field Engineers & Ward Inspectors'}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            <AlertBanner type="error" message={error} />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                {hi ? 'स्टाफ आईडी / विभाग कोड या ईमेल *' : 'Staff ID / Dept ID or Email *'}
              </label>
              <FormInput
                icon={Building2}
                type="text"
                placeholder={hi ? 'उदा. ENG-04 या email@betulnagar.co.in' : 'e.g. ENG-04 or email'}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                {hi ? 'पासवर्ड *' : 'Password *'}
              </label>
              <PasswordInput
                placeholder={hi ? 'पासवर्ड दर्ज करें' : 'Enter password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className={`w-full py-3.5 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer shadow-sm mt-2 ${
                loading
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-civic-700 hover:bg-civic-800 text-white'
              }`}
            >
              {loading ? (hi ? 'कृपया प्रतीक्षा करें…' : 'Please wait…')
                       : <>{hi ? 'लॉग इन करें' : 'Log In'} <ArrowRight size={16} /></>}
            </button>

            <p className="text-xs text-slate-400 text-center pt-2">
              {hi ? 'खाता और स्टाफ आईडी नगर पालिका एडमिन द्वारा प्रदान किए जाते हैं।'
                  : 'Account & Staff ID credentials are provided by your administrator.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
