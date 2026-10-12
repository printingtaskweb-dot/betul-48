import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDeptComplaints, type DeptComplaint } from '../hooks/useDeptComplaints';
import { useAuth } from '../contexts/AuthContext';
import { AllotModal, HierarchyFlow } from '../components/dept/AllotModal';
import {
  getTier, roleLabel, canViewComplaint, canAllotComplaint, canResolveComplaint,
} from '../lib/hierarchy';
import type { StaffMember, Viewer } from '../lib/hierarchy';
import {
  Building2, Search, Filter, CheckCircle, Clock,
  AlertCircle, XCircle, Camera,
  Navigation, Phone, User, Calendar, Hash,
  ChevronDown, ChevronUp, LogOut, RefreshCw,
  Inbox, CheckSquare, Plus, Layers, Briefcase,
  UserCheck, FileText, ShieldAlert,
  ArrowRight, Info
} from 'lucide-react';

// ─── Status Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; labelHi: string; color: string; bg: string; Icon: typeof Clock }> = {
  pending:     { label: 'Pending',     labelHi: 'लंबित',      color: '#92400e', bg: '#fef3c7', Icon: Clock },
  in_progress: { label: 'In Progress', labelHi: 'प्रगति में',   color: '#1d4ed8', bg: '#dbeafe', Icon: AlertCircle },
  resolved:    { label: 'Resolved',    labelHi: 'हल किया',     color: '#065f46', bg: '#d1fae5', Icon: CheckCircle },
  verified:    { label: 'Verified ✓',  labelHi: 'सत्यापित ✓', color: '#5b21b6', bg: '#ede9fe', Icon: CheckSquare },
  rejected:    { label: 'Rejected',    labelHi: 'अस्वीकृत',   color: '#991b1b', bg: '#fee2e2', Icon: XCircle },
};

const STAFF_ROLES = [
  'dept_staff', 'admin', 'department_head', 'supervisor', 'control_room',
  'management_viewer', 'field_employee', 'municipal_administrator',
];

interface Department {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string | null;
  is_active: boolean;
  is_custom?: boolean;
}

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

// ─── Resolution Modal ────────────────────────────────────────────────────────
interface ResolveModalProps {
  complaint: DeptComplaint;
  resolvedBy: string;
  language: 'en' | 'hi';
  onClose: () => void;
  onResolved: () => void;
  resolveComplaint: (id: string, note: string, photo: File | null, by: string) => Promise<boolean>;
}

