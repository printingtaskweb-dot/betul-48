import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { TrendingUp, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  verified: number;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) return;
    const duration = 900;
    const step = Math.max(1, end / (duration / 16));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toLocaleString()}</>;
};

export const StatsSection: React.FC = () => {
  const { language } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
    verified: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('complaints')
      .select('status')
      .then(({ data }) => {
        if (!data) return;
        const s: Stats = { total: data.length, pending: 0, in_progress: 0, resolved: 0, verified: 0 };
        data.forEach((c) => {
          if (c.status === 'pending') s.pending++;
          else if (c.status === 'in_progress') s.in_progress++;
          else if (c.status === 'resolved') s.resolved++;
          else if (c.status === 'verified') s.verified++;
        });
        setStats(s);
        setLoaded(true);
      });
  }, []);

  const cards = [
    {
      key: 'total',
      label: t(language, 'totalComplaints'),
      value: stats.total,
      icon: <TrendingUp size={18} />,
      color: 'var(--burgundy)',
    },
    {
      key: 'pending',
      label: t(language, 'pendingComplaints'),
      value: stats.pending,
      icon: <Clock size={18} />,
      color: '#92400e',
    },
    {
      key: 'resolved',
      label: t(language, 'resolvedComplaints'),
      value: stats.resolved,
      icon: <CheckCircle2 size={18} />,
      color: 'var(--burgundy)',
    },
    {
      key: 'verified',
      label: t(language, 'verifiedComplaints'),
      value: stats.verified,
      icon: <ShieldCheck size={18} />,
      color: 'var(--burgundy)',
    },
  ];

  return (
    <div className="app-container" style={{ paddingTop: 16, paddingBottom: 16 }}>
      <div className="stats-grid-responsive">
        {cards.map((card, i) => (
          <div
            key={card.key}
            style={{
              background: 'var(--surface)',
              border: '1px solid rgba(0, 0, 0, 0.04)',
              borderRadius: 20,
              padding: 'clamp(14px, 2vw, 20px)',
              boxShadow: '0 10px 24px -12px rgba(0, 0, 0, 0.06)',
              animation: loaded ? `fadeIn 0.3s ease ${i * 0.08}s forwards` : 'none',
              opacity: loaded ? 1 : 0,
              transition: 'all 0.4s ease',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: card.key === 'pending' ? 'rgba(146, 64, 14, 0.08)' : 'rgba(74, 14, 31, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.color,
                marginBottom: 10,
              }}
            >
              {card.icon}
            </div>
            <div
              style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontSize: 'clamp(1.5rem, 2vw, 2.2rem)',
                fontWeight: 400,
                color: card.color,
                lineHeight: 1.1,
                marginBottom: 4,
                letterSpacing: '-0.02em',
              }}
            >
              {loaded ? <AnimatedNumber value={card.value} /> : '—'}
            </div>
            <div
              style={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10,
                color: 'var(--mute)',
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase' as const,
              }}
            >
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
