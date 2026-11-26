import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getStaffHomeRoute, isPlatformAdminProfile } from '../../lib/roleDefinitions';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../lib/i18n';
import { FormInput } from './FormInput';
import { PasswordInput } from './PasswordInput';
import { AlertBanner } from './AlertBanner';

interface Props {
  language: 'en' | 'hi';
}

export const LoginForm: React.FC<Props> = ({ language }) => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }

      // Check URL redirect parameter
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');
      if (redirectUrl) {
        navigate(redirectUrl, { replace: true });
        setLoading(false);
        return;
      }

      // Smart role-based redirect
      if (data.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, authority_role, hierarchy_code, is_admin')
          .eq('id', data.user.id)
          .maybeSingle();

        const meta = (data.user.user_metadata as Record<string, unknown> | undefined) || {};
        const effectiveProfile = {
          role: profile?.role || (meta.role as string | undefined),
          authority_role: profile?.authority_role,
          hierarchy_code: profile?.hierarchy_code,
          is_admin: profile?.is_admin === true || meta.is_admin === true,
        };

        if (isPlatformAdminProfile(effectiveProfile, cleanEmail)) {
          sessionStorage.setItem('imc_admin', '1');
          localStorage.setItem('imc_admin', '1');
          await refreshProfile();
          navigate('/admin/dashboard', { replace: true });
          setLoading(false);
          return;
        }

        const staffHome = getStaffHomeRoute(effectiveProfile, cleanEmail);
        if (staffHome !== '/') {
          navigate(staffHome, { replace: true });
          setLoading(false);
          return;
        }
      }

      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <AlertBanner type="error" message={error} />
      <FormInput
        required
        type="email"
        icon={Mail}
        placeholder={t(language, 'email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordInput
        required
        placeholder={t(language, 'password')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -5, marginBottom: 12 }}>
        <Link to="/forgot-password" style={{ color: 'var(--theme-primary, #146C94)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          {language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
        </Link>
      </div>
      <SubmitButton loading={loading} label={t(language, 'login')} />
    </form>
  );
};

// shared button
const SubmitButton: React.FC<{ loading: boolean; label: string }> = ({
  loading,
  label,
}) => (
  <button
    type="submit"
    disabled={loading}
    className={`w-full py-3.5 rounded-2xl font-bold text-sm sm:text-base transition active:scale-[0.99] cursor-pointer shadow-sm mt-2 ${
      loading
        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
        : 'bg-civic-700 hover:bg-civic-800 text-white'
    }`}
  >
    {loading ? '...' : label}
  </button>
);