function ResolveModal({ complaint, resolvedBy, language, onClose, onResolved, resolveComplaint }: ResolveModalProps) {
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hi = language === 'hi';

  const handlePhoto = (f: File) => {
    setPhoto(f);
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) { setErr(hi ? 'नोट आवश्यक है' : 'Resolution note is required'); return; }
    setSubmitting(true);
    const ok = await resolveComplaint(complaint.id, note, photo, resolvedBy);
    if (ok) { onResolved(); onClose(); }
    else { setErr(hi ? 'कुछ गड़बड़ हुई। दोबारा कोशिश करें।' : 'Something went wrong. Try again.'); }
    setSubmitting(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
      }}>
        <div style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', padding: '20px 24px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
            ✅ {hi ? 'शिकायत हल करें' : 'Mark as Resolved'}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>
            #{complaint.ticket_number}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {err && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.83rem', marginBottom: 18 }}>
              {err}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--gray-800)' }}>
              📝 {hi ? 'हल का विवरण *' : 'Resolution Note *'}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={hi ? 'क्या काम किया गया? कब किया?...' : 'What was done to resolve this issue? When?...'}
              rows={4}
              required
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)', fontSize: '0.88rem',
                background: 'var(--theme-bg, #fff4e7)', fontFamily: 'var(--font-primary)',
                resize: 'vertical', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--gray-800)' }}>
              📸 {hi ? 'काम का फोटो' : 'Work Done Photo'}{' '}
              <span style={{ fontWeight: 400, color: 'var(--gray-600)', fontSize: '0.78rem' }}>
                ({hi ? 'अनुशंसित' : 'Recommended'})
              </span>
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileRef}
              onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              style={{ display: 'none' }}
            />
            {!preview ? (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--theme-component-border, #bfbfbf)',
                  borderRadius: 'var(--radius-md)', padding: '30px 20px',
                  textAlign: 'center', cursor: 'pointer',
                  background: 'var(--theme-bg, #fff4e7)',
                }}
              >
                <Camera size={28} color="var(--theme-primary, #660033)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--theme-primary, #660033)' }}>
                  {hi ? 'फोटो खींचें या अपलोड करें' : 'Take or Upload Photo'}
                </p>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <img src={preview} alt="work done" style={{ width: '100%', borderRadius: 'var(--radius-md)', maxHeight: 200, objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPreview(null); }}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                    width: 28, height: 28, cursor: 'pointer', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                color: 'var(--gray-800)', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
              }}
            >
              {hi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 2, padding: '12px', border: 'none',
                borderRadius: 'var(--radius-md)',
                background: submitting ? 'var(--gray-300)' : 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                color: '#fff', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 7,
              }}
            >
              {submitting ? '...' : <><CheckCircle size={16} /> {hi ? 'हल के रूप में चिह्नित करें' : 'Mark as Resolved'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create Department Modal ────────────────────────────────────────────────
interface CreateDeptModalProps {
  language: 'en' | 'hi';
  onClose: () => void;
  onCreated: () => void;
}

const EMOJI_OPTIONS = ['🏢', '🧹', '🚰', '💡', '🛣️', '🌳', '🚒', '🏥', '🏗️', '📋', '⚡', '🚌', '🐕', '🛡️', '🌿', '🚿'];
const COLOR_OPTIONS = ['#660033', '#800040', '#4d0026', '#831843', '#9d174d', '#701a75', '#581c87', '#312e81', '#1e3a8a'];

function CreateDeptModal({ language, onClose, onCreated }: CreateDeptModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('🏢');
  const [color, setColor] = useState('#660033');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hi = language === 'hi';

  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr(hi ? 'विभाग का नाम आवश्यक है' : 'Department name is required');
      return;
    }
    const cleanSlug = (slug || name.toLowerCase()).trim().replace(/[^a-z0-9_-]/g, '');
    if (!cleanSlug) {
      setErr(hi ? 'मान्य स्लग आवश्यक है' : 'Valid slug is required');
      return;
    }

    setSubmitting(true);
    setErr(null);

    try {
      const { error: insErr } = await supabase
        .from('departments')
        .insert({
          name: name.trim(),
          slug: cleanSlug,
          icon,
          color,
          description: description.trim() || null,
          is_active: true,
          is_custom: true,
        });

      if (insErr) throw insErr;
      onCreated();
      onClose();
    } catch (error: any) {
      setErr(error?.message || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  const lbl: React.CSSProperties = { display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: 'var(--gray-800)' };
  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--theme-component-border, #bfbfbf)',
    background: 'var(--theme-bg, #fff4e7)', fontSize: '0.9rem',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
      }}>
        <div style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', padding: '20px 24px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 800 }}>
            🏢 {hi ? 'नया विभाग / श्रेणी जोड़ें' : 'Create New Department / Category'}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>
            {hi ? 'संस्थान प्रमुख द्वारा नागरिक सेवाओं के लिए नया अनुभाग' : 'Organization Head can add municipal service verticals'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {err && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.83rem', marginBottom: 18 }}>
              {err}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>{hi ? 'विभाग का नाम *' : 'Department Name *'}</label>
            <input
              type="text"
              required
              placeholder={hi ? 'उदा. ठोस अपशिष्ट प्रबंधन या मार्ग प्रकाश' : 'e.g. Parks & Horticulture / Water Works'}
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              style={inp}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>{hi ? 'सिस्टम स्लग (पहचानकर्ता) *' : 'System Slug (Unique identifier) *'}</label>
            <input
              type="text"
              required
              placeholder="e.g. parks-horticulture"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              style={{ ...inp, padding: '10px 14px', fontSize: '0.88rem', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>{hi ? 'आइकन प्रतीक' : 'Department Icon'}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJI_OPTIONS.map(em => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setIcon(em)}
                  style={{
                    width: 38, height: 38, borderRadius: 8, fontSize: '1.2rem',
                    border: icon === em ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                    background: icon === em ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>{hi ? 'थीम रंग' : 'Department Accent Color'}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: color === c ? '3px solid #fff' : '2px solid transparent',
                    boxShadow: color === c ? '0 0 0 2px #660033' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>{hi ? 'विभाग का विवरण' : 'Description'}</label>
            <textarea
              rows={3}
              placeholder={hi ? 'इस विभाग द्वारा हल की जाने वाली नागरिक समस्याओं का विवरण...' : 'Scope of work handled by this municipal department...'}
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ ...inp, padding: '10px 12px', fontSize: '0.85rem', fontFamily: 'var(--font-primary)', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                color: 'var(--gray-800)', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
              }}
            >
              {hi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 2, padding: '12px', border: 'none',
                borderRadius: 'var(--radius-md)',
                background: submitting ? 'var(--gray-300)' : 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                color: '#fff', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 7,
              }}
            >
              {submitting ? '...' : <><Plus size={16} /> {hi ? 'विभाग जोड़ें' : 'Create Department'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Complaint Detail Card ──────────────────────────────────────────────────
function ComplaintDetailCard({
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
            {c.citizen_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                <User size={11} /> {c.citizen_name}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
              <Calendar size={11} /> {fmtDate(c.created_at)}
            </span>
          </div>

          <div style={{ marginTop: 8 }}>
            {c.assigned_to ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 6,
                background: 'var(--theme-bg, #fff4e7)', border: '1px solid var(--theme-component-border, #bfbfbf)',
                fontSize: '0.75rem', color: 'var(--theme-primary, #660033)', fontWeight: 700,
              }}>
                <UserCheck size={12} />
                {hi ? 'आवंटित:' : 'Allotted to:'} {c.assigned_name || 'Staff Member'} {c.assigned_code ? `(${c.assigned_code})` : ''}
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6, background: '#fef3c7', color: '#92400e',
                fontSize: '0.73rem', fontWeight: 700,
              }}>
                <Clock size={11} /> {hi ? 'कार्य अभी आवंटित नहीं' : 'Unallotted'}
              </span>
            )}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--theme-component-border, #bfbfbf)',
            flexWrap: 'wrap', gap: 8,
          }}>
            {c.latitude && c.longitude ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                target="_blank" rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--theme-bg, #fff4e7)', color: 'var(--theme-primary, #660033)',
                  fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none',
                  border: '1px solid var(--theme-component-border, #bfbfbf)',
                }}
              >
                <Navigation size={12} /> {hi ? 'दिशा-निर्देश' : 'Get Directions'}
              </a>
            ) : <div />}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* Only higher designations see this button */}
              {canAllot && !isClosed && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAllot(); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--theme-bg, #fff4e7)', color: 'var(--theme-primary, #660033)',
                    border: '1.5px solid var(--theme-primary, #660033)',
                    fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  <Briefcase size={13} />
                  {c.assigned_to ? (hi ? 'पुनः आवंटित करें' : 'Reassign') : (hi ? 'कार्य आवंटित करें' : 'Assign')}
                </button>
              )}

              {canResolve && (c.status === 'pending' || c.status === 'in_progress') && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onResolve(); }}
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
                📌 {hi ? 'कार्य आवंटन विवरण' : 'Task Allotment Details'}
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
              {c.address && <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--gray-700)' }}>📍 {c.address}</p>}
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
                ✅ {hi ? 'हल का विवरण' : 'Resolution Note'}
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

