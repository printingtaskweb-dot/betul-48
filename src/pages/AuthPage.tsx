import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/auth/AuthCard';
import { AuthTabs } from '../components/auth/AuthTabs';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { GuestButton } from '../components/auth/GuestButton';


type Mode = 'login' | 'register';

export const AuthPage: React.FC = () => {
  const { language, setLanguage } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi'>(language);

  const handleLanguageChange = (lang: 'en' | 'hi') => {
    setSelectedLang(lang);
    setLanguage(lang);
  };

  return (
    <AuthLayout language={selectedLang} onLanguageChange={handleLanguageChange}>
      <AuthCard>
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
