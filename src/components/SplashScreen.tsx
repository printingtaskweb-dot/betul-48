import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2400);
    const t2 = setTimeout(() => onDone(), 2900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-primary)',
        background: 'linear-gradient(145deg, #146C94 0%, #0E526F 100%)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: exiting ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes splash-fade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(25, 167, 206, 0.5); }
          50%      { box-shadow: 0 0 0 14px rgba(25, 167, 206, 0); }
        }
        @keyframes splash-logo-pop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes splash-dot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1); }
        }
      `}</style>

      {/* Decorative radial blobs — matching hero-section::before style */}
      <div style={{
        position: 'absolute', top: -160, right: -100,
        width: 420, height: 420, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(25, 167, 206, 0.35), transparent 65%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -120, left: -100,
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(175, 211, 226, 0.28), transparent 65%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />

      {/* Logo container */}
      <div style={{
        animation: 'splash-fade 0.7s ease forwards',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        position: 'relative', zIndex: 2,
      }}>
        {/* Logo in circle */}
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: '#FFFFFF',
          border: '2px solid rgba(25, 167, 206, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 0 40px rgba(25, 167, 206, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
          animation: 'splash-pulse 2s ease-in-out infinite, splash-logo-pop 0.8s ease forwards',
        }}>
          <img
            src="/logo.png"
            alt="Jila Betul Logo"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
            }}
          />
        </div>

        {/* App name */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            color: '#FFFFFF',
            fontSize: 42, fontWeight: 600, fontStyle: 'normal',
            letterSpacing: '-0.02em', margin: 0, lineHeight: 1.05,
            textShadow: '0 2px 20px rgba(0,0,0,0.35)',
            textTransform: 'none',
          }}>
            Jila Betul
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.75)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10, marginTop: 8,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 500,
            fontStyle: 'normal',
          }}>
            नागरिक समाधान साथी
          </p>
        </div>

        {/* Tagline pill — matching hero-badge structure */}
        <div style={{
          marginTop: 8,
          padding: '8px 20px',
          background: 'rgba(175, 211, 226, 0.12)',
          borderRadius: 999,
          border: '1px solid rgba(175, 211, 226, 0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#FFFFFF',
            display: 'inline-block',
          }} />
          <p lang="hi" style={{
            color: 'var(--rose)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10, margin: 0,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 500,
            fontStyle: 'normal',
          }}>
            स्वच्छ बैतूल · Swachh Betul
          </p>
        </div>

        {/* Loading dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#FFFFFF',
                animation: `splash-dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom credit — matching .hero-badge mono style */}
      <p style={{
        position: 'absolute', bottom: 28,
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'var(--font-mono)',
        fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontWeight: 500,
        fontStyle: 'normal',
        zIndex: 2,
      }}>
        Powered by printing task · Smart City Mission
      </p>
    </div>
  );
};
