import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';
import { FormInput } from '../components/auth/FormInput';
import { AlertBanner } from '../components/auth/AlertBanner';

const buttonStyle: React.CSSProperties = {
  width: '100%', padding: '13px 16px', border: 0, borderRadius: 10,
  color: '#fff', background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
  fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 6,
};

export default function ForgotPasswordPage() {
  const { language, setLanguage } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const hi = language === 'hi';

  const sendCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setLoading(true);
    setError('');
    const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setSent(true);
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'recovery',
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    navigate('/reset-password', { replace: true });
  };

  return (
    <AuthLayout language={language} onLanguageChange={setLanguage}>
      <AuthCard>
        <div style={{ padding: 24 }}>
          <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--theme-primary, #146C94)', textDecoration: 'none', fontSize: 13, fontWeight: 700, marginBottom: 18 }}>
            <ArrowLeft size={15} /> {hi ? 'लॉगिन पर वापस जाएं' : 'Back to login'}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Mail size={22} color="var(--theme-primary, #146C94)" />
            <h2 style={{ margin: 0, color: 'var(--gray-900)', fontSize: 21, fontWeight: 900 }}>
            {hi ? 'पासवर्ड रीसेट करें' : 'Reset your password'}
            </h2>
          </div>
          <p style={{ margin: '0 0 18px', color: 'var(--gray-600)', fontSize: 13, lineHeight: 1.55 }}>
            {hi ? 'अपना ईमेल दर्ज करें। हम आपके ईमेल पर पासवर्ड रीसेट करने के लिए एक OTP भेजेंगे।' : 'Enter your account email and we’ll send a one-time code to verify it.'}
          </p>

          {sent ? (
            <>
              <AlertBanner type="success" message={hi ? `यदि ${email.trim()} से खाता मौजूद है, तो OTP भेज दिया गया है। अपना इनबॉक्स देखें।` : `If an account exists for ${email.trim()}, a one-time code has been sent. Check your inbox.`} />
              <form onSubmit={(event) => void verifyCode(event)}>
                <FormInput
                  required
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6,8}"
                  maxLength={8}
                  icon={KeyRound}
                  placeholder={hi ? '6 अंकों का OTP' : '6-digit OTP'}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))}
                />
                <AlertBanner type="error" message={error} />
                <button type="submit" disabled={loading || otp.length < 6} style={{ ...buttonStyle, opacity: loading || otp.length < 6 ? 0.7 : 1 }}>
                  {loading ? (hi ? 'जांच रहे हैं…' : 'Verifying…') : (hi ? 'OTP सत्यापित करें' : 'Verify code')}
                </button>
              </form>
              <button type="button" disabled={loading} onClick={() => void sendCode()} style={{ width: '100%', marginTop: 12, border: 0, background: 'transparent', color: 'var(--theme-primary, #146C94)', fontWeight: 700, cursor: 'pointer' }}>
                {hi ? 'नया OTP भेजें' : 'Resend code'}
              </button>
            </>
          ) : (
            <form onSubmit={(event) => void sendCode(event)}>
              <AlertBanner type="error" message={error} />
              <FormInput
                required
                type="email"
                autoComplete="email"
                icon={Mail}
                placeholder={hi ? 'ईमेल पता' : 'Email address'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>
                {loading ? (hi ? 'भेज रहे हैं…' : 'Sending…') : (hi ? 'OTP भेजें' : 'Send code')}
              </button>
            </form>
          )}
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
