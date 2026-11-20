import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../../contexts/AuthContext';

interface AuthCheckerProps {
  children: React.ReactNode;
}

const PUBLIC_AUTH_PATHS = [
  '/auth',
  '/forgot-password',
  '/reset-password',
  '/dept/login',
  '/admin',
];

export const AuthChecker: React.FC<AuthCheckerProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  const isPublicAuthRoute = PUBLIC_AUTH_PATHS.some((path) =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    if (loading) return;

    // 1. On Native Mobile APK: Login/Register is mandatory for all app access
    if (isNative && !user && !isPublicAuthRoute) {
      navigate('/auth', { replace: true, state: { from: location.pathname } });
      return;
    }

    // 2. On Web: Enforce login for personal and transactional routes
    const requiresWebAuth = [
      '/complaint/new',
      '/profile',
    ].some((path) => location.pathname.startsWith(path));

    if (!isNative && !user && requiresWebAuth) {
      navigate('/auth', { replace: true, state: { from: location.pathname } });
    }
  }, [user, loading, isNative, isPublicAuthRoute, location.pathname, navigate]);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--theme-bg, #F6F1F1)',
          color: 'var(--theme-primary, #146C94)',
          fontWeight: 800,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid #e2e8f0',
              borderTopColor: '#146C94',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div>Loading Betul 311…</div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If mobile and not logged in and trying to view app, prevent flash
  if (isNative && !user && !isPublicAuthRoute) {
    return null;
  }

  return <>{children}</>;
};

export default AuthChecker;
