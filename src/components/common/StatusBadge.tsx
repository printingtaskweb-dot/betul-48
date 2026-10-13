import React from 'react';
import type { ComplaintStatus } from '../../lib/supabase';

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string; bg: string; border: string }> = {
  pending: {
    label: 'Pending',
    color: '#4A0E1F',
    bg: 'rgba(74, 14, 31, 0.06)',
    border: 'rgba(74, 14, 31, 0.1)',
  },
  in_progress: {
    label: 'In Progress',
    color: '#1e40af',
    bg: 'rgba(30, 64, 175, 0.06)',
    border: 'rgba(30, 64, 175, 0.1)',
  },
  resolved: {
    label: 'Resolved',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.06)',
    border: 'rgba(124, 58, 237, 0.1)',
  },
  verified: {
    label: 'Verified',
    color: '#166534',
    bg: 'rgba(22, 101, 52, 0.06)',
    border: 'rgba(22, 101, 52, 0.1)',
  },
  rejected: {
    label: 'Rejected',
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.06)',
    border: 'rgba(220, 38, 38, 0.1)',
  },
};

interface StatusBadgeProps {
  status: ComplaintStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        padding: '6px 12px',
        borderRadius: 999,
        fontFamily: '"Geist Mono", monospace',
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
      }}
    >
      {cfg.label}
    </span>
  );
};
