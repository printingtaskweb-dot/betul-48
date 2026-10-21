import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Newspaper, Plus, Search, ShieldCheck, User } from 'lucide-react';

interface BottomNavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

export const BottomNav: React.FC = () => {
  const { language, user, isAdmin } = useAuth();
  const loc = useLocation();

  const items: BottomNavItem[] = [
    { path: '/', icon: <Home size={20} />, label: language === 'hi' ? 'होम' : 'Home' },
    {
      path: '/news',
      icon: <Newspaper size={20} />,
      label: language === 'hi' ? 'विचार' : 'Thoughts',
    },
    { path: '/complaint/new', icon: <Plus size={24} />, label: language === 'hi' ? 'शिकायत' : 'Report' },
    { path: '/track', icon: <Search size={20} />, label: language === 'hi' ? 'स्थिति' : 'Track' },
    // Admin button visible ONLY to admin users
    ...(isAdmin
      ? [
          {
            path: '/admin/dashboard',
            icon: <ShieldCheck size={20} />,
            label: language === 'hi' ? 'एडमिन' : 'Admin',
          },
        ]
      : [
          {
            path: user ? '/profile' : '/auth',
            icon: <User size={20} />,
            label: user ? (language === 'hi' ? 'खाता' : 'Account') : (language === 'hi' ? 'लॉगिन' : 'Login'),
          },
        ]),
  ];

  return (
    <>
      <style>{`
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 2200 !important;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid rgba(20, 108, 148, 0.12);
          box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
        }
        .bottom-nav-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          min-width: 56px;
          gap: 2px;
          transition: color 0.2s ease, transform 0.2s ease;
        }
        .bottom-nav-action {
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
        }
        .bottom-nav-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px 12px;
          border-radius: 12px;
          transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }
        .bottom-nav-link:hover .bottom-nav-icon-box:not(.is-active) {
          background-color: rgba(20, 108, 148, 0.04);
        }
        .bottom-nav-fab {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          margin-top: -14px;
          background: var(--burgundy, #146C94);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 24px -6px rgba(20, 108, 148, 0.4);
          border: 3px solid #ffffff;
          transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
        }
        .bottom-nav-fab:hover {
          transform: translateY(-2px) scale(1.08);
          background-color: #0E526F;
          box-shadow: 0 14px 28px -4px rgba(20, 108, 148, 0.45);
        }
      `}</style>
      <nav
        className="mobile-bottom-nav"
        aria-label={language === 'hi' ? 'मुख्य नेविगेशन' : 'Main navigation'}
      >
        {items.map((item) => {
          const active = loc.pathname === item.path;
          const isFab = item.path === '/complaint/new';
          const content = (
            <>
              {isFab ? (
                <div className="bottom-nav-fab" aria-hidden="true">
                  <Plus size={24} color="#FFFFFF" strokeWidth={2.4} />
                </div>
              ) : (
                <div
                  className={`bottom-nav-icon-box ${active ? 'is-active' : ''}`}
                  style={{
                    backgroundColor: active ? 'rgba(20, 108, 148, 0.1)' : 'transparent',
                    color: active ? '#146C94' : 'var(--mute, #8E8A86)',
                    transform: active ? 'scale(1.05)' : 'none',
                  }}
                >
                  {item.icon}
                </div>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-primary, sans-serif)',
                  fontSize: '10px',
                  fontWeight: active || isFab ? 700 : 500,
                  color: active || isFab ? '#146C94' : 'var(--mute, #8E8A86)',
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </span>
            </>
          );

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`bottom-nav-link${isFab ? ' bottom-nav-report' : ''}`}
              aria-current={active ? 'page' : undefined}
              style={{
                color: active || isFab ? '#146C94' : 'var(--mute, #8E8A86)',
              }}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default BottomNav;
