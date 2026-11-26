import React from 'react';
import { Check, XCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { ComplaintStatus } from '../../lib/supabase';

export interface ComplaintStatusTimelineProps {
  status: ComplaintStatus | string;
  createdAt?: string | null;
  updatedAt?: string | null;
  assignedAt?: string | null;
  resolvedAt?: string | null;
  assigneeName?: string | null;
  resolutionNote?: string | null;
  language?: 'en' | 'hi';
  compact?: boolean;
}

const STANDARD_STATUSES: ComplaintStatus[] = [
  'pending',
  'in_progress',
  'resolved',
  'verified',
];

function normalizeStatus(status: string): ComplaintStatus {
  const s = (status || '').toLowerCase().trim();
  if (
    s === 'pending' ||
    s === 'in_progress' ||
    s === 'resolved' ||
    s === 'verified' ||
    s === 'rejected'
  ) {
    return s;
  }
  return 'pending';
}

function formatStepDate(value?: string | null, language: 'en' | 'hi' = 'en'): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export const ComplaintStatusTimeline: React.FC<ComplaintStatusTimelineProps> = ({
  status,
  createdAt,
  updatedAt,
  assignedAt,
  resolvedAt,
  assigneeName,
  resolutionNote,
  language = 'en',
  compact = false,
}) => {
  const normalized = normalizeStatus(status);
  const hi = language === 'hi';

  const containerStyle: React.CSSProperties = {
    padding: compact ? '12px 14px' : '16px 18px',
    background: '#faf9f6',
    borderRadius: 14,
    border: '1px solid #e6e2d8',
  };

  if (normalized === 'rejected') {
    const submittedText = formatStepDate(createdAt, language);
    const rejectedText = formatStepDate(updatedAt, language);

    return (
      <div className="status-timeline" style={containerStyle}>
        <h4
          className="status-timeline-title"
          style={{
            margin: compact ? '0 0 10px' : '0 0 14px',
            fontSize: compact ? '0.8rem' : '0.88rem',
            color: '#0f2531',
            fontWeight: 800,
          }}
        >
          {hi ? 'निराकरण समयरेखा' : 'Redressal Timeline'}
        </h4>

        <div className="status-timeline-steps" style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 10 }}>
          {/* Step 1: Pending / Logged */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#fff',
              }}
            >
              <Check size={13} strokeWidth={3} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge status="pending" />
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f2531' }}>
                  {hi ? 'शिकायत दर्ज' : 'Complaint Received'}
                </span>
              </div>
              {submittedText && (
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                  {submittedText}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Terminal Rejected State */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: compact ? '8px 10px' : '10px 12px',
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#fff',
              }}
            >
              <XCircle size={14} strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge status="rejected" />
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#991b1b' }}>
                  {hi ? 'प्रशासन द्वारा अस्वीकृत' : 'Complaint Rejected'}
                </span>
              </div>
              {rejectedText && (
                <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: 2 }}>
                  {rejectedText}
                </div>
              )}
              {resolutionNote && (
                <div style={{ fontSize: '0.74rem', color: '#7f1d1d', marginTop: 4, lineHeight: 1.4 }}>
                  {resolutionNote}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentIdx = STANDARD_STATUSES.indexOf(normalized);

  const stageMeta: Record<
    Exclude<ComplaintStatus, 'rejected'>,
    { label: string; timestamp: string | null; detail?: string | null }
  > = {
    pending: {
      label: hi ? 'शिकायत दर्ज' : 'Reported & Logged',
      timestamp: formatStepDate(createdAt, language),
    },
    in_progress: {
      label: assigneeName
        ? hi
          ? `आवंटित: ${assigneeName}`
          : `Assigned to ${assigneeName}`
        : hi
        ? 'कार्य प्रगति पर'
        : 'Field Team Dispatched',
      timestamp: formatStepDate(assignedAt, language),
    },
    resolved: {
      label: hi ? 'निराकरण प्रस्तुत' : 'Resolution Submitted',
      timestamp: formatStepDate(resolvedAt, language),
      detail: resolutionNote || null,
    },
    verified: {
      label: hi ? 'सत्यापित एवं बंद' : 'Verified & Closed',
      timestamp: currentIdx >= 3 ? formatStepDate(updatedAt, language) : null,
    },
  };

  return (
    <div className="status-timeline" style={containerStyle}>
      <h4
        className="status-timeline-title"
        style={{
          margin: compact ? '0 0 10px' : '0 0 14px',
          fontSize: compact ? '0.8rem' : '0.88rem',
          color: '#0f2531',
          fontWeight: 800,
        }}
      >
        {hi ? 'निराकरण समयरेखा' : 'Redressal Timeline'}
      </h4>

      <div
        className="status-timeline-steps"
        style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 10 }}
      >
        {STANDARD_STATUSES.map((stepStatus, i) => {
          const isDone = currentIdx >= i;
          const isCurrent = currentIdx === i;
          const meta = stageMeta[stepStatus as Exclude<ComplaintStatus, 'rejected'>];

          return (
            <div
              key={stepStatus}
              className="status-timeline-step"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <div
                className="status-timeline-marker"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: isDone ? (isCurrent && stepStatus !== 'verified' ? '#146C94' : '#059669') : '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: isDone ? '#fff' : '#64748b',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : i + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <StatusBadge status={stepStatus} />
                  <span
                    style={{
                      fontSize: compact ? '0.74rem' : '0.78rem',
                      fontWeight: isDone ? 700 : 600,
                      color: isDone ? '#0f2531' : '#94a3b8',
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
                {meta.timestamp && (
                  <div style={{ fontSize: '0.69rem', color: '#64748b', marginTop: 2 }}>
                    {meta.timestamp}
                  </div>
                )}
                {!compact && meta.detail && isDone && (
                  <div
                    style={{
                      fontSize: '0.73rem',
                      color: '#475569',
                      marginTop: 3,
                      lineHeight: 1.4,
                    }}
                  >
                    {meta.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
