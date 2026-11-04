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
      .limit(5)
      .then(({ data }) => {
        setComplaints((data as Complaint[]) || []);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ padding: '0 20px 20px' }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="shimmer" style={{ height: 72, borderRadius: 20, marginBottom: 12 }} />
      ))}
    </div>
  );

  if (complaints.length === 0) return null;

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="section-header" style={{ padding: '0 20px', marginTop: 24, marginBottom: 16 }}>
        <div className="left">
          <h3>{t(language, 'recentActivity')}</h3>
          <p>LIVE CITIZEN FEED</p>
        </div>
        <Link to="/track" className="right">
          {t(language, 'viewAll')} <span>→</span>
        </Link>
      </div>

      <motion.div
        className="complaints-list"
        variants={shouldReduceMotion ? undefined : feedContainerVariants}
        initial={shouldReduceMotion ? undefined : 'hidden'}
        whileInView={shouldReduceMotion ? undefined : 'visible'}
        viewport={{ once: true, amount: 0.1 }}
      >
        {complaints.map((c) => (
          <Link key={c.id} to={`/track?ticket=${c.ticket_number}`} style={{ textDecoration: 'none' }}>
            <motion.div
              className="complaint-card"
              variants={shouldReduceMotion ? undefined : feedItemVariants}
              whileHover={shouldReduceMotion ? undefined : { x: 4, scale: 1.01 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Dept icon */}
              <div className="complaint-icon">
                <GoogleIcon name={c.department?.icon || 'assignment'} size={18} />
              </div>

              <div className="complaint-body">
                <div className="complaint-id">
                  #{c.ticket_number}
                </div>
                <div className="complaint-title">
                  {c.description}
                </div>
                {c.address && (
                  <div className="complaint-loc">
                    <MapPin size={12} />
                    <span>
                      {c.address.split(',').slice(0, 2).join(',')}
                    </span>
                  </div>
                )}
              </div>

              <StatusBadge status={c.status} />
            </motion.div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
};
