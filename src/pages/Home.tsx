import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { HeroBanner } from '../components/HeroBanner';
import { StatsSection } from '../components/StatsSection';
import { ServicesGrid } from '../components/ServicesGrid';
import { RecentComplaints } from '../components/RecentComplaints';
import { BottomNav } from '../components/BottomNav';
import { Globe, LogOut, Building2 } from 'lucide-react';

export const Home: React.FC = () => {
  const { language, setLanguage, user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--theme-bg, #fff4e7)', paddingBottom: 80 }}>
      {/* ── Top Bar / Header ── */}
      <header
        style={{
          background: 'var(--theme-component, #d9d9d9)',
          borderBottom: '1.5px solid var(--theme-component-border, #bfbfbf)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="app-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          {/* Logo & City Title */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                boxShadow: '0 2px 8px rgba(102,0,51,0.3)',
              }}
            >
              🏛️
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  color: 'var(--theme-primary, #660033)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                JILA BETUL 
              </p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 500 }}>
                {language === 'hi' ? 'ननागरिक समाधान साथी' : 'Citizen Support Partner'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links (Visible on screens >= 1024px) */}
          <nav className="desktop-nav-links" style={{ gap: 20, alignItems: 'center' }}>
            <Link
              to="/complaint/new"
              style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gray-700)', transition: 'var(--transition)' }}
            >
              {t(language, 'reportIssue')}
            </Link>
            <Link
              to="/department/green"
              style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--theme-primary, #660033)', transition: 'var(--transition)' }}
            >
              🌿 {language === 'hi' ? 'हरित कचरा' : 'Green Waste'}
            </Link>
            <Link
              to="/track"
              style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gray-700)', transition: 'var(--transition)' }}
            >
              {t(language, 'trackComplaint')}
            </Link>
            <Link
              to="/dept/login"
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--theme-primary, #660033)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'var(--transition)',
              }}
            >
              <Building2 size={15} />
              {language === 'hi' ? 'विभाग पोर्टल' : 'Dept Portal'}
            </Link>
          </nav>

          {/* Actions: Language Toggle, Profile/Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-component, #d9d9d9)',
                color: 'var(--theme-primary, #660033)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              title="Switch Language"
            >
              <Globe size={14} />
              {language === 'en' ? 'हिन्दी' : 'English'}
            </button>

            {/* User Avatar / Login */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link
                  to="/profile"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    boxShadow: 'var(--shadow-sm)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                  title={user.email || 'User Profile'}
                >
                  {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    border: 'none',
                    background: 'var(--gray-100)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    padding: 7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={t(language, 'logout')}
                >
                  <LogOut size={16} color="var(--gray-600)" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {t(language, 'login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Carousel ── */}
      <HeroBanner />

      {/* ── Quick Action Cards ── */}
      <section className="app-container" style={{ marginTop: 20 }}>
        <div className="two-col-responsive">
          <Link to="/complaint/new" style={{ textDecoration: 'none' }}>
            <div
              className="card-hover"
              style={{
                background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(16px, 2.5vw, 24px)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: '0 8px 24px rgba(22,163,74,0.22)',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                }}
              >
                📸
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 'clamp(1rem, 1.2vw, 1.2rem)' }}>
                  {t(language, 'reportIssue')}
                </h3>
                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                  {language === 'hi' ? 'फोटो लें + GPS स्वतः जुड़ेगा' : 'Take photo & auto-attach GPS coordinates'}
                </p>
              </div>
            </div>
          </Link>

          <Link to="/track" style={{ textDecoration: 'none' }}>
            <div
              className="card-hover"
              style={{
                background: 'var(--theme-component, #d9d9d9)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(16px, 2.5vw, 24px)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--theme-bg, #fff4e7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  flexShrink: 0,
                }}
              >
                🔍
              </div>
              <div>
                <h3 style={{ margin: 0, color: 'var(--gray-900)', fontWeight: 800, fontSize: 'clamp(1rem, 1.2vw, 1.2rem)' }}>
                  {t(language, 'trackComplaint')}
                </h3>
                <p style={{ margin: '2px 0 0', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                  {language === 'hi' ? 'टिकट नंबर से स्थिति देखें व सत्यापित करें' : 'Track real-time timeline & verify resolution'}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Live Stats ── */}
      <StatsSection />

      {/* ── Green Waste Pickup Highlight Card ── */}
      <section className="app-container" style={{ marginTop: 8 }}>
        <Link to="/department/green" style={{ textDecoration: 'none' }}>
          <div
            className="card-hover"
            style={{
              background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(20px, 3vw, 32px)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(102,0,51,0.25)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 'clamp(90px, 14vw, 160px)',
                opacity: 0.15,
                lineHeight: 1,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              🌿
            </div>

            <div style={{ position: 'relative', zIndex: 2, maxWidth: 640 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: 'var(--radius-full)',
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    color: '#fff',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  ✨ {language === 'hi' ? 'विशिष्ट सेवा' : 'FEATURED CIVIC SERVICE'}
                </span>
              </div>

              <h2
                style={{
                  color: '#fff',
                  margin: '0 0 8px',
                  fontSize: 'clamp(1.2rem, 1.8vw, 1.8rem)',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                }}
              >
                🌿 {t(language, 'greenDeptTitle')}
              </h2>
              <p
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  margin: '0 0 16px',
                  fontSize: 'clamp(0.85rem, 1vw, 0.95rem)',
                  lineHeight: 1.6,
                }}
              >
                {t(language, 'greenDeptSubtitle')} (Fallen leaves, tree pruning, garden waste & fallen trees)
              </p>

              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--theme-bg, #fff4e7)',
                    color: 'var(--theme-primary, #660033)',
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {language === 'hi' ? 'हरित कचरा रिपोर्ट करें' : 'Request Green Waste Pickup'} →
                </span>
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* ── Municipal Services Grid ── */}
      <ServicesGrid />

      {/* ── Recent Complaints Activity ── */}
      <RecentComplaints />

      {/* ── Municipal Portal Quick Links / Footer ── */}
      <footer className="app-container" style={{ marginTop: 24, marginBottom: 20 }}>
        <div
          style={{
            background: 'var(--theme-component, #d9d9d9)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px clamp(16px, 3vw, 28px)',
            border: '1.5px solid var(--theme-component-border, #bfbfbf)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 20,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '1.4rem' }}>🏛️</span>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)' }}>
                Indore & Betul Municipal 311
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)', maxWidth: 360, lineHeight: 1.5 }}>
              {language === 'hi'
                ? 'नागरिक शिकायत समाधान और नगर निगम विभागीय प्रबंधन पोर्टल। त्वरित निराकरण हेतु 24x7 सेवा।'
                : 'Digital Civic Grievance Redressal and Department Management Portal. Connecting citizens directly with municipal field teams.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {language === 'hi' ? 'विभागीय पोर्टल' : 'Department Portals'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Link
                  to="/dept/login"
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#15803d',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Building2 size={14} />
                  {language === 'hi' ? 'विभाग स्टाफ लॉगिन / पंजीकरण' : 'Department Staff Login & Register'}
                </Link>
                <Link
                  to="/admin"
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--gray-600)',
                    textDecoration: 'none',
                  }}
                >
                  {language === 'hi' ? 'नगर निगम एडमिन कंसोल' : 'Municipal Admin Console'}
                </Link>
              </div>
            </div>

            <div>
              <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {language === 'hi' ? 'नागरिक सेवाएं' : 'Citizen Quick Links'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Link to="/complaint/new" style={{ fontSize: '0.82rem', color: 'var(--gray-600)', textDecoration: 'none' }}>
                  {t(language, 'reportIssue')}
                </Link>
                <Link to="/track" style={{ fontSize: '0.82rem', color: 'var(--gray-600)', textDecoration: 'none' }}>
                  {t(language, 'trackComplaint')}
                </Link>
                <Link to="/department/green" style={{ fontSize: '0.82rem', color: 'var(--gray-600)', textDecoration: 'none' }}>
                  🌿 {language === 'hi' ? 'हरित अपशिष्ट संग्रहण' : 'Green Waste Pickup'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation for mobile/tablet */}
      <BottomNav />
    </div>
  );
};
