import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { isPlatformAdminProfile } from '../lib/roleDefinitions';
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
  assigned_ward_id?: string | null;
  authority_role?: string | null;
  hierarchy_code?: string | null;
  city_id?: string | null;
  can_export_data?: boolean;
  is_available?: boolean;
  unavailability_reason?: string | null;
  last_sync_at?: string | null;
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
        .maybeSingle();
      if (data) {
        setProfile(data);
        if (isPlatformAdminProfile(data, data.email)) {
          sessionStorage.setItem('imc_admin', '1');
          localStorage.setItem('imc_admin', '1');
        } else {
          sessionStorage.removeItem('imc_admin');
          localStorage.removeItem('imc_admin');
        }
        if (data.language) setLanguageState(data.language);
      } else {
        sessionStorage.removeItem('imc_admin');
        localStorage.removeItem('imc_admin');
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        sessionStorage.removeItem('imc_admin');
        localStorage.removeItem('imc_admin');
      }
      setLoading(false);
    }).catch((err) => {
      console.warn('Auth session fetch error:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        sessionStorage.removeItem('imc_admin');
        localStorage.removeItem('imc_admin');
        setProfile(null);
      }
      setLoading(false);
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
    localStorage.removeItem('imc_admin');
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const meta = (user?.user_metadata as Record<string, unknown> | undefined) || {};
  const isAdmin = Boolean(
    user &&
      isPlatformAdminProfile(
        {
          role: profile?.role || (meta.role as string | undefined),
          authority_role: profile?.authority_role,
          hierarchy_code: profile?.hierarchy_code,
          is_admin: profile?.is_admin === true || meta.is_admin === true,
        },
        user?.email
      )
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
