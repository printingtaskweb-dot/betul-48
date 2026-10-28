import React, { useState, useEffect, useCallback, Component, lazy, Suspense } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { SeoHead } from './components/SeoHead';

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const LocalNewsPage = lazy(() => import('./pages/LocalNewsPage').then((module) => ({ default: module.LocalNewsPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ComplaintForm = lazy(() => import('./pages/ComplaintForm').then((module) => ({ default: module.ComplaintForm })));
const TrackComplaint = lazy(() => import('./pages/TrackComplaint').then((module) => ({ default: module.TrackComplaint })));
const CitizenCallbackPage = lazy(() => import('./pages/CitizenCallbackPage'));
const GreenDepartmentPage = lazy(() => import('./pages/GreenDepartmentPage').then((module) => ({ default: module.GreenDepartmentPage })));
const DeptLogin = lazy(() => import('./pages/DeptLogin'));
const DeptDashboard = lazy(() => import('./pages/DeptDashboard'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then((module) => ({ default: module.AdminLogin })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const MunicipalAdministratorDashboard = lazy(() => import('./pages/admin/MunicipalAdministratorDashboard'));
const FCMRegistrar = lazy(() => import('./components/FCMRegistrar').then((module) => ({ default: module.FCMRegistrar })));
const NotificationPrompt = lazy(() => import('./components/NotificationPrompt').then((module) => ({ default: module.NotificationPrompt })));

const RouteLoading: React.FC = () => (
  <div role="status" aria-live="polite" style={{ minHeight: '45vh', display: 'grid', placeItems: 'center', color: 'var(--theme-primary, #146C94)', fontWeight: 700 }}>
    Loading…
  </div>
);

const DeferredNotificationFeatures: React.FC = () => {
  const [promptReady, setPromptReady] = useState(false);
  const [registrarReady, setRegistrarReady] = useState(false);

  useEffect(() => {
    let promptTimer: number;
    let registrarTimer: number;
    const schedule = () => {
      // The notification UI is non-critical; token refresh can wait until after LCP.
      promptTimer = window.setTimeout(() => setPromptReady(true), 500);
      registrarTimer = window.setTimeout(() => setRegistrarReady(true), 8000);
    };

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      window.removeEventListener('load', schedule);
      window.clearTimeout(promptTimer);
      window.clearTimeout(registrarTimer);
    };
  }, []);

  return (
    <>
      {promptReady && <Suspense fallback={null}><NotificationPrompt /></Suspense>}
      {registrarReady && <Suspense fallback={null}><FCMRegistrar /></Suspense>}
    </>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: '#F6F1F1',
            fontFamily: 'sans-serif',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              background: '#d9d9d9',
              padding: '32px 24px',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              border: '1.5px solid #bfbfbf',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 48, color: '#f59e0b' }}>warning</span>
            </div>
            <h2 style={{ color: '#146C94', margin: '0 0 10px', fontWeight: 800 }}>
              Application Encountered an Error
            </h2>
            <p style={{ color: '#383838', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering the page.'}
            </p>
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.reload();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #146C94, #0E526F)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>sync</span>
              <span>Refresh Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppRoutes: React.FC = () => (
  <Suspense fallback={<RouteLoading />}>
  <SeoHead />
  <Routes>
    {/* Citizen routes */}
    <Route path="/" element={<Home />} />
    <Route path="/news" element={<LocalNewsPage />} />
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/complaint/new" element={<ComplaintForm />} />
    <Route path="/track" element={<TrackComplaint />} />
    <Route path="/callback" element={<CitizenCallbackPage />} />

    {/* Department-specific routes */}
    <Route path="/department/green" element={<GreenDepartmentPage />} />

    {/* Department Portal (staff login + dashboard) */}
    <Route path="/dept/login" element={<DeptLogin />} />
    <Route path="/dept/dashboard" element={<DeptDashboard />} />

    {/* Admin routes */}
    <Route path="/admin" element={<AdminLogin />} />
    <Route path="/admin/dashboard" element={<AdminDashboard />} />
    <Route path="/municipal/dashboard" element={<MunicipalAdministratorDashboard />} />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
  </Suspense>
);

const App: React.FC = () => {
  const [splashDone, setSplashDone] = useState(false);
  const alreadyShown = sessionStorage.getItem('splash_shown');

  useEffect(() => {
    if (alreadyShown) setSplashDone(true);
  }, [alreadyShown]);

  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem('splash_shown', '1');
    setSplashDone(true);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <DeferredNotificationFeatures />
        <div className="grain" />
        {!splashDone && <SplashScreen onDone={handleSplashDone} />}
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