// ─── Main Department Dashboard ──────────────────────────────────────────────
export default function DeptDashboard() {
  const { user, language } = useAuth();
  const navigate = useNavigate();
  const hi = language === 'hi';

  const [profile, setProfile] = useState<{
    id: string;
    full_name: string | null;
    role: string | null; // effective role (is_admin => 'admin')
    linked_department_id: string | null;
    dept_name: string | null;
    dept_icon: string | null;
  } | null>(null);

  const [profileLoading, setProfileLoading] = useState(true);
  const [noDept, setNoDept] = useState(false);
  const [activeTab, setActiveTab] = useState<'complaints' | 'departments' | 'staff_reports'>('complaints');
  const [statusFilter, setStatusFilter] = useState('all');
  const [unallottedOnly, setUnallottedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  const [resolving, setResolving] = useState<DeptComplaint | null>(null);
  const [allotting, setAllotting] = useState<DeptComplaint | null>(null);
  const [showCreateDept, setShowCreateDept] = useState(false);

  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const { complaints, loading, error, fetchComplaints, assignComplaint, resolveComplaint } = useDeptComplaints(
    selectedDeptId
  );

  const myTier = getTier(profile?.role);
  const orgLevel = myTier === 0;

  const viewer: Viewer = useMemo(
    () => ({
      id: profile?.id || '',
      role: profile?.role || null,
      linked_department_id: profile?.linked_department_id || null,
    }),
    [profile]
  );

  // ── Load profile + access check ──
  useEffect(() => {
    if (!user) { navigate('/dept/login', { replace: true }); return; }

    (async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, linked_department_id, is_admin')
        .eq('id', user.id)
        .single();

      if (!data || !(data.is_admin || STAFF_ROLES.includes(data.role ?? ''))) {
        await supabase.auth.signOut();
        navigate('/dept/login', { replace: true });
        return;
      }

      // If user has a linked department, they belong to that department and CANNOT view other departments
      const isOrg = !data.linked_department_id && (data.role === 'municipal_administrator' || data.role === 'admin');
      const effectiveRole = isOrg ? 'municipal_administrator' : (data.role || 'dept_staff');
      let dName: string | null = null;
      let dIcon: string | null = null;

      if (data.linked_department_id) {
        const { data: dept } = await supabase
          .from('departments')
          .select('name, icon')
          .eq('id', data.linked_department_id)
          .single();
        if (dept) { dName = dept.name; dIcon = dept.icon || '🏢'; }
      }

      if (!isOrg && !data.linked_department_id) setNoDept(true);

      setProfile({
        id: data.id,
        full_name: data.full_name,
        role: effectiveRole,
        linked_department_id: data.linked_department_id,
        dept_name: dName,
        dept_icon: dIcon,
      });

      // Strict department isolation: locked to their linked department
      setSelectedDeptId(isOrg ? 'all' : (data.linked_department_id || 'none'));
      setProfileLoading(false);
    })();
  }, [user, navigate]);

  // ── Load departments & staff, scoped by role ──
  const loadDepartmentsAndStaff = useCallback(async () => {
    if (!profile || noDept) return;
    try {
      let dq = supabase.from('departments').select('*').order('name');
      let sq = supabase
        .from('user_profiles')
        .select('id, full_name, phone, email, role, staff_code, linked_department_id, ward_number, authority_role, hierarchy_code')
        .in('role', STAFF_ROLES)
        .order('full_name');

      if (!orgLevel) {
        dq = dq.eq('id', profile.linked_department_id as string);
        sq = sq.eq('linked_department_id', profile.linked_department_id as string);
      }

      const [{ data: depts }, { data: staff }] = await Promise.all([dq, sq]);
      if (depts) setAllDepartments(depts);
      if (staff) setStaffList(staff as StaffMember[]);
    } catch (e) {
      console.warn('Error loading depts/staff:', e);
    }
  }, [profile, noDept, orgLevel]);

  useEffect(() => { loadDepartmentsAndStaff(); }, [loadDepartmentsAndStaff]);

  // ── Fetch complaints ──
  useEffect(() => {
    if (!profile || noDept) return;
    if (!orgLevel && selectedDeptId === 'all') return; // never fetch "all" for non-org users
    fetchComplaints(statusFilter, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, noDept, orgLevel, selectedDeptId, statusFilter, fetchComplaints]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints(statusFilter, search);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/dept/login', { replace: true });
  };

  // Safety net: even if the hook returns more, only show what this role may see
  const visibleComplaints = useMemo(
    () => (profile && !noDept ? complaints.filter(c => canViewComplaint(viewer, c)) : []),
    [complaints, viewer, profile, noDept]
  );

  const shownComplaints = useMemo(
    () => unallottedOnly
      ? visibleComplaints.filter(c => !c.assigned_to && (c.status === 'pending' || c.status === 'in_progress'))
      : visibleComplaints,
    [visibleComplaints, unallottedOnly]
  );

  const stats = useMemo(() => ({
    total: visibleComplaints.length,
    pending: visibleComplaints.filter(c => c.status === 'pending').length,
    in_progress: visibleComplaints.filter(c => c.status === 'in_progress').length,
    resolved: visibleComplaints.filter(c => ['resolved', 'verified'].includes(c.status)).length,
    unallotted: visibleComplaints.filter(c => !c.assigned_to && (c.status === 'pending' || c.status === 'in_progress')).length,
  }), [visibleComplaints]);

  // Staff reports: only people BELOW me in the chain
  const staffReports = useMemo(() => {
    return staffList
      .filter(st => st.id !== viewer.id && getTier(st.role) > myTier && getTier(st.role) <= 3)
      .map(st => {
        const assigned = visibleComplaints.filter(c => c.assigned_to === st.id);
        const pending = assigned.filter(c => c.status === 'pending').length;
        const inProg = assigned.filter(c => c.status === 'in_progress').length;
        const done = assigned.filter(c => ['resolved', 'verified'].includes(c.status)).length;
        const rate = assigned.length > 0 ? Math.round((done / assigned.length) * 100) : 100;
        return { ...st, totalAssigned: assigned.length, pending, inProg, done, rate };
      });
  }, [staffList, visibleComplaints, viewer.id, myTier]);

  // ── Early screens ──
  if (profileLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--theme-bg, #fff4e7)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--gray-700)', fontWeight: 700 }}>{hi ? 'विभाग डैशबोर्ड लोड हो रहा है...' : 'Loading Department Portal...'}</p>
        </div>
      </div>
    );
  }

  if (noDept) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--theme-bg, #fff4e7)', padding: 20 }}>
        <div style={{ maxWidth: 420, textAlign: 'center', background: 'var(--theme-component, #d9d9d9)',
          padding: 28, borderRadius: 'var(--radius-xl)', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
          <ShieldAlert size={36} color="#dc2626" style={{ margin: '0 auto 10px', display: 'block' }} />
          <h3 style={{ margin: '0 0 8px', fontWeight: 800 }}>
            {hi ? 'कोई विभाग आवंटित नहीं' : 'No department linked to your account'}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '0.86rem', color: 'var(--gray-700)' }}>
            {hi ? 'कृपया एडमिन से अपने खाते में विभाग जोड़ने को कहें।' : 'Please ask the admin to link your account to a department.'}
          </p>
          <button onClick={handleLogout} style={{ padding: '9px 18px', borderRadius: 'var(--radius-md)', border: 'none',
            background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
            {hi ? 'लॉगआउट' : 'Logout'}
          </button>
        </div>
      </div>
    );
  }

  const canAllotAnything = myTier <= 2;
  const nextTier = canAllotAnything ? myTier + 1 : null;

  const bannerText =
    myTier === 0
      ? (hi ? 'आप सभी विभाग देख सकते हैं और कार्य विभाग प्रमुख को सौंप सकते हैं।' : 'You can see all departments and assign work to Department Heads.')
      : myTier === 1
      ? (hi ? 'आप केवल अपने विभाग की शिकायतें देखते हैं और क्षेत्र पर्यवेक्षकों को कार्य सौंप सकते हैं।' : 'You see only your department. Assign work to Area Supervisors.')
      : myTier === 2
      ? (hi ? 'आप अपने विभाग की शिकायतें देखते हैं और फील्ड कर्मचारियों को कार्य सौंप सकते हैं।' : 'You see your department. Assign work to Field Employees.')
      : (hi ? 'आप केवल अपने को सौंपे गए कार्य देखते हैं। काम पूरा होने पर फोटो के साथ हल करें।' : 'You see only tasks assigned to you. Resolve them with a work photo.');

  const tabs = [
    { id: 'complaints', label: hi ? 'शिकायतें एवं कार्य' : 'Complaints & Tasks', icon: Briefcase, count: visibleComplaints.length },
    ...(myTier <= 1 ? [{ id: 'departments', label: hi ? 'विभाग और श्रेणियां' : 'Departments', icon: Layers, count: allDepartments.length }] : []),
    ...(myTier <= 2 ? [{ id: 'staff_reports', label: hi ? 'कर्मचारी रिपोर्ट' : 'Staff Reports', icon: FileText, count: staffReports.length }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--theme-bg, #fff4e7)', fontFamily: 'var(--font-primary)' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
        padding: '0 clamp(16px, 4vw, 32px)', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 14px rgba(0,0,0,0.25)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 64, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                {orgLevel
                  ? `🏛️ ${hi ? 'समस्त विभाग / संगठन' : 'All Departments'}`
                  : `${profile?.dept_icon || '🏢'} ${profile?.dept_name || 'Department'}`}
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>
                {profile?.full_name ? `${profile.full_name} • ` : ''}{roleLabel(profile?.role, language)}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Department selector ONLY for org level */}
            {orgLevel && (
              <select
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '0.82rem',
                  fontWeight: 700, outline: 'none', cursor: 'pointer' }}
              >
                <option value="all" style={{ color: '#000' }}>🏛️ {hi ? 'समस्त विभाग' : 'All Departments'}</option>
                {allDepartments.map(d => (
                  <option key={d.id} value={d.id} style={{ color: '#000' }}>{d.icon} {d.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              <LogOut size={14} /> {hi ? 'लॉगआउट' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(16px, 3vw, 28px) clamp(12px, 3vw, 24px)' }}>

        {/* ── Role banner + flow ── */}
        <div style={{
          background: 'var(--theme-component, #d9d9d9)', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: 'var(--gray-800)' }}>
              <Info size={16} color="var(--theme-primary, #660033)" style={{ flexShrink: 0 }} />
              <span>{bannerText}</span>
            </div>
            {orgLevel && (
              <button
                onClick={() => setShowCreateDept(true)}
                style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                  color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> {hi ? 'नया विभाग जोड़ें' : 'Create New Department'}
              </button>
            )}
          </div>
          <HierarchyFlow myTier={myTier} targetTier={nextTier} language={language} />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--theme-component-border, #bfbfbf)',
          paddingBottom: 4, flexWrap: 'wrap' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: '8px 8px 0 0',
                  border: 'none', background: active ? 'var(--theme-component, #d9d9d9)' : 'transparent',
                  color: active ? 'var(--theme-primary, #660033)' : 'var(--gray-700)',
                  fontWeight: active ? 900 : 700, fontSize: '0.9rem', cursor: 'pointer',
                  borderBottom: active ? '3px solid var(--theme-primary, #660033)' : '3px solid transparent',
                  marginBottom: -6,
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span style={{ padding: '2px 7px', borderRadius: 12,
                  background: active ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                  color: active ? '#fff' : 'var(--gray-800)', fontSize: '0.74rem', fontWeight: 800 }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: COMPLAINTS ── */}
        {activeTab === 'complaints' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { key: 'all', label: hi ? 'कुल शिकायतें' : 'Total', val: stats.total, color: '#1e40af', bg: '#dbeafe', icon: Hash },
                { key: 'pending', label: hi ? 'लंबित' : 'Pending', val: stats.pending, color: '#92400e', bg: '#fef3c7', icon: Clock },
                { key: 'in_progress', label: hi ? 'प्रगति में' : 'In Progress', val: stats.in_progress, color: '#1d4ed8', bg: '#bfdbfe', icon: AlertCircle },
                { key: 'resolved', label: hi ? 'हल किए' : 'Resolved', val: stats.resolved, color: '#065f46', bg: '#d1fae5', icon: CheckCircle },
                ...(canAllotAnything
                  ? [{ key: 'unallotted', label: hi ? 'अनआवंटित' : 'Unallotted', val: stats.unallotted, color: '#dc2626', bg: '#fee2e2', icon: ShieldAlert }]
                  : []),
              ].map(s => {
                const Icon = s.icon;
                const isSelected = s.key === 'unallotted' ? unallottedOnly : (!unallottedOnly && statusFilter === s.key);
                return (
                  <div
                    key={s.key}
                    onClick={() => {
                      if (s.key === 'unallotted') { setUnallottedOnly(true); setStatusFilter('all'); }
                      else { setUnallottedOnly(false); setStatusFilter(s.key); }
                    }}
                    style={{
                      background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: 16,
                      border: isSelected ? '2px solid var(--theme-primary, #660033)' : '1.5px solid var(--theme-component-border, #bfbfbf)',
                      boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>{s.label}</span>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={14} color={s.color} />
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 900, color: s.color }}>{s.val}</p>
                  </div>
                );
              })}
            </div>

            {/* Search + filter */}
            <div style={{ background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', padding: 16,
              border: '1.5px solid var(--theme-component-border, #bfbfbf)', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative', minWidth: 220 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                  <input
                    type="text"
                    placeholder={hi ? 'टिकट नंबर, नाम या विवरण खोजें...' : 'Search ticket, citizen name, address...'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px 10px 36px',
                      border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-md)',
                      fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                      background: 'var(--theme-bg, #fff4e7)', fontFamily: 'var(--font-primary)' }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <Filter size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setUnallottedOnly(false); }}
                    style={{ padding: '10px 14px 10px 32px', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                      borderRadius: 'var(--radius-md)', fontSize: '0.88rem', background: 'var(--theme-bg, #fff4e7)',
                      outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-primary)' }}
                  >
                    <option value="all">{hi ? 'सभी स्थिति' : 'All Status'}</option>
                    <option value="pending">{hi ? 'लंबित' : 'Pending'}</option>
                    <option value="in_progress">{hi ? 'प्रगति में' : 'In Progress'}</option>
                    <option value="resolved">{hi ? 'हल किए' : 'Resolved'}</option>
                    <option value="verified">{hi ? 'सत्यापित' : 'Verified'}</option>
                    <option value="rejected">{hi ? 'अस्वीकृत' : 'Rejected'}</option>
                  </select>
                </div>
                <button type="submit"
                  style={{ padding: '10px 18px', border: 'none', borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                    color: '#fff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Search size={14} /> {hi ? 'खोजें' : 'Search'}
                </button>
                <button type="button"
                  onClick={() => { setSearch(''); setStatusFilter('all'); setUnallottedOnly(false); setTimeout(() => fetchComplaints(), 50); }}
                  style={{ padding: '10px 14px', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                    borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                    color: 'var(--gray-800)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5 }}>
                  <RefreshCw size={13} /> {hi ? 'रिफ्रेश' : 'Refresh'}
                </button>
              </form>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 14px' }} />
                <p style={{ color: 'var(--gray-700)', fontSize: '0.9rem', fontWeight: 700 }}>
                  {hi ? 'शिकायतें लोड हो रही हैं...' : 'Loading grievances...'}
                </p>
              </div>
            ) : error ? (
              <div style={{ padding: 24, textAlign: 'center', background: '#fef2f2', borderRadius: 'var(--radius-lg)', border: '1.5px solid #fecaca' }}>
                <XCircle size={28} color="#dc2626" style={{ margin: '0 auto 10px', display: 'block' }} />
                <p style={{ margin: 0, color: '#dc2626', fontWeight: 700 }}>{error}</p>
              </div>
            ) : shownComplaints.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--theme-component, #d9d9d9)',
                borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--theme-component-border, #bfbfbf)' }}>
                <Inbox size={40} color="var(--gray-500)" style={{ margin: '0 auto 14px', display: 'block' }} />
                <h3 style={{ margin: '0 0 6px', color: 'var(--gray-800)', fontWeight: 800 }}>
                  {hi ? 'कोई शिकायत नहीं मिली' : 'No grievances found'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                  {myTier === 3
                    ? (hi ? 'आपको अभी कोई कार्य नहीं सौंपा गया है' : 'No tasks have been assigned to you yet')
                    : (hi ? 'फिल्टर बदलें' : 'Try selecting another status')}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: 'var(--gray-600)', fontWeight: 700 }}>
                  {shownComplaints.length} {hi ? 'शिकायतें प्रदर्शित' : 'complaints displayed'}
                </p>
                {shownComplaints.map(c => (
                  <ComplaintDetailCard
                    key={c.id}
                    c={c}
                    language={language}
                    canAllot={canAllotComplaint(viewer, c.department_id)}
                    canResolve={canResolveComplaint(viewer, c)}
                    onResolve={() => setResolving(c)}
                    onAllot={() => setAllotting(c)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB 2: DEPARTMENTS (org + dept head only) ── */}
        {activeTab === 'departments' && myTier <= 1 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--theme-primary, #660033)' }}>
                {hi ? 'नगर निगम विभाग' : 'Municipal Departments'}
              </h2>
              {orgLevel && (
                <button
                  onClick={() => setShowCreateDept(true)}
                  style={{ padding: '9px 18px', borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                    color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.86rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={16} /> {hi ? 'नया विभाग बनाएं' : 'Create New Department'}
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {allDepartments.map(dept => {
                const deptComplaints = visibleComplaints.filter(c => c.department_id === dept.id);
                const deptStaff = staffList.filter(s => s.linked_department_id === dept.id);
                return (
                  <div key={dept.id} style={{ background: 'var(--theme-component, #d9d9d9)',
                    border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-lg)',
                    padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--theme-bg, #fff4e7)',
                          border: '1px solid var(--theme-component-border, #bfbfbf)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                          {dept.icon || '🏢'}
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: 12,
                          background: dept.is_active ? '#d1fae5' : '#fee2e2', color: dept.is_active ? '#065f46' : '#991b1b' }}>
                          {dept.is_active ? (hi ? 'सक्रिय' : 'Active') : (hi ? 'निष्क्रिय' : 'Inactive')}
                        </span>
                      </div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: 'var(--gray-900)' }}>{dept.name}</h3>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-700)', lineHeight: 1.4 }}>
                        {dept.description || (hi ? 'कोई विवरण नहीं' : 'No description provided.')}
                      </p>
                    </div>
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--theme-component-border, #bfbfbf)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-700)' }}>
                        <strong>{deptComplaints.length}</strong> {hi ? 'शिकायतें' : 'complaints'}
                        <span style={{ margin: '0 6px' }}>•</span>
                        <strong>{deptStaff.length}</strong> {hi ? 'स्टाफ' : 'staff'}
                      </div>
                      <button
                        onClick={() => { if (orgLevel) setSelectedDeptId(dept.id); setActiveTab('complaints'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6,
                          background: 'var(--theme-bg, #fff4e7)', border: '1px solid var(--theme-component-border, #bfbfbf)',
                          color: 'var(--theme-primary, #660033)', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        {hi ? 'कार्य देखें' : 'View Work'} <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: STAFF REPORTS (people below me) ── */}
        {activeTab === 'staff_reports' && myTier <= 2 && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--theme-primary, #660033)' }}>
                👥 {hi ? 'कर्मचारी कार्य रिपोर्ट' : 'Team Work Reports'}
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                {hi ? 'आपके अधीनस्थ कर्मचारियों का कार्य' : 'Workload and performance of staff below you'}
              </p>
            </div>

            <div style={{ background: 'var(--theme-component, #d9d9d9)', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', color: '#fff' }}>
                      {[hi ? 'कर्मचारी' : 'Staff', hi ? 'पद' : 'Role', hi ? 'संपर्क' : 'Contact',
                        hi ? 'आवंटित' : 'Assigned', hi ? 'खुले कार्य' : 'Open', hi ? 'हल' : 'Resolved', hi ? 'सफलता दर' : 'Rate'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', fontWeight: 800 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staffReports.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--gray-600)' }}>
                        {hi ? 'कोई अधीनस्थ कर्मचारी नहीं' : 'No staff below you yet.'}
                      </td></tr>
                    )}
                    {staffReports.map((st, idx) => (
                      <tr key={st.id} style={{ borderBottom: '1px solid var(--theme-component-border, #bfbfbf)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.2)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--gray-900)' }}>
                          <div>{st.full_name || 'Officer'}</div>
                          {st.staff_code && <span style={{ fontSize: '0.72rem', color: 'var(--theme-primary, #660033)', fontFamily: 'monospace' }}>{st.staff_code}</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 4, background: 'var(--theme-bg, #fff4e7)',
                            border: '1px solid var(--theme-component-border, #bfbfbf)', fontSize: '0.76rem', fontWeight: 700 }}>
                            {roleLabel(st.role, language)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                          {st.phone
                            ? <a href={`tel:${st.phone}`} style={{ color: 'var(--theme-primary, #660033)', textDecoration: 'none', fontWeight: 700 }}>📞 {st.phone}</a>
                            : (st.email || '—')}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 800 }}>{st.totalAssigned}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1d4ed8' }}>{st.inProg + st.pending}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#065f46' }}>{st.done}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 60, height: 8, borderRadius: 4, background: 'var(--theme-component-border, #bfbfbf)', overflow: 'hidden' }}>
                              <div style={{ width: `${st.rate}%`, height: '100%',
                                background: st.rate >= 80 ? '#15803d' : st.rate >= 50 ? '#d97706' : '#dc2626' }} />
                            </div>
                            <span style={{ fontSize: '0.76rem', fontWeight: 800 }}>{st.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {allotting && (
        <AllotModal
          complaint={allotting}
          viewer={viewer}
          staffList={staffList}
          language={language}
          onClose={() => setAllotting(null)}
          onAllotted={() => fetchComplaints(statusFilter, search)}
          assignComplaint={assignComplaint}
        />
      )}

      {resolving && (
        <ResolveModal
          complaint={resolving}
          resolvedBy={profile?.full_name || user?.email || 'dept_staff'}
          language={language}
          onClose={() => setResolving(null)}
          onResolved={() => fetchComplaints(statusFilter, search)}
          resolveComplaint={resolveComplaint}
        />
      )}

      {showCreateDept && orgLevel && (
        <CreateDeptModal
          language={language}
          onClose={() => setShowCreateDept(false)}
          onCreated={() => {
            loadDepartmentsAndStaff();
            fetchComplaints(statusFilter, search);
          }}
        />
      )}
    </div>
  );
}
