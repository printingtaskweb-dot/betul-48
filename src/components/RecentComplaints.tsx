import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { supabase } from '../lib/supabase';
import type { Complaint } from '../lib/supabase';
import { StatusBadge } from './common/StatusBadge';
import { GoogleIcon } from './common/GoogleIcon';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { MapPin } from 'lucide-react';

const feedContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const feedItemVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

export const RecentComplaints: React.FC = () => {
  const { language } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('complaints')
      .select('*, department:departments(*)')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setComplaints((data as Complaint[]) || []);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ padding: '0 20px 20px', maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="shimmer" style={{ height: 60, borderRadius: 14 }} />
        ))}
      </div>
    </div>
  );

  if (complaints.length === 0) return null;

  return (
    <div className="recent-complaints-container" style={{ maxWidth: 1080, margin: '0 auto', paddingBottom: 24, boxSizing: 'border-box' }}>
      <div className="section-header" style={{ padding: '0 20px', marginTop: 24, marginBottom: 12 }}>
        <div className="left">
          <h3>{t(language, 'recentActivity')}</h3>
          <p>LIVE CITIZEN FEED</p>
        </div>
        <Link to="/track" className="right">
          {t(language, 'viewAll')} <span>→</span>
        </Link>
      </div>

      {/* ── Desktop View: Rich 2-Column Grid (Eliminates empty space) ── */}
      <motion.div
        className="complaints-list complaints-list-desktop desktop-grid"
        variants={shouldReduceMotion ? undefined : feedContainerVariants}
        initial={shouldReduceMotion ? undefined : 'hidden'}
        whileInView={shouldReduceMotion ? undefined : 'visible'}
        viewport={{ once: true, amount: 0.1 }}
      >
        {complaints.map((c) => {
          const shortAddress = c.address ? c.address.split(',').slice(0, 2).join(', ').trim() : null;
          return (
            <Link key={c.id} to={`/track?ticket=${c.ticket_number}`} style={{ textDecoration: 'none', display: 'flex' }}>
              <motion.div
                className="complaint-card complaint-card-desktop"
                variants={shouldReduceMotion ? undefined : feedItemVariants}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{ width: '100%', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                {/* Header: Icon + Ticket # + Dept Name + Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div className="complaint-icon" style={{ width: 34, height: 34, borderRadius: 10 }}>
                      <GoogleIcon name={c.department?.icon || 'assignment'} size={17} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="complaint-id" style={{ fontSize: 12.5, fontWeight: 700 }}>#{c.ticket_number}</span>
                      {c.department?.name && (
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {c.department.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                {/* Complaint Title / Summary */}
                <div className="complaint-title" style={{ fontSize: 13.5, fontWeight: 600, margin: '2px 0' }}>
                  {c.description}
                </div>

                {/* Bottom Meta Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, fontSize: 11, color: 'var(--mute)' }}>
                  {shortAddress ? (
                    <div className="complaint-loc" style={{ margin: 0 }}>
                      <MapPin size={11} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                        {shortAddress}
                      </span>
                    </div>
                  ) : <span />}
                  <span style={{ color: 'var(--burgundy)', fontWeight: 600, fontSize: 11.5 }}>
                    {language === 'hi' ? 'विवरण देखें' : 'View Details'} →
                  </span>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </motion.div>

      {/* ── Mobile View: Ultra-compact Touch Feed (Exact layout user liked) ── */}
      <motion.div
        className="complaints-list complaints-list-mobile mobile-flex"
        style={{ flexDirection: 'column', gap: 6, padding: '0 14px' }}
        variants={shouldReduceMotion ? undefined : feedContainerVariants}
        initial={shouldReduceMotion ? undefined : 'hidden'}
        whileInView={shouldReduceMotion ? undefined : 'visible'}
        viewport={{ once: true, amount: 0.1 }}
      >
        {complaints.slice(0, 4).map((c) => {
          const shortAddress = c.address ? c.address.split(',').slice(0, 2).join(', ').trim() : null;
          return (
            <Link key={c.id} to={`/track?ticket=${c.ticket_number}`} style={{ textDecoration: 'none' }}>
              <div
                className="complaint-card complaint-card-mobile"
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  background: 'var(--surface)',
                  border: '1px solid var(--hairline)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--burgundy)' }}>
                      #{c.ticket_number}
                    </span>
                    {c.department?.name && (
                      <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
                        • {c.department.name}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.description}
                </div>

                {shortAddress && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--mute)' }}>
                    <MapPin size={10} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {shortAddress}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
};
