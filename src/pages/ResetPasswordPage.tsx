import React, { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';
import { PasswordInput } from '../components/auth/PasswordInput';
import { AlertBanner } from '../components/auth/AlertBanner';

const buttonStyle: React.CSSProperties = {
  width: '100%', padding: '13px 16px', border: 0, borderRadius: 10,
  color: '#fff', background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
  fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 6,
};

export default function ResetPasswordPage() {
  const { language, setLanguage } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(false);
  const hi = language === 'hi';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(hi ? 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।' : 'Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError(hi ? 'दोनों पासवर्ड मेल नहीं खाते।' : 'The passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setUpdated(true);
  };

  return (
    <AuthLayout language={language} onLanguageChange={setLanguage}>
      <AuthCard>
        <div style={{ padding: 24 }}>
          <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--theme-primary, #146C94)', textDecoration: 'none', fontSize: 13, fontWeight: 700, marginBottom: 18 }}>
            <ArrowLeft size={15} /> {hi ? 'लॉगिन पर वापस जाएं' : 'Back to login'}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Lock size={22} color="var(--theme-primary, #146C94)" />
            <h2 style={{ margin: 0, color: 'var(--gray-900)', fontSize: 21, fontWeight: 900 }}>
              {hi ? 'नया पासवर्ड बनाएं' : 'Choose a new password'}
            </h2>
          </div>

          {updated ? (
            <>
              <AlertBanner type="success" message={hi ? 'आपका पासवर्ड अपडेट हो गया है। अब नए पासवर्ड से लॉगिन करें।' : 'Your password has been updated. You can now sign in with your new password.'} />
              <button type="button" onClick={() => navigate('/auth', { replace: true })} style={buttonStyle}>
                {hi ? 'लॉगिन करें' : 'Go to login'}
              </button>
            </>
          ) : (
            <form onSubmit={(event) => void submit(event)} style={{ marginTop: 16 }}>
              <AlertBanner type="error" message={error} />
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={hi ? 'नया पासवर्ड (कम से कम 8 अक्षर)' : 'New password (at least 8 characters)'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={hi ? 'नए पासवर्ड की पुष्टि करें' : 'Confirm new password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>
                {loading ? (hi ? 'अपडेट हो रहा है…' : 'Updating…') : (hi ? 'पासवर्ड अपडेट करें' : 'Update password')}
              </button>
            </form>
          )}
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
