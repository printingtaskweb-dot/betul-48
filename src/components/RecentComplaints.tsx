import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Complaint } from '../lib/supabase';
import { StatusBadge } from './common/StatusBadge';
import { GoogleIcon } from './common/GoogleIcon';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { MapPin } from 'lucide-react';

export const RecentComplaints: React.FC = () => {
  const { language } = useAuth();
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

  const onCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.transform = `perspective(1000px) rotateX(${-py * 5}deg) rotateY(${px * 5}deg) translateX(4px)`;
  };

  const onCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateX(0px)';
  };

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

      <div className="complaints-list">
        {complaints.map((c) => (
          <Link key={c.id} to={`/track?ticket=${c.ticket_number}`} style={{ textDecoration: 'none' }}>
            <div
              className="complaint-card"
              onMouseMove={onCardMouseMove}
              onMouseLeave={onCardMouseLeave}
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
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
