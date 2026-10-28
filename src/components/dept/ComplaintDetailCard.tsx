import { useState } from 'react';
import type { DeptComplaint } from '../../hooks/useDeptComplaints';
import { roleLabel } from '../../lib/hierarchy';
import { ArrowRight, Camera, CheckCircle, Clock, ChevronDown, ChevronUp, Phone, User, AlertCircle, CheckSquare, XCircle } from 'lucide-react';

// ─── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; labelHi: string; color: string; bg: string; Icon: typeof Clock }> = {
  pending:     { label: 'Pending',     labelHi: 'लंबित',      color: '#92400e', bg: '#fef3c7', Icon: Clock },
  in_progress: { label: 'In Progress', labelHi: 'प्रगति में',   color: '#1d4ed8', bg: '#dbeafe', Icon: AlertCircle },
  resolved:    { label: 'Resolved',    labelHi: 'हल किया',     color: '#065f46', bg: '#d1fae5', Icon: CheckCircle },
  verified:    { label: 'Verified',  labelHi: 'सत्यापित', color: '#5b21b6', bg: '#ede9fe', Icon: CheckSquare },
  rejected:    { label: 'Rejected',    labelHi: 'अस्वीकृत',   color: '#991b1b', bg: '#fee2e2', Icon: XCircle },
};

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return s;
  }
}

// ─── Complaint Detail Card ──────────────────────────────────────────────────
export function ComplaintDetailCard({
  c, language, canAllot, canResolve, onResolve, onAllot,
}: {
  c: DeptComplaint;
  language: 'en' | 'hi';
  canAllot: boolean;
  canResolve: boolean;
  onResolve: () => void;
  onAllot: () => void;
}) {
  const hi = language === 'hi';
  const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.Icon;
  const [expanded, setExpanded] = useState(false);
  const isClosed = c.status === 'resolved' || c.status === 'verified';

  return (
    <div style={{
      background: 'var(--theme-component, #d9d9d9)',
      border: '1.5px solid var(--theme-component-border, #bfbfbf)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14,
          borderBottom: expanded ? '1.5px solid var(--theme-component-border, #bfbfbf)' : 'none',
        }}
      >
        <div style={{
          width: 60, height: 60, borderRadius: 'var(--radius-md)',
          background: 'var(--theme-bg, #fff4e7)', flexShrink: 0, overflow: 'hidden',
          border: '1px solid var(--theme-component-border, #bfbfbf)',
        }}>
          {c.photo_url ? (
            <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={22} color="var(--gray-500)" />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.8rem', fontWeight: 800, color: 'var(--theme-primary, #660033)',
                background: 'var(--theme-bg, #fff4e7)', padding: '2px 8px', borderRadius: 20,
                border: '1px solid var(--theme-component-border, #bfbfbf)'
              }}>
                #{c.ticket_number}
              </span>
              {c.dept_name && (
                <span style={{
                  fontSize: '0.74rem', fontWeight: 700, color: '#374151',
                  background: 'var(--theme-bg, #fff4e7)', padding: '2px 8px', borderRadius: 20,
                  border: '1px solid var(--theme-component-border, #bfbfbf)',
                }}>
                  {c.dept_icon} {c.dept_name}
                </span>
              )}
            </div>

            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 20,
              background: cfg.bg, color: cfg.color, fontSize: '0.75rem', fontWeight: 700,
            }}>
              <StatusIcon size={11} />
              {hi ? cfg.labelHi : cfg.label}
            </span>
          </div>

          <p style={{ margin: '6px 0 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--gray-900)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.description}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, fontSize: '0.76rem', color: 'var(--gray-600)', flexWrap: 'wrap' }}>
              <span>{fmtDate(c.created_at)}</span>
              {c.assigned_name && (
                <span style={{ fontWeight: 700, color: 'var(--theme-primary, #660033)' }}>
                   {c.assigned_name} ({roleLabel(c.assigned_role, language)})
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
              {canAllot && !isClosed && (
                <button
                  onClick={onAllot}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--theme-bg, #fff4e7)',
                    color: 'var(--theme-primary, #660033)',
                    border: '1.5px solid var(--theme-primary, #660033)',
                    fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  <ArrowRight size={13} />
                  {c.assigned_to ? (hi ? 'पुनः आवंटित करें' : 'Reassign') : (hi ? 'आवंटित करें' : 'Allot Task')}
                </button>
              )}

              {canResolve && !isClosed && (
                <button
                  onClick={onResolve}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                    color: '#fff', fontWeight: 800, fontSize: '0.8rem', border: 'none', cursor: 'pointer',
                  }}
                >
                  <Camera size={13} />
                  {hi ? 'हल करें' : 'Resolve'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ color: 'var(--gray-500)', flexShrink: 0, marginTop: 4 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 18, background: 'rgba(255,255,255,0.2)' }}>
          {c.assigned_to && (
            <div style={{
              background: 'var(--theme-bg, #fff4e7)', padding: '12px 14px',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--theme-component-border, #bfbfbf)', marginBottom: 14,
            }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--theme-primary, #660033)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 4 }}>push_pin</span>{hi ? 'कार्य आवंटन विवरण' : 'Task Allotment Details'}
              </p>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--gray-800)', flexWrap: 'wrap' }}>
                <span><strong>Officer:</strong> {c.assigned_name || 'Staff Member'}</span>
                {c.assigned_phone && <span><strong>Phone:</strong> <a href={`tel:${c.assigned_phone}`} style={{ color: 'var(--theme-primary, #660033)' }}>{c.assigned_phone}</a></span>}
                {c.assigned_role && <span><strong>Role:</strong> {roleLabel(c.assigned_role, language)}</span>}
                {c.assigned_at && <span><strong>Allotted:</strong> {fmtDate(c.assigned_at)}</span>}
              </div>
              {c.assignment_notes && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--gray-700)', fontStyle: 'italic' }}>
                  <strong>Note:</strong> "{c.assignment_notes}"
                </p>
              )}
            </div>
          )}

          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--theme-bg, #fff4e7)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-800)', lineHeight: 1.6 }}>{c.description}</p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {c.citizen_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem',
                color: 'var(--gray-700)', background: 'var(--theme-bg, #fff4e7)', padding: '5px 10px',
                borderRadius: 20, border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
                <User size={13} /> {c.citizen_name}
              </span>
            )}
            {c.citizen_phone && (
              <a href={`tel:${c.citizen_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5,
                fontSize: '0.8rem', color: 'var(--theme-primary, #660033)', background: 'var(--theme-bg, #fff4e7)',
                padding: '5px 10px', borderRadius: 20, textDecoration: 'none', border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
                <Phone size={13} /> {c.citizen_phone}
              </a>
            )}
          </div>

          {(c.address || (c.latitude && c.longitude)) && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--theme-bg, #fff4e7)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
              {c.address && <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--gray-700)' }}> {c.address}</p>}
              {c.latitude && c.longitude && (
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                  Coordinates: {c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}
                </span>
              )}
            </div>
          )}

          {c.resolution_note && (
            <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--theme-bg, #fff4e7)',
              borderRadius: 'var(--radius-md)', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-primary, #660033)', textTransform: 'uppercase' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#16a34a', verticalAlign: 'middle', marginRight: 4 }}>check_circle</span>{hi ? 'हल का विवरण' : 'Resolution Note'}
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-800)' }}>{c.resolution_note}</p>
              {c.resolved_at && (
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                  {hi ? 'हल का समय:' : 'Resolved at:'} {fmtDate(c.resolved_at)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
