// src/components/dept/AllotModal.tsx
import React, { useMemo, useState } from 'react';
import { Send, Phone, MapPin, UserCheck, ArrowRight } from 'lucide-react';
import {
  FLOW_STEPS,
  TIER_LABEL,
  getAssignableStaff,
  getTier,
  roleLabel,
} from '../../lib/hierarchy';
import type { StaffMember, Viewer } from '../../lib/hierarchy';

// ─── Flow strip: Administrator → Dept Head → Supervisor → Field Employee ──
export function HierarchyFlow({
  myTier,
  targetTier,
  language,
}: {
  myTier: number;
  targetTier?: number | null;
  language: 'en' | 'hi';
}) {
  const hi = language === 'hi';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {FLOW_STEPS.map((t, i) => {
        const isMe = t === myTier;
        const isTarget = t === targetTier;
        return (
          <React.Fragment key={t}>
            {i > 0 && <ArrowRight size={13} color="var(--gray-500)" />}
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.74rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                background: isTarget ? 'var(--theme-primary, #660033)' : 'var(--theme-bg, #fff4e7)',
                color: isTarget ? '#fff' : isMe ? 'var(--theme-primary, #660033)' : 'var(--gray-600)',
                border: isMe
                  ? '2px solid var(--theme-primary, #660033)'
                  : '1px solid var(--theme-component-border, #bfbfbf)',
                opacity: isMe || isTarget ? 1 : 0.65,
              }}
            >
              {isMe && (hi ? 'आप: ' : 'You: ')}
              {TIER_LABEL[t][hi ? 'hi' : 'en']}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Minimal complaint shape so both dashboards can use this modal ────────
export interface AllotTarget {
  id: string;
  ticket_number: string;
  description: string;
  department_id?: string | null;
  dept_name?: string | null;
  assigned_to?: string | null;
  assignment_notes?: string | null;
  citizen_name?: string | null;
  citizen_phone?: string | null;
  address?: string | null;
}

interface AllotModalProps {
  complaint: AllotTarget;
  viewer: Viewer;
  staffList: StaffMember[];
  language: 'en' | 'hi';
  onClose: () => void;
  onAllotted: () => void;
  assignComplaint: (id: string, staffId: string, assignedById?: string, notes?: string) => Promise<boolean>;
}

export function AllotModal({
  complaint,
  viewer,
  staffList,
  language,
  onClose,
  onAllotted,
  assignComplaint,
}: AllotModalProps) {
  const hi = language === 'hi';
  const myTier = getTier(viewer.role);

  const { targetTier, list, skippedLevel } = useMemo(
    () => getAssignableStaff(viewer, complaint.department_id ?? null, staffList),
    [viewer, complaint.department_id, staffList]
  );

  const wards = useMemo(
    () => Array.from(new Set(list.map((s) => s.ward_number).filter(Boolean))) as string[],
    [list]
  );

  const [ward, setWard] = useState('all');
  const [selectedId, setSelectedId] = useState(
    complaint.assigned_to && list.some((s) => s.id === complaint.assigned_to) ? complaint.assigned_to : ''
  );
  const [notes, setNotes] = useState(complaint.assignment_notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const visible = ward === 'all' ? list : list.filter((s) => s.ward_number === ward);
  const currentAssignee = staffList.find((s) => s.id === complaint.assigned_to);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setErr(hi ? 'कृपया एक कर्मचारी चुनें' : 'Please select who to assign this to.');
      return;
    }
    setSubmitting(true);
    setErr(null);
    const ok = await assignComplaint(complaint.id, selectedId, viewer.id, notes);
    if (ok) {
      onAllotted();
      onClose();
    } else {
      setErr(hi ? 'कार्य आवंटन विफल। पुनः प्रयास करें।' : 'Failed to assign. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 560,
          background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
          maxHeight: '92vh', overflowY: 'auto',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
        }}
      >
        <div style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', padding: '18px 22px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
            📌 {hi ? 'कार्य आवंटित करें' : 'Assign Task'}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>
            #{complaint.ticket_number} {complaint.dept_name ? `• ${complaint.dept_name}` : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22 }}>
          {err && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.83rem', marginBottom: 14 }}>
              {err}
            </div>
          )}

          {/* Step 1: where am I in the chain */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.76rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
              {hi ? 'आवंटन क्रम' : 'Assignment flow'}
            </p>
            <HierarchyFlow myTier={myTier} targetTier={targetTier} language={language} />
          </div>

          {/* Complaint summary */}
          <div style={{ background: 'var(--theme-bg, #fff4e7)', padding: '10px 14px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--theme-component-border, #bfbfbf)', marginBottom: 16, fontSize: '0.84rem' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--theme-primary, #660033)' }}>{complaint.description}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
              {complaint.citizen_name && <span>👤 {complaint.citizen_name}</span>}
              {complaint.address && <span>📍 {complaint.address}</span>}
            </div>
            {currentAssignee && (
              <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--gray-800)' }}>
                <UserCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
                {hi ? 'अभी इनके पास:' : 'Currently with:'} <strong>{currentAssignee.full_name || 'Staff'}</strong>
              </p>
            )}
          </div>

          {/* Step 2: pick person */}
          {targetTier === null ? (
            <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: '#fef3c7', color: '#92400e',
              fontSize: '0.84rem', fontWeight: 600, marginBottom: 16 }}>
              {hi
                ? 'इस विभाग में आवंटन के लिए कोई निचले स्तर का कर्मचारी उपलब्ध नहीं है।'
                : 'No lower-level staff found in this department to assign to. Ask admin to register them first.'}
            </div>
          ) : (
            <>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: 'var(--gray-800)' }}>
                👷 {hi ? 'चुनें' : 'Select'}: {TIER_LABEL[targetTier][hi ? 'hi' : 'en']} *
              </label>

              {skippedLevel && (
                <p style={{ margin: '0 0 8px', fontSize: '0.76rem', color: '#92400e' }}>
                  {hi
                    ? 'अगले स्तर पर कोई नहीं मिला, इसलिए इसके नीचे का स्तर दिखाया जा रहा है।'
                    : 'Nobody at the next level, so showing the level below it.'}
                </p>
              )}

              {wards.length > 1 && (
                <select
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', marginBottom: 8, borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--theme-component-border, #bfbfbf)', background: 'var(--theme-bg, #fff4e7)',
                    fontSize: '0.85rem' }}
                >
                  <option value="all">📍 {hi ? 'सभी क्षेत्र' : 'All areas / wards'}</option>
                  {wards.map((w) => (
                    <option key={w} value={w}>📍 {hi ? 'वार्ड' : 'Ward'} {w}</option>
                  ))}
                </select>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
                {visible.length === 0 && (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                    {hi ? 'इस क्षेत्र में कोई नहीं' : 'No one in this area.'}
                  </p>
                )}
                {visible.map((s) => {
                  const active = selectedId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      style={{
                        padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        background: active ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.35)',
                        border: active ? '2px solid var(--theme-primary, #660033)' : '1.5px solid var(--theme-component-border, #bfbfbf)',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      <input type="radio" checked={active} readOnly />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--gray-900)' }}>
                          {s.full_name || s.email || 'Unnamed'}
                          {s.staff_code && (
                            <span style={{ marginLeft: 6, fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--theme-primary, #660033)' }}>
                              {s.staff_code}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.74rem', color: 'var(--gray-600)', marginTop: 2 }}>
                          <span>{roleLabel(s.role, language)}</span>
                          {s.ward_number && <span><MapPin size={11} style={{ display: 'inline' }} /> {hi ? 'वार्ड' : 'Ward'} {s.ward_number}</span>}
                          {s.phone && <span><Phone size={11} style={{ display: 'inline' }} /> {s.phone}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Instructions */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: 'var(--gray-800)' }}>
              📋 {hi ? 'निर्देश' : 'Instructions (optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={hi ? 'उदा. आज शाम तक निरीक्षण करें...' : 'e.g. Inspect the site today and upload a photo...'}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)', fontSize: '0.85rem',
                background: 'var(--theme-bg, #fff4e7)', fontFamily: 'var(--font-primary)',
                resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: 12, border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                color: 'var(--gray-800)', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
            >
              {hi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || targetTier === null}
              style={{
                flex: 2, padding: 12, border: 'none', borderRadius: 'var(--radius-md)',
                background: submitting || targetTier === null ? 'var(--gray-300)' : 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                color: '#fff', fontWeight: 800, fontSize: '0.9rem',
                cursor: submitting || targetTier === null ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              {submitting ? '...' : <><Send size={15} /> {hi ? 'आवंटित करें' : 'Confirm Assignment'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
