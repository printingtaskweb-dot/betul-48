import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStaffPortalNavMeta, mergeUserRoleProfile } from '../lib/roleDefinitions';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthTabs } from '../components/auth/AuthTabs';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { GuestButton } from '../components/auth/GuestButton';


type Mode = 'login' | 'register';

export const AuthPage: React.FC = () => {
  const { language, setLanguage, user, profile, isAdmin } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi'>(language);

  const effectiveProfile = mergeUserRoleProfile(profile, user);
  const portalMeta = user
    ? isAdmin
      ? getStaffPortalNavMeta({ role: 'admin', is_admin: true }, user.email)
      : getStaffPortalNavMeta(effectiveProfile, user.email)
    : null;
  const activeRoute = portalMeta && portalMeta.kind !== 'citizen' ? portalMeta.route : '/profile';
  const activeLabel =
    portalMeta && portalMeta.kind !== 'citizen'
      ? selectedLang === 'hi'
        ? portalMeta.labelHi
        : portalMeta.labelEn
      : selectedLang === 'hi'
      ? 'मेरी प्रोफ़ाइल'
      : 'My Profile';

  const handleLanguageChange = (lang: 'en' | 'hi') => {
    setSelectedLang(lang);
    setLanguage(lang);
  };

  return (
    <AuthLayout language={selectedLang} onLanguageChange={handleLanguageChange}>
      <AuthCard>
        {user && (
          <div
            style={{
              margin: '16px 24px 0',
              padding: '12px 14px',
              borderRadius: 12,
              background: '#f0f7f9',
              border: '1px solid #b7dae4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f2531' }}>
              {selectedLang === 'hi' ? 'आप पहले से लॉगिन हैं:' : 'Signed in as:'}{' '}
              <span style={{ color: '#146C94' }}>{profile?.full_name || user.email}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link
                to={activeRoute}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: '#146C94',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                {activeLabel}
              </Link>
              <Link
                to="/profile"
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: '#fff',
                  color: '#146C94',
                  border: '1px solid #b7dae4',
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                {selectedLang === 'hi' ? 'प्रोफ़ाइल' : 'Profile'}
              </Link>
            </div>
          </div>
        )}
        <AuthTabs
          mode={mode}
          onChange={(m) => setMode(m)}
          language={selectedLang}
        />
        <div style={{ padding: '24px 24px' }}>
          {mode === 'login' ? (
            <LoginForm language={selectedLang} />
          ) : (
            <RegisterForm language={selectedLang} selectedLang={selectedLang} />
          )}
          <GuestButton language={selectedLang} />
        </div>
      </AuthCard>
    </AuthLayout>
  );
};

export default AuthPage;
