import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email?: string | null;
  full_name: string | null;
  phone: string | null;
  language: 'en' | 'hi';
  ward_number: string | null;
  is_admin?: boolean;
  role?: string | null;
  linked_department_id?: string | null;
  authority_role?: string | null;
  hierarchy_code?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  language: 'en' | 'hi';
  setLanguage: (lang: 'en' | 'hi') => void;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DESIGNATED_ADMIN_EMAILS = ['ouikey41@gmail.com'];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [language, setLanguageState] = useState<'en' | 'hi'>(
    (localStorage.getItem('imc_lang') as 'en' | 'hi') || 'en'
  );
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) {
        setProfile(data);
        if (data.language) setLanguageState(data.language);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    }).catch((err) => {
      console.warn('Auth session fetch error:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setLanguage = (lang: 'en' | 'hi') => {
    setLanguageState(lang);
    localStorage.setItem('imc_lang', lang);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('imc_admin');
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const userEmail = user?.email?.toLowerCase();
  const isAdmin = Boolean(
    profile?.is_admin === true ||
    (userEmail && DESIGNATED_ADMIN_EMAILS.includes(userEmail)) ||
    sessionStorage.getItem('imc_admin') === '1'
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isAdmin,
        language,
        setLanguage,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
