import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import { FormInput } from './FormInput';
import { PasswordInput } from './PasswordInput';
import { AlertBanner } from './AlertBanner';

const STAFF_ROLES = [
  'dept_staff', 'admin', 'department_head', 'supervisor', 'control_room',
  'management_viewer', 'field_employee', 'municipal_administrator', 'verification_officer',
  'deputy_commissioner', 'area_officer', 'operational_staff',
];

interface Props {
  language: 'en' | 'hi';
}

export const LoginForm: React.FC<Props> = ({ language }) => {
  const navigate = useNavigate();
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
          .select('role, is_admin')
          .eq('id', data.user.id)
          .maybeSingle();

        const isAdmin =
          profile?.is_admin === true ||
          profile?.role === 'admin' ||
          profile?.role === 'municipal_administrator' ||
          cleanEmail === 'ouikey41@gmail.com';

        if (isAdmin) {
          navigate('/admin/dashboard', { replace: true });
          setLoading(false);
          return;
        }

        if (profile?.role && STAFF_ROLES.includes(profile.role)) {
          navigate('/dept/dashboard', { replace: true });
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
    style={{
      width: '100%',
      padding: '14px 0',
      borderRadius: 10,
      border: 'none',
      background: loading
        ? 'var(--gray-300)'
        : 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
      color: '#fff',
      fontWeight: 700,
      fontSize: 16,
      cursor: loading ? 'not-allowed' : 'pointer',
      marginTop: 8,
      boxShadow: '0 4px 16px rgba(102,0,51,0.3)',
      transition: 'opacity 0.15s',
    }}
  >
    {loading ? '...' : label}
  </button>
);
