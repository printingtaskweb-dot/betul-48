import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getStaffHomeRoute, isPlatformAdminProfile } from '../../lib/roleDefinitions';
import { supabase } from '../../lib/supabase';
import { Lock, ShieldCheck, LogIn, AlertCircle, ArrowRight } from 'lucide-react';
import { CivicHeader } from '../../components/common/CivicHeader';
import { getStaffPortalNavMeta, mergeUserRoleProfile } from '../../lib/roleDefinitions';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading, refreshProfile } = useAuth();
  const signedInPortal =
    user && !isAdmin
      ? getStaffPortalNavMeta(mergeUserRoleProfile(profile, user), user.email)
      : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If already logged in as admin, go straight to dashboard
  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both admin email and password.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authErr) throw authErr;

      if (data.user) {
        // Check Platform Admin role from profile (Municipal Commissioners use /dept/login)
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('id, role, authority_role, hierarchy_code, is_admin')
          .eq('id', data.user.id)
          .maybeSingle();

        const meta = (data.user.user_metadata as Record<string, unknown> | undefined) || {};
        const effectiveProfile = {
          role: prof?.role || (meta.role as string | undefined),
          authority_role: prof?.authority_role,
          hierarchy_code: prof?.hierarchy_code,
          is_admin: prof?.is_admin === true || meta.is_admin === true,
        };
        const isUserAdmin = isPlatformAdminProfile(effectiveProfile, cleanEmail);

        if (!isUserAdmin) {
          sessionStorage.removeItem('imc_admin');
          localStorage.removeItem('imc_admin');
          const staffHome = getStaffHomeRoute(effectiveProfile, cleanEmail);
          setError(
            staffHome !== '/'
              ? 'Platform Admin access required. Municipal Commissioners, Deputy Commissioners, and Department Staff must sign in via the Staff Login Portal below.'
              : 'Access Denied: This account is authenticated but does not have the Platform Administrator role.'
          );
          return;
        }

        sessionStorage.setItem('imc_admin', '1');
        localStorage.setItem('imc_admin', '1');

        await refreshProfile();
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in as administrator. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // While auth state is loading, show spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="text-civic-900 font-bold text-sm">Checking administrator authentication…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 text-civic-950 font-sans pb-16">
      <CivicHeader
        title="Admin Console"
        subtitle="Nagar Palika Parishad Betul • Central Administration"
        showBack
      />

      <div className="max-w-md mx-auto px-4 pt-10">
        <div className="bg-white rounded-3xl border border-sand-200 shadow-card overflow-hidden">
          <div className="bg-gradient-to-r from-civic-800 to-civic-950 p-6 text-center text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-2 text-white">
              <ShieldCheck size={26} />
            </div>
            <h1 className="text-lg font-extrabold tracking-tight">
              Administrator Login
            </h1>
            <p className="text-xs text-civic-200 mt-0.5">
              Municipal Corporation Admin Console
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            {signedInPortal && signedInPortal.kind !== 'citizen' && (
              <div className="p-3.5 rounded-2xl bg-civic-50 border border-civic-200 text-civic-900 text-xs font-semibold flex flex-col gap-2">
                <span>
                  You are signed in ({profile?.full_name || user?.email}). Open your dedicated workspace directly:
                </span>
                <Link
                  to={signedInPortal.route}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-civic-700 hover:bg-civic-800 text-white font-bold text-xs text-decoration-none self-start transition"
                >
                  <span>{signedInPortal.labelEn}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAdminSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@betulnagar.co.in"
                  className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer shadow-sm mt-2 ${
                  submitting
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-civic-700 hover:bg-civic-800 text-white'
                }`}
              >
                <LogIn size={16} />
                <span>{submitting ? 'Authenticating…' : 'Sign In to Admin Dashboard'}</span>
              </button>
            </form>

            <div className="p-3 rounded-2xl bg-sand-50 border border-sand-200 flex items-center gap-2.5 text-xs text-slate-600">
              <Lock size={15} className="text-civic-700 shrink-0" />
              <span>
                Department Staff: Please use the{' '}
                <Link to="/dept/login" className="font-bold text-civic-800 hover:underline">
                  Staff Login Portal
                </Link>
                .
              </span>
            </div>

            <p className="text-xs text-slate-400 text-center pt-2">
              Authorized municipal administrators only. All activity is audited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
