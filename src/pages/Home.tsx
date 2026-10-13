import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { HeroBanner } from '../components/HeroBanner';
import { StatsSection } from '../components/StatsSection';
import { ServicesGrid } from '../components/ServicesGrid';
import { RecentComplaints } from '../components/RecentComplaints';
import { BottomNav } from '../components/BottomNav';
import { Globe, LogOut, Building2, Camera, Search } from 'lucide-react';

export const Home: React.FC = () => {
  const { language, setLanguage, user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(120% 70% at 50% 0%, #FFFFFF 0%, #F4F2EF 60%, #EBE7E2 100%)',
      paddingBottom: 100,
    }}>
      {/* ── Top Bar / Header ── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(28, 27, 26, 0.12)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 4px 20px -10px rgba(0,0,0,0.03)',
        }}
      >
        {/* Logo & City Title */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: '#4A0E1F',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              fontFamily: '"Instrument Serif", serif',
              fontWeight: 400, fontSize: 20, fontStyle: 'italic',
              boxShadow: '0 6px 14px -4px rgba(74, 14, 31, 0.3)',
            }}
          >
            B
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: '"Instrument Serif", serif',
              fontWeight: 500, fontSize: 16,
              letterSpacing: '0.01em', color: '#1C1B1A',
            }}>
              Jila Betul
            </span>
            <span style={{
              fontFamily: '"Geist Mono", monospace', fontSize: 9,
              letterSpacing: '0.1em', color: '#8E8A86',
              textTransform: 'uppercase' as const,
              marginTop: 1,
            }}>
              {language === 'hi' ? 'नागरिक समाधान साथी' : 'Citizen Resolution Partner'}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav-links" style={{ gap: 20, alignItems: 'center' }}>
          <Link
            to="/complaint/new"
            style={{
              fontSize: '0.88rem', fontWeight: 600,
              color: '#4A4744', transition: 'all 0.3s ease',
            }}
          >
            {t(language, 'reportIssue')}
          </Link>
          <Link
            to="/department/green"
            style={{
              fontSize: '0.88rem', fontWeight: 600,
              color: '#4A0E1F', transition: 'all 0.3s ease',
            }}
          >
            🌿 {language === 'hi' ? 'हरित कचरा' : 'Green Waste'}
          </Link>
          <Link
            to="/track"
            style={{
              fontSize: '0.88rem', fontWeight: 600,
              color: '#4A4744', transition: 'all 0.3s ease',
            }}
          >
            {t(language, 'trackComplaint')}
          </Link>
          <Link
            to="/dept/login"
            style={{
              fontSize: '0.88rem', fontWeight: 600,
              color: '#4A0E1F',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.3s ease',
            }}
          >
            <Building2 size={15} />
            {language === 'hi' ? 'विभाग पोर्टल' : 'Dept Portal'}
          </Link>
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 999,
              border: '1px solid rgba(28, 27, 26, 0.12)',
              background: 'transparent',
              fontFamily: '"Geist Mono", monospace', fontSize: 10,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: '#4A4744', cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            title="Switch Language"
          >
            <Globe size={12} />
            <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {/* User Avatar / Login */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link
                to="/profile"
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: '#4A0E1F',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.85rem', fontWeight: 700,
                  textDecoration: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 12px -4px rgba(74, 14, 31, 0.3)',
                }}
                title={user.email || 'User Profile'}
              >
                {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  border: 'none',
                  background: 'rgba(28, 27, 26, 0.06)',
                  borderRadius: 8,
                  cursor: 'pointer', padding: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={t(language, 'logout')}
              >
                <LogOut size={16} color="#4A4744" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '8px 18px', borderRadius: 999,
                background: '#4A0E1F', color: '#fff', border: 'none',
                fontFamily: '"Geist Mono", monospace', fontSize: 10,
                letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                textDecoration: 'none', cursor: 'pointer',
                boxShadow: '0 4px 12px -4px rgba(74, 14, 31, 0.3)',
                transition: 'all 0.3s ease',
              }}
            >
              {t(language, 'login')}
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero Carousel ── */}
      <HeroBanner />

      {/* ── Quick Action Cards ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        padding: '0 20px', marginTop: 24,
      }}>
        <Link to="/complaint/new" style={{ textDecoration: 'none' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: 20, borderRadius: 24,
              background: '#FFFFFF',
              boxShadow: '0 12px 28px -12px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.6, 0, 0.2, 1)',
              border: '1px solid rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                width: 52, height: 52, borderRadius: 16,
                background: '#F4F2EF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#4A0E1F', flexShrink: 0,
                border: '1px solid rgba(74, 14, 31, 0.08)',
              }}
            >
              <Camera size={22} />
            </div>
            <div>
              <h4 style={{
                fontFamily: '"Geist", sans-serif', fontSize: 15,
                fontWeight: 600, letterSpacing: '-0.01em',
                color: '#1C1B1A', margin: 0,
              }}>
                {t(language, 'reportIssue')}
              </h4>
              <p style={{
                fontSize: 12, color: '#8E8A86', marginTop: 3,
                fontFamily: '"Geist Mono", monospace',
                letterSpacing: '0.02em', margin: '3px 0 0',
              }}>
                {language === 'hi' ? 'फोटो लें + GPS स्वतः जुड़ेगा' : 'Take photo & auto-attach GPS'}
              </p>
            </div>
          </div>
        </Link>

        <Link to="/track" style={{ textDecoration: 'none' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: 20, borderRadius: 24,
              background: '#FFFFFF',
              boxShadow: '0 12px 28px -12px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.6, 0, 0.2, 1)',
              border: '1px solid rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                width: 52, height: 52, borderRadius: 16,
                background: '#F4F2EF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#4A0E1F', flexShrink: 0,
                border: '1px solid rgba(74, 14, 31, 0.08)',
              }}
            >
              <Search size={22} />
            </div>
            <div>
              <h4 style={{
                fontFamily: '"Geist", sans-serif', fontSize: 15,
                fontWeight: 600, letterSpacing: '-0.01em',
                color: '#1C1B1A', margin: 0,
              }}>
                {t(language, 'trackComplaint')}
              </h4>
              <p style={{
                fontSize: 12, color: '#8E8A86', marginTop: 3,
                fontFamily: '"Geist Mono", monospace',
                letterSpacing: '0.02em', margin: '3px 0 0',
              }}>
                {language === 'hi'
                  ? 'टिकट नंबर से स्थिति देखें व सत्यापित करें'
                  : 'Track real-time timeline & verify resolution'}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Live Stats ── */}
      <StatsSection />

      {/* ── Green Waste Pickup Highlight Card ── */}
      <section style={{ padding: '0 20px', marginTop: 8 }}>
        <Link to="/department/green" style={{ textDecoration: 'none' }}>
          <div
            style={{
              position: 'relative',
              borderRadius: 28,
              background: '#4A0E1F',
              padding: '36px 24px',
              color: '#fff',
              overflow: 'hidden',
              boxShadow: '0 24px 48px -18px rgba(74, 14, 31, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.4s ease',
            }}
          >
            {/* Decorative glow */}
            <div style={{
              position: 'absolute',
              width: 280, height: 280, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.06), transparent 65%)',
              bottom: -100, right: -80,
              filter: 'blur(30px)', pointerEvents: 'none',
            }} />

            {/* Decorative leaf SVG */}
            <svg
              style={{
                position: 'absolute',
                right: -20, bottom: -20,
                width: 160, height: 160,
                opacity: 0.06, color: '#fff',
                pointerEvents: 'none',
              }}
              viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5"
            >
              <path d="M50 10 C 30 30, 20 60, 50 90 C 80 60, 70 30, 50 10 Z" />
              <path d="M50 10 L 50 90" />
              <path d="M50 30 L 35 45" />
              <path d="M50 50 L 65 65" />
            </svg>

            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontFamily: '"Geist Mono", monospace', fontSize: 10,
                letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                color: 'rgba(255,255,255,0.9)',
                width: 'fit-content', marginBottom: 16,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#fff',
                  display: 'inline-block',
                }} />
                {language === 'hi' ? 'विशिष्ट सेवा' : 'Featured Service'}
              </div>

              <h2
                style={{
                  fontFamily: '"Instrument Serif", Georgia, serif',
                  fontSize: 'clamp(28px, 6vw, 34px)',
                  fontWeight: 400, fontStyle: 'italic',
                  letterSpacing: '-0.01em', lineHeight: 1.1,
                  marginBottom: 12, color: '#fff',
                }}
              >
                {t(language, 'greenDeptTitle')}
              </h2>
              <p
                style={{
                  fontSize: 14, lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.7)',
                  maxWidth: '85%', marginBottom: 28,
                }}
              >
                {t(language, 'greenDeptSubtitle')} (Fallen leaves, tree pruning, garden waste & fallen trees)
              </p>

              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 999,
                  background: '#fff', color: '#4A0E1F',
                  fontWeight: 600, fontSize: 13, letterSpacing: '0.02em',
                  boxShadow: '0 8px 20px -8px rgba(0,0,0,0.15)',
                  transition: 'all 0.4s cubic-bezier(0.6, 0, 0.2, 1)',
                }}
              >
                {language === 'hi' ? 'हरित कचरा रिपोर्ट करें' : 'Request Green Waste Pickup'} →
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ── Municipal Services Grid ── */}
      <ServicesGrid />

      {/* ── Recent Complaints Activity ── */}
      <RecentComplaints />

      {/* ── Municipal Portal Quick Links / Footer ── */}
      <footer style={{ padding: '24px 20px 20px' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 24,
            padding: '24px',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexWrap: 'wrap' as const,
            justifyContent: 'space-between',
            gap: 20,
            boxShadow: '0 10px 24px -12px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: '#4A0E1F',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: '"Instrument Serif", serif',
                fontSize: 14, fontStyle: 'italic',
              }}>
                B
              </div>
              <span style={{
                fontFamily: '"Instrument Serif", serif',
                fontWeight: 400, fontSize: 16, color: '#1C1B1A',
              }}>
                Jila Betul
              </span>
            </div>
            <p style={{
              margin: 0, fontSize: 12, color: '#8E8A86',
              maxWidth: 360, lineHeight: 1.5,
            }}>
              {language === 'hi'
                ? 'नागरिक शिकायत समाधान और नगर निगम विभागीय प्रबंधन पोर्टल। त्वरित निराकरण हेतु 24x7 सेवा।'
                : 'Digital Civic Grievance Redressal and Department Management Portal. Connecting citizens directly with municipal field teams.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const }}>
            <div>
              <p style={{
                margin: '0 0 8px',
                fontFamily: '"Geist Mono", monospace',
                fontSize: 9, fontWeight: 600, color: '#8E8A86',
                textTransform: 'uppercase' as const, letterSpacing: '0.08em',
              }}>
                {language === 'hi' ? 'विभागीय पोर्टल' : 'Department Portals'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Link
                  to="/dept/login"
                  style={{
                    fontSize: 13, fontWeight: 600,
                    color: '#4A0E1F', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Building2 size={14} />
                  {language === 'hi' ? 'विभाग स्टाफ लॉगिन / पंजीकरण' : 'Department Staff Login & Register'}
                </Link>
                <Link
                  to="/admin"
                  style={{ fontSize: 12, color: '#5A5652', textDecoration: 'none' }}
                >
                  {language === 'hi' ? 'नगर निगम एडमिन कंसोल' : 'Municipal Admin Console'}
                </Link>
              </div>
            </div>

            <div>
              <p style={{
                margin: '0 0 8px',
                fontFamily: '"Geist Mono", monospace',
                fontSize: 9, fontWeight: 600, color: '#8E8A86',
                textTransform: 'uppercase' as const, letterSpacing: '0.08em',
              }}>
                {language === 'hi' ? 'नागरिक सेवाएं' : 'Citizen Quick Links'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Link to="/complaint/new" style={{ fontSize: 12, color: '#5A5652', textDecoration: 'none' }}>
                  {t(language, 'reportIssue')}
                </Link>
                <Link to="/track" style={{ fontSize: 12, color: '#5A5652', textDecoration: 'none' }}>
                  {t(language, 'trackComplaint')}
                </Link>
                <Link to="/department/green" style={{ fontSize: 12, color: '#5A5652', textDecoration: 'none' }}>
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
