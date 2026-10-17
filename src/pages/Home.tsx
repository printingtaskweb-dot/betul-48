import React, { useEffect } from 'react';
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const gsap = (window as any).gsap;
    if (!gsap) return; // GSAP not loaded → leave page visible (safety net in CSS)

    const ScrollTrigger = (window as any).ScrollTrigger;
    if (ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    // Mark body so CSS can apply the "pre-animation" hidden state
    document.body.classList.add('gsap-ready');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.top-nav', { opacity: 1, y: 0, duration: 0.8 }, 0.1)
      .to('.hero-section', { opacity: 1, scale: 1, duration: 1.0, ease: 'back.out(1.2)' }, 0.25)
      .to('.quick-actions', { opacity: 1, y: 0, duration: 0.8 }, 0.5);

    if (ScrollTrigger) {
      gsap.to('.special-service', {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: '.special-service', start: 'top 85%' }
      });
    }

    return () => {
      document.body.classList.remove('gsap-ready');
    };
  }, []);

  const onCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.transform = `perspective(1000px) rotateX(${-py * 6}deg) rotateY(${px * 6}deg) translateY(-4px)`;
  };

  const onCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(120% 70% at 50% 0%, #FFFFFF 0%, #F4F2EF 60%, #EBE7E2 100%)',
      paddingBottom: 100,
    }}>
      {/* ── Top Bar / Header ── */}
      <header
        className="top-nav"
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
              fontFamily: '"Fraunces", serif',
              fontWeight: 600, fontSize: 20, fontStyle: 'normal',
              boxShadow: '0 6px 14px -4px rgba(74, 14, 31, 0.3)',
            }}
          >
            B
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: '"Fraunces", serif',
              fontWeight: 600, fontSize: 17,
              letterSpacing: '0.01em', color: '#1C1B1A',
            }}>
              Jila Betul
            </span>
            <span style={{
              fontFamily: '"Geist Mono", monospace', fontSize: 9,
              fontWeight: 500, fontStyle: 'normal',
              letterSpacing: '0.08em', color: '#8E8A86',
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
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.82rem', fontWeight: 500, fontStyle: 'normal',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: '#4A4744', transition: 'all 0.3s ease',
            }}
          >
            {t(language, 'reportIssue')}
          </Link>
          <Link
            to="/department/green"
            style={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.82rem', fontWeight: 500, fontStyle: 'normal',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: '#4A0E1F', transition: 'all 0.3s ease',
            }}
          >
            🌿 {language === 'hi' ? 'हरित कचरा' : 'Green Waste'}
          </Link>
          <Link
            to="/track"
            style={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.82rem', fontWeight: 500, fontStyle: 'normal',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: '#4A4744', transition: 'all 0.3s ease',
            }}
          >
            {t(language, 'trackComplaint')}
          </Link>
          <Link
            to="/dept/login"
            style={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.82rem', fontWeight: 500, fontStyle: 'normal',
              textTransform: 'uppercase', letterSpacing: '0.06em',
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
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="btn-outline"
            title="Switch Language"
          >
            <Globe size={12} />
            <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

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
            <Link to="/auth" className="btn-solid" style={{ textDecoration: 'none' }}>
              {t(language, 'login')}
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero Carousel ── */}
      <HeroBanner />

      {/* ── Quick Action Cards ── */}
      <div className="quick-actions">
        <Link to="/complaint/new" style={{ textDecoration: 'none' }}>
          <div
            className="action-card"
            onMouseMove={onCardMouseMove}
            onMouseLeave={onCardMouseLeave}
          >
            <div className="action-icon">
              <Camera size={24} />
            </div>
            <div className="action-text">
              <h4>{t(language, 'reportIssue')}</h4>
              <p>{language === 'hi' ? 'फोटो लें + GPS स्वतः जुड़ेगा' : 'Take photo & auto-attach GPS'}</p>
            </div>
          </div>
        </Link>

        <Link to="/track" style={{ textDecoration: 'none' }}>
          <div
            className="action-card"
            onMouseMove={onCardMouseMove}
            onMouseLeave={onCardMouseLeave}
          >
            <div className="action-icon">
              <Search size={24} />
            </div>
            <div className="action-text">
              <h4>{t(language, 'trackComplaint')}</h4>
              <p>
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
      <section style={{ padding: '0 15px', marginTop: 4}}>
        <Link to="/department/green" style={{ textDecoration: 'none' }}>
          <div className="special-service">
            <svg
              className="leaf-bg"
              viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5"
            >
              <path d="M50 10 C 30 30, 20 60, 50 90 C 80 60, 70 30, 50 10 Z" />
              <path d="M50 10 L 50 90" />
              <path d="M50 30 L 35 45" />
              <path d="M50 50 L 65 65" />
            </svg>

            <div style={{ position: 'relative', zIndex: 2 }}>
              <div className="special-badge">
                <span className="dot" />
                {language === 'hi' ? 'विशिष्ट सेवा' : 'Featured Service'}
              </div>

              <h2 className="special-title">
                {t(language, 'greenDeptTitle')}
              </h2>
              <p className="special-desc">
                {t(language, 'greenDeptSubtitle')} (Fallen leaves, tree pruning, garden waste & fallen trees)
              </p>

              <span className="special-cta">
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

      {/* ── Footer ── */}
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
                color: '#fff', fontFamily: '"Fraunces", serif',
                fontSize: 14, fontWeight: 600, fontStyle: 'normal',
              }}>
                B
              </div>
              <span style={{
                fontFamily: '"Fraunces", serif',
                fontWeight: 600, fontSize: 16, color: '#1C1B1A',
              }}>
                Jila Betul
              </span>
            </div>
            <p style={{
              margin: 0, fontSize: 12, color: '#8E8A86',
              fontFamily: '"Geist", sans-serif', fontWeight: 400, fontStyle: 'normal',
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
                fontSize: 10, fontWeight: 500, fontStyle: 'normal', color: '#8E8A86',
                textTransform: 'uppercase' as const, letterSpacing: '0.08em',
              }}>
                {language === 'hi' ? 'विभागीय पोर्टल' : 'Department Portals'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Link
                  to="/dept/login"
                  style={{
                    fontFamily: '"Geist", sans-serif',
                    fontSize: 13, fontWeight: 500,
                    color: '#4A0E1F', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Building2 size={14} />
                  {language === 'hi' ? 'विभाग स्टाफ लॉगिन / पंजीकरण' : 'Department Staff Login & Register'}
                </Link>
                <Link
                  to="/admin"
                  style={{ fontFamily: '"Geist", sans-serif', fontSize: 12, color: '#5A5652', textDecoration: 'none' }}
                >
                  {language === 'hi' ? 'नगर निगम एडमिन कंसोल' : 'Municipal Admin Console'}
                </Link>
              </div>
            </div>

            <div>
              <p style={{
                margin: '0 0 8px',
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10, fontWeight: 500, fontStyle: 'normal', color: '#8E8A86',
                textTransform: 'uppercase' as const, letterSpacing: '0.08em',
              }}>
                {language === 'hi' ? 'नागरिक सेवाएं' : 'Citizen Quick Links'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Link to="/complaint/new" style={{ fontFamily: '"Geist", sans-serif', fontSize: 12, color: '#5A5652', textDecoration: 'none' }}>
                  {t(language, 'reportIssue')}
                </Link>
                <Link to="/track" style={{ fontFamily: '"Geist", sans-serif', fontSize: 12, color: '#5A5652', textDecoration: 'none' }}>
                  {t(language, 'trackComplaint')}
                </Link>
                <Link to="/callback" style={{ fontFamily: '"Geist", sans-serif', fontSize: 12, color: '#5A5652', textDecoration: 'none' }}>
                  {language === 'hi' ? 'कॉल बैक का अनुरोध करें' : 'Request a callback'}
                </Link>
                <Link to="/department/green" style={{ fontFamily: '"Geist", sans-serif', fontSize: 12, color: '#5A5652', textDecoration: 'none' }}>
                  🌿 {language === 'hi' ? 'हरित अपशिष्ट संग्रहण' : 'Green Waste Pickup'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
};
