import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Complaint } from '../lib/supabase';
import { StatusBadge } from './common/StatusBadge';
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

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div>
          <h2 style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontSize: 24, fontWeight: 600, fontStyle: 'normal', letterSpacing: '-0.01em',
            color: 'var(--ink)', textTransform: 'none',
          }}>
            {t(language, 'recentActivity')}
          </h2>
        </div>
        <Link to="/track" style={{
          fontFamily: '"Geist Mono", monospace', fontSize: 11,
          letterSpacing: '0.06em', textTransform: 'uppercase' as const,
          color: 'var(--burgundy)', fontWeight: 500, fontStyle: 'normal',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {t(language, 'viewAll')} →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {complaints.map((c) => (
          <Link key={c.id} to={`/track?ticket=${c.ticket_number}`} style={{ textDecoration: 'none' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 18, borderRadius: 20,
                background: 'var(--surface)',
                boxShadow: '0 10px 24px -12px rgba(0, 0, 0, 0.06), inset 0 1px 0 #FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                cursor: 'pointer',
                transition: 'all 0.4s ease',
              }}
            >
              {/* Dept icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: 'var(--bg-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--burgundy)',
                border: '1px solid rgba(74, 14, 31, 0.08)',
                fontSize: 18,
              }}>
                {c.department?.icon || '📋'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: '"Geist Mono", monospace', fontSize: 11,
                  fontWeight: 500, fontStyle: 'normal',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--mute)',
                  marginBottom: 4,
                }}>
                  #{c.ticket_number}
                </div>
                <div style={{
                  fontFamily: '"Geist", sans-serif', fontSize: 14, fontWeight: 600,
                  fontStyle: 'normal', textTransform: 'none',
                  color: 'var(--ink)',
                  whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {c.description}
                </div>
                {c.address && (
                  <div style={{
                    display: 'flex', gap: 4, alignItems: 'center', marginTop: 3,
                    fontFamily: '"Geist", sans-serif',
                    fontSize: 11, fontWeight: 400, fontStyle: 'normal', color: 'var(--mute)',
                  }}>
                    <MapPin size={12} />
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    }}>
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
