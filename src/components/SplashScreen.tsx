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
        fontFamily: '"Geist", system-ui, sans-serif',
        background: 'linear-gradient(160deg, #320813 0%, #4A0E1F 45%, #5E1A2C 100%)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes splash-fade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25); }
          50%      { box-shadow: 0 0 0 14px rgba(255,255,255,0); }
        }
        @keyframes splash-logo-pop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
      `}</style>

      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 280, height: 280, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: -60,
        width: 220, height: 220, borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)',
      }} />

      {/* Logo container */}
      <div style={{
        animation: 'splash-fade 0.7s ease forwards',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        {/* Logo in circle */}
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: '#FFFFFF',
          border: '3px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 0 40px rgba(255,255,255,0.2)',
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
            fontFamily: '"Instrument Serif", Georgia, serif',
            color: '#FFFFFF',
            fontSize: 42, fontWeight: 400, fontStyle: 'italic',
            letterSpacing: '-0.02em', margin: 0, lineHeight: 1,
            textShadow: '0 2px 20px rgba(0,0,0,0.35)',
          }}>
            Jila Betul
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.75)',
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10, marginTop: 8,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            fontWeight: 400,
          }}>
            नागरिक समाधान साथी
          </p>
        </div>

        {/* Tagline pill */}
        <div style={{
          marginTop: 8,
          padding: '8px 20px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <p lang="hi" style={{
            color: 'rgba(255,255,255,0.9)',
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10, margin: 0,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
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
                animation: `splash-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom credit */}
      <p style={{
        position: 'absolute', bottom: 28,
        color: 'rgba(255,255,255,0.4)',
        fontFamily: '"Geist Mono", monospace',
        fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
      }}>
        Powered by printing task · Smart City Mission
      </p>
    </div>
  );
};
