import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { Home, Plus, Search, ShieldCheck, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { language, user, isAdmin } = useAuth();
  const loc = useLocation();

  const items = [
    { path: '/', icon: <Home size={20} />, label: t(language, 'home') },
    { path: '/complaint/new', icon: <Plus size={24} />, label: t(language, 'reportIssue') },
    { path: '/track', icon: <Search size={20} />, label: t(language, 'trackComplaint') },
    // Admin button visible ONLY to admin users
    ...(isAdmin
      ? [
          {
            path: '/admin/dashboard',
            icon: <ShieldCheck size={20} />,
            label: language === 'hi' ? 'एडमिन' : 'Admin',
            isAdminBadge: true,
          },
        ]
      : [
          {
            path: user ? '/profile' : '/auth',
            icon: <User size={20} />,
            label: user ? (language === 'hi' ? 'प्रोफ़ाइल' : 'Profile') : t(language, 'login'),
            isAdminBadge: false,
          },
        ]),
  ];

  return (
    <>
      <style>{`
        .bottom-nav-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          min-width: 56px;
          gap: 2px;
          transition: color 0.2s ease, transform 0.2s ease;
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
          background-color: rgba(20, 108, 148, 0.03);
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
          border: 3px solid var(--bg-1, #F4F2EF);
          transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
        }
        .bottom-nav-fab:hover {
          transform: translateY(-2px) scale(1.1);
          background-color: var(--burgundy-light, #5E1A2C);
          box-shadow: 0 14px 28px -4px rgba(20, 108, 148, 0.45);
        }
      `}</style>
      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(28, 27, 26, 0.12)',
          boxShadow: '0 -10px 30px -10px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '8px 12px calc(8px + env(safe-area-inset-bottom))',
        }}
        aria-label={language === 'hi' ? 'मुख्य नेविगेशन' : 'Main navigation'}
      >
        {items.map((item) => {
          const active = loc.pathname === item.path;
          const isFab = item.path === '/complaint/new';

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`bottom-nav-link${isFab ? ' bottom-nav-report' : ''}`}
              aria-current={active ? 'page' : undefined}
              style={{
                color: active || isFab ? 'var(--burgundy, #146C94)' : 'var(--mute, #8E8A86)',
              }}
            >
              {isFab ? (
                <div className="bottom-nav-fab" aria-label={item.label}>
                  <Plus size={24} color="#FFFFFF" strokeWidth={2.4} />
                </div>
              ) : (
                <div
                  className={`bottom-nav-icon-box ${active ? 'is-active' : ''}`}
                  style={{
                    backgroundColor: active ? 'rgba(20, 108, 148, 0.06)' : 'transparent',
                    color: active ? 'var(--burgundy, #146C94)' : 'var(--mute, #8E8A86)',
                  }}
                >
                  {item.icon}
                </div>
              )}
              <span
                style={{
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: '10px',
                  textTransform: 'none',
                  letterSpacing: 0,
                  fontWeight: active ? 700 : 500,
                  color: active || isFab ? 'var(--burgundy, #146C94)' : 'var(--mute, #8E8A86)',
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
