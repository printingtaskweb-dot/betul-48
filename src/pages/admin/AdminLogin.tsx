import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Lock, ArrowLeft, ShieldCheck, LogIn, AlertCircle } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, refreshProfile } = useAuth();

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
        // Check admin role from profile
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('id, role, is_admin')
          .eq('id', data.user.id)
          .maybeSingle();

        const isUserAdmin =
          prof?.is_admin === true ||
          prof?.role === 'admin' ||
          prof?.role === 'municipal_administrator' ||
          cleanEmail === 'ouikey41@gmail.com';

        if (isUserAdmin) {
          sessionStorage.setItem('imc_admin', '1');
        }

        await refreshProfile();
        // Redirect directly to admin dashboard
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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--header-gradient, linear-gradient(135deg, #0E526F 0%, #146C94 50%, #0E526F 100%))',
        }}
      >
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Checking administrator authentication…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--header-gradient, linear-gradient(135deg, #0E526F 0%, #146C94 50%, #0E526F 100%))',
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'var(--theme-component, #d9d9d9)',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(28px, 4vw, 40px) clamp(20px, 3vw, 36px)',
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.84rem',
            color: 'var(--gray-700)',
            marginBottom: 20,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Back to Citizen Portal
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--theme-bg, #F6F1F1)',
              color: 'var(--theme-primary, #146C94)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
            }}
          >
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--gray-900)' }}>
            Admin Console
          </h2>
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.85rem' }}>
            Municipal Corporation Administration Portal
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: '0.85rem',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdminSignIn}>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--gray-700)',
                marginBottom: 6,
              }}
            >
              Admin Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@imc.gov.in"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-bg, #F6F1F1)',
                fontSize: '0.9rem',
                color: 'var(--gray-900)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--gray-700)',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-bg, #F6F1F1)',
                fontSize: '0.9rem',
                color: 'var(--gray-900)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: submitting ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(102,0,51,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: submitting ? 0.75 : 1,
            }}
          >
            <LogIn size={16} /> {submitting ? 'Authenticating…' : 'Sign In to Admin Dashboard'}
          </button>
        </form>

        <div
          style={{
            marginTop: 18,
            padding: '10px 12px',
            background: 'var(--theme-bg, #F6F1F1)',
            border: '1px solid var(--theme-component-border, #bfbfbf)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            color: 'var(--gray-700)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Lock size={14} color="var(--theme-primary, #146C94)" style={{ flexShrink: 0 }} />
          <span>Department Heads & Staff: Please use the <strong><Link to="/dept/login" style={{ color: 'var(--theme-primary, #146C94)' }}>Department Login Portal</Link></strong>.</span>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '0.78rem', color: 'var(--gray-500)', margin: '18px 0 0' }}>
          Authorized municipal administrators only. All activity is audited.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
