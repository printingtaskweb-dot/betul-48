import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Complaint } from '../../lib/supabase';
import { StatusBadge } from './StatusBadge';
import { GoogleIcon } from './GoogleIcon';
import { MapPin, Clock, Navigation } from 'lucide-react';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick?: () => void;
  compact?: boolean;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = React.memo(
  ({ complaint, onClick, compact }) => {
    const shouldReduceMotion = useReducedMotion();
    const dept = complaint.department;
    const hasGeo =
      complaint.latitude != null && complaint.longitude != null;

    const date = new Date(complaint.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const interactive = !!onClick;

    return (
      <>
        <style>{`
          .complaint-card-responsive {
            padding: 14px 16px;
            gap: 14px;
          }
          .complaint-card-thumb {
            width: 90px;
            height: 90px;
          }
          @media (max-width: 768px) {
            .complaint-card-responsive {
              padding: 9px 11px !important;
              gap: 10px !important;
              border-radius: 10px !important;
            }
            .complaint-card-thumb {
              width: 64px !important;
              height: 64px !important;
            }
          }
        `}</style>
        <motion.div
          onClick={onClick}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          className="complaint-card-responsive"
          whileHover={interactive && !shouldReduceMotion ? { y: -2, scale: 1.008, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' } : undefined}
          whileTap={interactive && !shouldReduceMotion ? { scale: 0.985 } : undefined}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onKeyDown={(e) => {
            if (!interactive) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick?.();
            }
          }}
          style={{
            background: 'var(--theme-component, #d9d9d9)',
            border: '1.5px solid var(--theme-component-border, #bfbfbf)',
            borderLeft: dept?.color
              ? `4px solid ${dept.color}`
              : '1.5px solid var(--theme-component-border, #bfbfbf)',
            borderRadius: 'var(--radius-md, 12px)',
            cursor: interactive ? 'pointer' : 'default',
            transition: 'var(--transition, box-shadow 0.15s ease)',
            display: 'flex',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (!interactive) return;
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              '0 4px 16px rgba(0,0,0,0.08)';
          }}
          onMouseLeave={(e) => {
            if (!interactive) return;
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
          onFocus={(e) => {
            if (!interactive) return;
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              '0 0 0 2px var(--theme-primary, #146C94)';
          }}
          onBlur={(e) => {
            if (!interactive) return;
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          {/* Thumbnail with GPS corner badge */}
          {complaint.photo_url && !compact && (
            <div
              className="complaint-card-thumb"
              style={{
                position: 'relative',
                flexShrink: 0,
              }}
            >
            <img
              src={complaint.photo_url}
              alt="Complaint"
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 'var(--radius-sm, 8px)',
                border: '1px solid var(--theme-component-border, #bfbfbf)',
                display: 'block',
              }}
            />
            {hasGeo && (
              <span
                title="GPS-tagged photo"
                style={{
                  position: 'absolute',
                  bottom: 4,
                  left: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  lineHeight: 1,
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>location_on</span> GPS
              </span>
            )}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Ticket + status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: 'var(--gray-900)',
                fontSize: 14,
                fontFamily: 'monospace',
                letterSpacing: 0.4,
              }}
            >
              #{complaint.ticket_number}
            </span>
            <StatusBadge status={complaint.status} />
          </div>

          {/* Department */}
          {dept && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 4,
              }}
            >
              <GoogleIcon name={dept.icon} size={14} />
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--gray-500)',
                  fontWeight: 500,
                }}
              >
                {dept.name}
              </span>
            </div>
          )}

          {/* Description */}
          <p
            style={{
              fontSize: 13,
              color: 'var(--gray-800)',
              margin: '4px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: compact ? 'nowrap' : 'normal',
              display: compact ? 'block' : '-webkit-box',
              WebkitLineClamp: compact ? undefined : 2,
              WebkitBoxOrient: compact ? undefined : 'vertical',
              lineHeight: 1.4,
            }}
          >
            {complaint.description}
          </p>

          {/* Address line */}
          {complaint.address && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 4,
                marginTop: 4,
                minWidth: 0,
              }}
            >
              <MapPin
                size={12}
                color="var(--gray-400, #9ca3af)"
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--gray-400, #9ca3af)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {complaint.address}
              </span>
            </div>
          )}

          {/* Date + Directions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} color="var(--gray-400, #9ca3af)" />
              <span
                style={{ fontSize: 12, color: 'var(--gray-400, #9ca3af)' }}
              >
                {date}
              </span>
            </div>

            {hasGeo && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${complaint.latitude},${complaint.longitude}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  background: 'var(--green-50)',
                  color: 'var(--green-700)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  border: '1px solid var(--green-200)',
                  transition: 'var(--transition)',
                  flexShrink: 0,
                }}
              >
                <Navigation size={10} />
                Directions
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </>
    );
  }
);

ComplaintCard.displayName = 'ComplaintCard';
