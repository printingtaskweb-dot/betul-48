import React, { useState, useEffect, useCallback, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './pages/Home';
import { ComplaintForm } from './pages/ComplaintForm';
import { TrackComplaint } from './pages/TrackComplaint';
import { AuthPage } from './pages/AuthPage';
import { GreenDepartmentPage } from './pages/GreenDepartmentPage';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import DeptLogin from './pages/DeptLogin';
import DeptDashboard from './pages/DeptDashboard';
import MunicipalAdministratorDashboard from './pages/admin/MunicipalAdministratorDashboard';
import ProfilePage from './pages/ProfilePage';
import { FloatingNewsWidget } from './components/FloatingNewsWidget';
import { FCMRegistrar } from './components/FCMRegistrar';
import { NotificationPrompt } from './components/NotificationPrompt';
import CitizenCallbackPage from './pages/CitizenCallbackPage';

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
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
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
              🔄 Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppRoutes: React.FC = () => (
  <Routes>
    {/* Citizen routes */}
    <Route path="/" element={<Home />} />
    <Route path="/news" element={<Home />} />
    <Route path="/auth" element={<AuthPage />} />
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
        <FCMRegistrar />
        <div className="grain" />
        {!splashDone && <SplashScreen onDone={handleSplashDone} />}
        <BrowserRouter>
          <AppRoutes />
          <FloatingNewsWidget />
          <NotificationPrompt />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
