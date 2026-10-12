import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDeptComplaints, type DeptComplaint } from '../hooks/useDeptComplaints';
import { useAuth } from '../contexts/AuthContext';
import { AllotModal, HierarchyFlow } from '../components/dept/AllotModal';
import {
  getTier, roleLabel, canViewComplaint, canAllotComplaint, canResolveComplaint, TIER_LABEL,
} from '../lib/hierarchy';
import type { StaffMember, Viewer } from '../lib/hierarchy';
import {
  Building2, Search, Filter, CheckCircle, Clock,
  AlertCircle, XCircle, Camera,
  Phone, User, Hash,
  ChevronDown, ChevronUp, LogOut, RefreshCw,
  Inbox, CheckSquare, Plus, Layers, Briefcase,
  FileText, ShieldAlert,
  ArrowRight, Info, Users, Award, Mail, MapPin,
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
  'deputy_commissioner', 'area_officer', 'operational_staff',
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

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: 'var(--gray-800)' }}>
              {hi ? 'कार्य विवरण / समाधान नोट *' : 'Resolution Note / Action Taken *'}
            </label>
            <textarea
              rows={4}
              required
              placeholder={hi ? 'किए गए कार्य का विवरण लिखें...' : 'Describe what action was taken to fix the issue...'}
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-bg, #fff4e7)', fontSize: '0.9rem',
                outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-primary)',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6, color: 'var(--gray-800)' }}>
              {hi ? 'कार्य पूर्णता की फोटो (वैकल्पिक)' : 'Resolution Proof Photo (Optional)'}
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)', padding: 18, textAlign: 'center',
                cursor: 'pointer', background: 'var(--theme-bg, #fff4e7)',
              }}
            >
              {preview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={preview} alt="preview" style={{ maxHeight: 140, borderRadius: 8 }} />
                  <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--gray-600)' }}>
                    {hi ? 'बदलने के लिए क्लिक करें' : 'Click to change photo'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <Camera size={26} color="var(--theme-primary, #660033)" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--gray-700)' }}>
                    {hi ? 'फोटो अपलोड करने के लिए क्लिक करें' : 'Click to take/upload photo'}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--gray-500)' }}>PNG, JPG up to 10MB</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])}
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, fontSize: '0.76rem', color: 'var(--gray-600)', flexWrap: 'wrap' }}>
              <span>{fmtDate(c.created_at)}</span>
              {c.assigned_name && (
                <span style={{ fontWeight: 700, color: 'var(--theme-primary, #660033)' }}>
                  👤 {c.assigned_name} ({roleLabel(c.assigned_role, language)})
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
    role: string | null;
    linked_department_id: string | null;
    dept_name: string | null;
    dept_icon: string | null;
    authority_role?: string | null;
    hierarchy_code?: string | null;
  } | null>(null);

  const [profileLoading, setProfileLoading] = useState(true);
  const [noDept, setNoDept] = useState(false);
  const [activeTab, setActiveTab] = useState<'complaints' | 'departments' | 'staff_reports'>('complaints');
  const [statusFilter, setStatusFilter] = useState('all');
  const [unallottedOnly, setUnallottedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  // Drilldown department in Tab 2 (Departments & Staff)
  const [selectedDeptDetailId, setSelectedDeptDetailId] = useState<string>('');
  const [deptStaffTierFilter, setDeptStaffTierFilter] = useState<'all' | '3' | '4' | '5'>('all');
  const [deptStaffSearch, setDeptStaffSearch] = useState<string>('');

  // Tab 3 filters
  const [staffReportDeptFilter, setStaffReportDeptFilter] = useState<string>('all');
  const [staffReportSearch, setStaffReportSearch] = useState<string>('');
  const [staffReportTierFilter, setStaffReportTierFilter] = useState<string>('all');

  const [resolving, setResolving] = useState<DeptComplaint | null>(null);
  const [allotting, setAllotting] = useState<DeptComplaint | null>(null);
  const [showCreateDept, setShowCreateDept] = useState(false);

  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const { complaints, loading, error, fetchComplaints, assignComplaint, resolveComplaint } = useDeptComplaints(
    selectedDeptId
  );

  const myTier = getTier(profile?.role, profile?.hierarchy_code, profile?.authority_role);
  // Municipal Administrator & Deputy Commissioner have city-wide org purview
  const orgLevel = myTier <= 1;

  const viewer: Viewer = useMemo(
    () => ({
      id: profile?.id || '',
      role: profile?.role || null,
      linked_department_id: profile?.linked_department_id || null,
      authority_role: profile?.authority_role || null,
      hierarchy_code: profile?.hierarchy_code || null,
    }),
    [profile]
  );

  // ── Load profile + access check ──
  useEffect(() => {
    if (!user) { navigate('/dept/login', { replace: true }); return; }

    (async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, role, linked_department_id, is_admin, authority_role, hierarchy_code')
        .eq('id', user.id)
        .single();

      if (!data || !(data.is_admin || STAFF_ROLES.includes(data.role ?? ''))) {
        await supabase.auth.signOut();
        navigate('/dept/login', { replace: true });
        return;
      }

      const myTierVal = getTier(data.role, data.hierarchy_code, data.authority_role);
      const isOrg = Boolean(data.is_admin) || myTierVal <= 1 || (!data.linked_department_id && (data.role === 'municipal_administrator' || data.role === 'admin' || data.role === 'deputy_commissioner'));
      const effectiveRole = isOrg ? (data.role || 'municipal_administrator') : (data.role || 'dept_staff');
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
        authority_role: data.authority_role,
        hierarchy_code: data.hierarchy_code,
      });

      // Strict department isolation: locked to their linked department
      setSelectedDeptId(isOrg ? 'all' : (data.linked_department_id || 'none'));
      if (data.linked_department_id) {
        setSelectedDeptDetailId(data.linked_department_id);
      }
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

      if (!orgLevel && profile.linked_department_id) {
        dq = dq.eq('id', profile.linked_department_id);
        sq = sq.eq('linked_department_id', profile.linked_department_id);
      }

      const [{ data: depts }, { data: staff }] = await Promise.all([dq, sq]);
      if (depts) {
        setAllDepartments(depts);
        // Only set default once – do NOT include selectedDeptDetailId in deps to avoid infinite loop
        setSelectedDeptDetailId(prev => prev || profile.linked_department_id || depts[0]?.id || '');
      }
      if (staff) setStaffList(staff as StaffMember[]);
    } catch (e) {
      console.warn('Error loading depts/staff:', e);
    }
  }, [profile, noDept, orgLevel]);

  useEffect(() => { loadDepartmentsAndStaff(); }, [loadDepartmentsAndStaff]);

  // Sync selectedDeptDetailId if department list is ready
  useEffect(() => {
    if (allDepartments.length > 0 && !selectedDeptDetailId) {
      if (!orgLevel && profile?.linked_department_id) {
        setSelectedDeptDetailId(profile.linked_department_id);
      } else if (selectedDeptId !== 'all') {
        setSelectedDeptDetailId(selectedDeptId);
      } else {
        setSelectedDeptDetailId(allDepartments[0].id);
      }
    }
  }, [allDepartments, selectedDeptDetailId, orgLevel, profile?.linked_department_id, selectedDeptId]);

  // ── Fetch complaints ──
  useEffect(() => {
    if (!profile || noDept) return;
    if (!orgLevel && selectedDeptId === 'all') return;
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

  // Safety net: only complaints this viewer is permitted to see
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

  // ── Department Drilldown Computations (Tab 2) ──
  const activeDetailDept = useMemo(() => {
    if (!selectedDeptDetailId) return allDepartments[0] || null;
    return allDepartments.find(d => d.id === selectedDeptDetailId) || allDepartments[0] || null;
  }, [allDepartments, selectedDeptDetailId]);

  const activeDeptStaff = useMemo(() => {
    if (!activeDetailDept) return [];
    return staffList.filter(s => s.linked_department_id === activeDetailDept.id);
  }, [staffList, activeDetailDept]);

  // Department Head (Tier 2)
  const activeDeptHead = useMemo(() => {
    if (!activeDetailDept) return null;
    return activeDeptStaff.find(s => getTier(s.role, s.hierarchy_code, s.authority_role) === 2) || null;
  }, [activeDeptStaff, activeDetailDept]);

  // Workers under Department Head
  const activeAreaOfficers = useMemo(() => {
    return activeDeptStaff.filter(s => getTier(s.role, s.hierarchy_code, s.authority_role) === 3);
  }, [activeDeptStaff]);

  const activeSupervisors = useMemo(() => {
    return activeDeptStaff.filter(s => getTier(s.role, s.hierarchy_code, s.authority_role) === 4);
  }, [activeDeptStaff]);

  const activeOperationalStaff = useMemo(() => {
    return activeDeptStaff.filter(s => getTier(s.role, s.hierarchy_code, s.authority_role) === 5);
  }, [activeDeptStaff]);

  const totalWorkersUnderHead = activeAreaOfficers.length + activeSupervisors.length + activeOperationalStaff.length;

  // Complaints of active department
  const activeDeptComplaints = useMemo(() => {
    if (!activeDetailDept) return [];
    return visibleComplaints.filter(c => c.department_id === activeDetailDept.id);
  }, [visibleComplaints, activeDetailDept]);

  // Staff Workload Calculator
  const getStaffStats = useCallback((staffId: string) => {
    const assigned = visibleComplaints.filter(c => c.assigned_to === staffId);
    const pending = assigned.filter(c => c.status === 'pending').length;
    const inProg = assigned.filter(c => c.status === 'in_progress').length;
    const done = assigned.filter(c => ['resolved', 'verified'].includes(c.status)).length;
    const rate = assigned.length > 0 ? Math.round((done / assigned.length) * 100) : 100;
    return { total: assigned.length, pending, inProg, done, rate };
  }, [visibleComplaints]);

  // Filtered workers list for Tab 2
  const filteredDeptWorkers = useMemo(() => {
    let list = activeDeptStaff.filter(s => getTier(s.role, s.hierarchy_code, s.authority_role) >= 3);
    if (deptStaffTierFilter !== 'all') {
      const target = parseInt(deptStaffTierFilter, 10);
      list = list.filter(s => getTier(s.role, s.hierarchy_code, s.authority_role) === target);
    }
    if (deptStaffSearch.trim()) {
      const q = deptStaffSearch.toLowerCase().trim();
      list = list.filter(s =>
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.staff_code && s.staff_code.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.ward_number && s.ward_number.toString().includes(q))
      );
    }
    return list;
  }, [activeDeptStaff, deptStaffTierFilter, deptStaffSearch]);

  // ── Staff reports (Tab 3): staff below viewer in the chain with department filter ──
  const staffReports = useMemo(() => {
    return staffList
      .filter(st => {
        if (st.id === viewer.id) return false;
        const stTier = getTier(st.role, st.hierarchy_code, st.authority_role);
        if (stTier <= myTier) return false;

        // Department filter
        if (staffReportDeptFilter !== 'all' && st.linked_department_id !== staffReportDeptFilter) {
          return false;
        }

        // Tier filter
        if (staffReportTierFilter !== 'all' && stTier.toString() !== staffReportTierFilter) {
          return false;
        }

        // Search filter
        if (staffReportSearch.trim()) {
          const q = staffReportSearch.toLowerCase().trim();
          const matchesName = st.full_name && st.full_name.toLowerCase().includes(q);
          const matchesCode = st.staff_code && st.staff_code.toLowerCase().includes(q);
          const matchesPhone = st.phone && st.phone.includes(q);
          const matchesWard = st.ward_number && st.ward_number.toString().includes(q);
          if (!matchesName && !matchesCode && !matchesPhone && !matchesWard) return false;
        }

        return true;
      })
      .map(st => {
        const statsObj = getStaffStats(st.id);
        const dept = allDepartments.find(d => d.id === st.linked_department_id);
        return {
          ...st,
          totalAssigned: statsObj.total,
          pending: statsObj.pending,
          inProg: statsObj.inProg,
          done: statsObj.done,
          rate: statsObj.rate,
          deptName: dept?.name || '—',
          deptIcon: dept?.icon || '🏢',
        };
      });
  }, [staffList, viewer.id, myTier, staffReportDeptFilter, staffReportTierFilter, staffReportSearch, getStaffStats, allDepartments]);

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

  const canAllotAnything = myTier <= 4;
  const nextTier = canAllotAnything ? myTier + 1 : null;

  const bannerText =
    myTier === 0
      ? (hi ? 'नगर पालिका / संगठन प्रमुख: आप समस्त विभाग, विभाग प्रमुख और उनके अधीनस्थ कार्यकर्ताओं को देख सकते हैं एवं कार्य आवंटित कर सकते हैं।' : 'Municipal Head: You can view all departments, Department Heads, and their worker breakdown city-wide.')
      : myTier === 1
      ? (hi ? 'उपायुक्त: आप सभी विभागों की प्रगति देख सकते हैं और विभाग प्रमुख व क्षेत्र अधिकारियों को कार्य आवंटित कर सकते हैं।' : 'Deputy Commissioner: You oversee all department tasks and allocate work down the municipal chain.')
      : myTier === 2
      ? (hi ? `विभाग प्रमुख (${profile?.dept_name}): आप अपने विभाग के क्षेत्र अधिकारी (Tier 3), पर्यवेक्षक (Tier 4) और कर्मचारियों (Tier 5) को देख सकते हैं एवं कार्य सौंप सकते हैं।` : `Department Head (${profile?.dept_name}): You manage Area Officers, Supervisors, and Field Staff in your department.`)
      : myTier === 3
      ? (hi ? 'क्षेत्र अधिकारी: आप अपने क्षेत्र/वार्ड में पर्यवेक्षकों को कार्य आवंटित कर सकते हैं।' : 'Area Officer: Allocate tasks to Supervisors within your designated area/ward.')
      : myTier === 4
      ? (hi ? 'पर्यवेक्षक: आप परिचालन कर्मचारियों को कार्य सौंप सकते हैं।' : 'Supervisor: Allocate field tasks to Operational Staff.')
      : (hi ? 'परिचालन कर्मचारी: केवल आपको सौंपे गए कार्य देखें। कार्य पूरा होने पर फोटो के साथ हल करें।' : 'Operational Staff: View your assigned tasks and resolve with photo proof.');

  const tabs = [
    { id: 'complaints', label: hi ? 'शिकायतें एवं कार्य' : 'Complaints & Tasks', icon: Briefcase, count: visibleComplaints.length },
    ...(myTier <= 2
      ? [{
          id: 'departments',
          label: orgLevel ? (hi ? 'विभाग एवं स्टाफ संरचना' : 'Departments & Staff Hierarchy') : (hi ? 'विभाग एवं स्टाफ' : 'Department & Staff'),
          icon: Layers,
          count: orgLevel ? allDepartments.length : 1,
        }]
      : []),
    ...(myTier <= 3 ? [{ id: 'staff_reports', label: hi ? 'कर्मचारी रिपोर्ट' : 'Staff Reports', icon: FileText, count: staffReports.length }] : []),
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
                  ? `🏛️ ${hi ? 'समस्त विभाग / संगठन' : 'All Municipal Departments'}`
                  : `${profile?.dept_icon || '🏢'} ${profile?.dept_name || 'Department'}`}
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>
                {profile?.full_name ? `${profile.full_name} • ` : ''}{roleLabel(profile?.role, language)}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Quick department filter in header for org level */}
            {orgLevel && (
              <select
                value={selectedDeptId}
                onChange={e => {
                  setSelectedDeptId(e.target.value);
                  if (e.target.value !== 'all') {
                    setSelectedDeptDetailId(e.target.value);
                  }
                }}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '0.82rem',
                  fontWeight: 700, outline: 'none', cursor: 'pointer' }}
              >
                <option value="all" style={{ color: '#000' }}>🏛️ {hi ? 'समस्त विभाग (All)' : 'All Departments'}</option>
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
                  {myTier >= 4
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

        {/* ── TAB 2: DEPARTMENTS & STAFF HIERARCHY ── */}
        {activeTab === 'departments' && myTier <= 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Department Selection & Header Bar */}
            <div style={{
              background: 'var(--theme-component, #d9d9d9)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-xl)',
              padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--theme-primary, #660033)' }}>
                    🏢 {orgLevel
                      ? (hi ? 'विभाग चयन एवं प्रशासनिक संरचना' : 'Department Selection & Staff Hierarchy')
                      : (hi ? `विभाग संरचना: ${profile?.dept_name}` : `Department Hierarchy: ${profile?.dept_name}`)}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--gray-700)' }}>
                    {orgLevel
                      ? (hi ? 'किसी भी विभाग को चुनें और उसके विभाग प्रमुख, अधीनस्थ कर्मचारी संख्या व कार्य विवरण देखें।' : 'Choose a department to inspect its Department Head, worker strength, and live staff roster.')
                      : (hi ? 'आपके विभाग के अधीन सभी क्षेत्र अधिकारी, पर्यवेक्षक और फील्ड कर्मचारियों का विवरण।' : 'Inspect your assigned workers, their contact info, and task resolution rates.')}
                  </p>
                </div>

                {orgLevel && (
                  <button
                    onClick={() => setShowCreateDept(true)}
                    style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                      color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={15} /> {hi ? 'नया विभाग जोड़ें' : 'Create New Department'}
                  </button>
                )}
              </div>

              {/* Department Selector Pills (for Org Level) */}
              {orgLevel && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 8 }}>
                  {allDepartments.map(d => {
                    const isSelected = (activeDetailDept?.id === d.id);
                    const staffCount = staffList.filter(s => s.linked_department_id === d.id).length;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setSelectedDeptDetailId(d.id);
                          setDeptStaffTierFilter('all');
                          setDeptStaffSearch('');
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
                          borderRadius: 'var(--radius-md)', cursor: 'pointer', whiteSpace: 'nowrap',
                          border: isSelected ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                          background: isSelected ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                          color: isSelected ? 'var(--theme-primary, #660033)' : 'var(--gray-800)',
                          fontWeight: isSelected ? 900 : 700, fontSize: '0.84rem',
                          boxShadow: isSelected ? '0 2px 8px rgba(102,0,51,0.15)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{d.icon || '🏢'}</span>
                        <span>{d.name}</span>
                        <span style={{
                          padding: '2px 7px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 800,
                          background: isSelected ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                          color: isSelected ? '#fff' : 'var(--gray-800)',
                        }}>
                          {staffCount} {hi ? 'स्टाफ' : 'staff'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chosen Department Detail View */}
            {activeDetailDept ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* 1. Department Overview Card */}
                <div style={{
                  background: 'var(--theme-component, #d9d9d9)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '22px 24px',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 54, height: 54, borderRadius: 12,
                        background: 'var(--theme-bg, #fff4e7)', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.9rem',
                      }}>
                        {activeDetailDept.icon || '🏢'}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                          {activeDetailDept.name}
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--gray-600)', fontFamily: 'monospace' }}>
                          Slug: {activeDetailDept.slug}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.76rem', fontWeight: 800, padding: '4px 12px', borderRadius: 20,
                        background: activeDetailDept.is_active ? '#d1fae5' : '#fee2e2',
                        color: activeDetailDept.is_active ? '#065f46' : '#991b1b',
                      }}>
                        {activeDetailDept.is_active ? (hi ? 'सक्रिय विभाग' : 'Active Department') : (hi ? 'निष्क्रिय' : 'Inactive')}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeptId(activeDetailDept.id);
                          setActiveTab('complaints');
                        }}
                        style={{
                          padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                          background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                          color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.82rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <Briefcase size={14} />
                        {hi ? `शिकायतें देखें (${activeDeptComplaints.length})` : `View Work & Complaints (${activeDeptComplaints.length})`}
                      </button>
                    </div>
                  </div>

                  {activeDetailDept.description && (
                    <div style={{
                      background: 'var(--theme-bg, #fff4e7)', padding: '12px 16px',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--theme-component-border, #bfbfbf)',
                      fontSize: '0.86rem', color: 'var(--gray-800)', lineHeight: 1.5,
                    }}>
                      <strong>{hi ? 'कार्य क्षेत्र / दायरा:' : 'Scope of Work:'}</strong> {activeDetailDept.description}
                    </div>
                  )}
                </div>

                {/* 2. WHO IS THE DEPARTMENT HEAD (Tier 2) */}
                <div style={{
                  background: 'var(--theme-component, #d9d9d9)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '22px 24px',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Award size={20} color="var(--theme-primary, #660033)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                      {hi ? 'विभाग प्रमुख (Department Head - Tier 2)' : 'Department Head (Tier 2 Authority)'}
                    </h3>
                  </div>

                  {activeDeptHead ? (
                    <div style={{
                      background: 'var(--theme-bg, #fff4e7)',
                      borderRadius: 'var(--radius-lg)',
                      border: '2px solid var(--theme-primary, #660033)',
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.6rem', flexShrink: 0,
                          }}>
                            👑
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--theme-primary, #660033)' }}>
                                {activeDeptHead.full_name || 'Designated Department Head'}
                              </h4>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12,
                                background: 'var(--theme-primary, #660033)', color: '#fff',
                              }}>
                                🏢 {roleLabel('department_head', language)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: '0.78rem', color: 'var(--gray-600)', flexWrap: 'wrap' }}>
                              {activeDeptHead.staff_code && <span><strong>Staff Code:</strong> {activeDeptHead.staff_code}</span>}
                              {activeDeptHead.ward_number && <span><strong>Ward:</strong> {activeDeptHead.ward_number}</span>}
                              {activeDeptHead.authority_role && <span><strong>Role Code:</strong> {activeDeptHead.authority_role}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Contact details */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {activeDeptHead.phone && (
                            <a
                              href={`tel:${activeDeptHead.phone}`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                                background: 'var(--theme-component, #d9d9d9)',
                                border: '1px solid var(--theme-component-border, #bfbfbf)',
                                color: 'var(--theme-primary, #660033)', fontWeight: 800,
                                fontSize: '0.82rem', textDecoration: 'none',
                              }}
                            >
                              <Phone size={14} /> {activeDeptHead.phone}
                            </a>
                          )}
                          {activeDeptHead.email && (
                            <a
                              href={`mailto:${activeDeptHead.email}`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                                background: 'var(--theme-component, #d9d9d9)',
                                border: '1px solid var(--theme-component-border, #bfbfbf)',
                                color: 'var(--gray-800)', fontWeight: 700,
                                fontSize: '0.82rem', textDecoration: 'none',
                              }}
                            >
                              <Mail size={14} /> {activeDeptHead.email}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Head Performance & Scope Summary */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10,
                        paddingTop: 12, borderTop: '1px solid var(--theme-component-border, #bfbfbf)',
                      }}>
                        <div style={{ background: 'rgba(255,255,255,0.5)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                            {hi ? 'अधीनस्थ कार्यकर्ता' : 'Staff Under Head'}
                          </span>
                          <p style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 900, color: 'var(--theme-primary, #660033)' }}>
                            {totalWorkersUnderHead} {hi ? 'सदस्य' : 'members'}
                          </p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.5)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                            {hi ? 'विभाग की कुल शिकायतें' : 'Total Grievances'}
                          </span>
                          <p style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#1e40af' }}>
                            {activeDeptComplaints.length}
                          </p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.5)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                            {hi ? 'हल की गई शिकायतें' : 'Resolved'}
                          </span>
                          <p style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#065f46' }}>
                            {activeDeptComplaints.filter(c => ['resolved', 'verified'].includes(c.status)).length}
                          </p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.5)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                            {hi ? 'निवारण दर' : 'Resolution Rate'}
                          </span>
                          <p style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 900, color: 'var(--theme-primary, #660033)' }}>
                            {activeDeptComplaints.length > 0
                              ? Math.round((activeDeptComplaints.filter(c => ['resolved', 'verified'].includes(c.status)).length / activeDeptComplaints.length) * 100)
                              : 100}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: 'var(--theme-bg, #fff4e7)', borderRadius: 'var(--radius-lg)',
                      border: '1.5px dashed var(--theme-component-border, #bfbfbf)', padding: 20, textAlign: 'center',
                    }}>
                      <p style={{ margin: '0 0 6px', fontWeight: 800, color: 'var(--gray-800)', fontSize: '0.95rem' }}>
                        ⚠️ {hi ? 'इस विभाग के लिए कोई विभाग प्रमुख अभी पंजीकृत नहीं है' : 'No Department Head currently assigned to this department.'}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                        {hi ? 'नगर पालिका प्रमुख या उपायुक्त द्वारा कार्य सीधे क्षेत्र अधिकारी या पर्यवेक्षक को आवंटित किया जा सकता है।' : 'Tasks can be allotted directly to Area Officers or Supervisors by the Municipal Head / Deputy Commissioner.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. HOW MANY WORKERS WORK UNDER HIM (Tier Breakdown Counters) */}
                <div style={{
                  background: 'var(--theme-component, #d9d9d9)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '22px 24px',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={20} color="var(--theme-primary, #660033)" />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                        {hi ? 'विभाग प्रमुख के अधीन कार्यरत कर्मचारी संख्या' : 'Workers Hierarchy Breakdown Under Head'}
                      </h3>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--theme-primary, #660033)' }}>
                      {hi ? `कुल कार्यकर्ता: ${totalWorkersUnderHead}` : `Total Workforce: ${totalWorkersUnderHead}`}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    {/* All workers under head */}
                    <div
                      onClick={() => setDeptStaffTierFilter('all')}
                      style={{
                        background: 'var(--theme-bg, #fff4e7)', borderRadius: 'var(--radius-lg)', padding: 16,
                        border: deptStaffTierFilter === 'all' ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                        cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                          {hi ? 'कुल अधीनस्थ कर्मचारी' : 'Total Workers'}
                        </span>
                        <span style={{ fontSize: '1.2rem' }}>👥</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: 'var(--theme-primary, #660033)' }}>
                        {totalWorkersUnderHead}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                        {hi ? 'सभी स्तरों के कर्मी' : 'All subordinate tiers'}
                      </p>
                    </div>

                    {/* Area Officers (Tier 3) */}
                    <div
                      onClick={() => setDeptStaffTierFilter('3')}
                      style={{
                        background: 'var(--theme-bg, #fff4e7)', borderRadius: 'var(--radius-lg)', padding: 16,
                        border: deptStaffTierFilter === '3' ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                        cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                          {hi ? 'क्षेत्र अधिकारी (Tier 3)' : 'Area Officers (Tier 3)'}
                        </span>
                        <span style={{ fontSize: '1.2rem' }}>📍</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#065f46' }}>
                        {activeAreaOfficers.length}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                        {hi ? 'क्षेत्रीय आवंटन अधिकारी' : 'Ward / Zone inspectors'}
                      </p>
                    </div>

                    {/* Supervisors (Tier 4) */}
                    <div
                      onClick={() => setDeptStaffTierFilter('4')}
                      style={{
                        background: 'var(--theme-bg, #fff4e7)', borderRadius: 'var(--radius-lg)', padding: 16,
                        border: deptStaffTierFilter === '4' ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                        cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                          {hi ? 'पर्यवेक्षक (Tier 4)' : 'Supervisors (Tier 4)'}
                        </span>
                        <span style={{ fontSize: '1.2rem' }}>👷</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#854d0e' }}>
                        {activeSupervisors.length}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                        {hi ? 'फील्ड सुपरवाइजर' : 'Field site supervisors'}
                      </p>
                    </div>

                    {/* Operational Staff / Field Employees (Tier 5) */}
                    <div
                      onClick={() => setDeptStaffTierFilter('5')}
                      style={{
                        background: 'var(--theme-bg, #fff4e7)', borderRadius: 'var(--radius-lg)', padding: 16,
                        border: deptStaffTierFilter === '5' ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                        cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
                          {hi ? 'मैदानी कर्मचारी (Tier 5)' : 'Operational Staff (Tier 5)'}
                        </span>
                        <span style={{ fontSize: '1.2rem' }}>🛠️</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#374151' }}>
                        {activeOperationalStaff.length}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                        {hi ? 'मैदानी समाधान दल' : 'Field resolution crew'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. FULL STAFF ROSTER WITH SEARCH, PHONE & WORKLOAD ("Same for all departments") */}
                <div style={{
                  background: 'var(--theme-component, #d9d9d9)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '22px 24px',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                        📋 {hi ? 'विभाग कर्मचारी सूची एवं कार्य प्रदर्शन' : 'Subordinate Staff Roster & Task Performance'}
                      </h3>
                      <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                        {hi ? `${activeDetailDept.name} के अधीन कार्यरत प्रत्येक कार्यकर्ता का संपर्क, वार्ड व आवंटित कार्य` : `Complete roster for ${activeDetailDept.name} with contact, assigned tasks, and resolution rates`}
                      </p>
                    </div>

                    {/* Sub-filter chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { id: 'all', label: hi ? 'समस्त कार्यकर्ता' : 'All Staff', count: totalWorkersUnderHead },
                        { id: '3', label: hi ? 'क्षेत्र अधिकारी' : 'Area Officers', count: activeAreaOfficers.length },
                        { id: '4', label: hi ? 'पर्यवेक्षक' : 'Supervisors', count: activeSupervisors.length },
                        { id: '5', label: hi ? 'मैदानी कर्मचारी' : 'Operational Staff', count: activeOperationalStaff.length },
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setDeptStaffTierFilter(f.id as any)}
                          style={{
                            padding: '6px 12px', borderRadius: 20, fontSize: '0.76rem', fontWeight: 800,
                            border: deptStaffTierFilter === f.id ? '1.5px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                            background: deptStaffTierFilter === f.id ? 'var(--theme-primary, #660033)' : 'var(--theme-bg, #fff4e7)',
                            color: deptStaffTierFilter === f.id ? '#fff' : 'var(--gray-800)',
                            cursor: 'pointer',
                          }}
                        >
                          {f.label} ({f.count})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Worker search input */}
                  <div style={{ marginBottom: 16, position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                    <input
                      type="text"
                      placeholder={hi ? 'नाम, फोन, स्टाफ कोड या वार्ड नंबर से खोजें...' : 'Search staff by name, phone, staff code, or ward number...'}
                      value={deptStaffSearch}
                      onChange={e => setDeptStaffSearch(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px 10px 36px',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                        fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                        fontFamily: 'var(--font-primary)',
                      }}
                    />
                  </div>

                  {/* Staff Cards Grid */}
                  {filteredDeptWorkers.length === 0 ? (
                    <div style={{
                      padding: '36px 20px', textAlign: 'center', background: 'var(--theme-bg, #fff4e7)',
                      borderRadius: 'var(--radius-lg)', border: '1px solid var(--theme-component-border, #bfbfbf)',
                    }}>
                      <Inbox size={32} color="var(--gray-500)" style={{ margin: '0 auto 8px', display: 'block' }} />
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--gray-700)', fontSize: '0.9rem' }}>
                        {hi ? 'इस श्रेणी में कोई कर्मचारी नहीं मिला' : 'No staff members found matching this filter.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                      {filteredDeptWorkers.map(st => {
                        const tier = getTier(st.role, st.hierarchy_code, st.authority_role);
                        const tierInfo = TIER_LABEL[tier] ?? TIER_LABEL[5];
                        const sStats = getStaffStats(st.id);

                        return (
                          <div
                            key={st.id}
                            style={{
                              background: 'var(--theme-bg, #fff4e7)',
                              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                              borderRadius: 'var(--radius-lg)',
                              padding: 16,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: 'var(--shadow-sm)',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '1.1rem' }}>{tierInfo.icon}</span>
                                    <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                                      {st.full_name || 'Staff Officer'}
                                    </h4>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                    {st.staff_code && (
                                      <span style={{
                                        fontSize: '0.72rem', fontWeight: 800, padding: '1px 6px',
                                        borderRadius: 4, background: 'var(--theme-component, #d9d9d9)',
                                        border: '1px solid var(--theme-component-border, #bfbfbf)', fontFamily: 'monospace',
                                      }}>
                                        {st.staff_code}
                                      </span>
                                    )}
                                    <span style={{
                                      fontSize: '0.72rem', fontWeight: 800, padding: '1px 8px',
                                      borderRadius: 12, background: tierInfo.badgeColor, color: '#fff',
                                    }}>
                                      {tierInfo[language]}
                                    </span>
                                  </div>
                                </div>

                                {st.ward_number && (
                                  <span style={{
                                    fontSize: '0.74rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12,
                                    background: 'var(--theme-component, #d9d9d9)', border: '1px solid var(--theme-component-border, #bfbfbf)',
                                    color: 'var(--gray-800)', display: 'inline-flex', alignItems: 'center', gap: 4,
                                  }}>
                                    <MapPin size={11} /> {hi ? `वार्ड ${st.ward_number}` : `Ward ${st.ward_number}`}
                                  </span>
                                )}
                              </div>

                              {/* Contact */}
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: '0.8rem' }}>
                                {st.phone ? (
                                  <a
                                    href={`tel:${st.phone}`}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 4,
                                      color: 'var(--theme-primary, #660033)', fontWeight: 800, textDecoration: 'none',
                                    }}
                                  >
                                    <Phone size={12} /> {st.phone}
                                  </a>
                                ) : (
                                  <span style={{ color: 'var(--gray-500)' }}>{hi ? 'फोन उपलब्ध नहीं' : 'No phone listed'}</span>
                                )}
                              </div>

                              {/* Workload Metric Counters */}
                              <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                                background: 'rgba(255,255,255,0.4)', padding: '8px 10px', borderRadius: 8,
                                border: '1px solid var(--theme-component-border, #bfbfbf)', marginBottom: 12, textAlign: 'center',
                              }}>
                                <div>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-600)' }}>
                                    {hi ? 'कुल कार्य' : 'Assigned'}
                                  </span>
                                  <p style={{ margin: '2px 0 0', fontWeight: 900, fontSize: '1rem', color: 'var(--gray-900)' }}>
                                    {sStats.total}
                                  </p>
                                </div>
                                <div>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-600)' }}>
                                    {hi ? 'प्रगति में' : 'Open'}
                                  </span>
                                  <p style={{ margin: '2px 0 0', fontWeight: 900, fontSize: '1rem', color: '#1d4ed8' }}>
                                    {sStats.pending + sStats.inProg}
                                  </p>
                                </div>
                                <div>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-600)' }}>
                                    {hi ? 'हल किया' : 'Done'}
                                  </span>
                                  <p style={{ margin: '2px 0 0', fontWeight: 900, fontSize: '1rem', color: '#065f46' }}>
                                    {sStats.done}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Performance Bar */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-700)' }}>
                                  {hi ? 'सफलता दर' : 'Resolution Rate'}
                                </span>
                                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: sStats.rate >= 80 ? '#065f46' : '#92400e' }}>
                                  {sStats.rate}%
                                </span>
                              </div>
                              <div style={{ height: 6, borderRadius: 3, background: 'var(--theme-component-border, #bfbfbf)', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${sStats.rate}%`, height: '100%',
                                  background: sStats.rate >= 80 ? '#065f46' : sStats.rate >= 50 ? '#d97706' : '#dc2626',
                                }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '40px 20px', textAlign: 'center', background: 'var(--theme-component, #d9d9d9)',
                borderRadius: 'var(--radius-xl)', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              }}>
                <Inbox size={40} color="var(--gray-500)" style={{ margin: '0 auto 12px', display: 'block' }} />
                <h3 style={{ margin: '0 0 6px', color: 'var(--gray-800)', fontWeight: 800 }}>
                  {hi ? 'कोई विभाग नहीं चुना गया' : 'No department selected'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                  {hi ? 'कृपया ऊपर दिए गए विकल्पों में से किसी विभाग को चुनें।' : 'Please choose a department above to view its structure and staff.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: STAFF REPORTS (people below viewer in chain with department filter) ── */}
        {activeTab === 'staff_reports' && myTier <= 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--theme-primary, #660033)' }}>
                  👥 {hi ? 'कर्मचारी कार्य रिपोर्ट एवं प्रदर्शन' : 'Subordinate Staff Work Reports & Performance'}
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                  {hi ? 'विभाग वार कर्मचारियों का कार्यभार, हल की गई शिकायतें एवं सफलता दर' : 'Workload, open tasks, resolved complaints, and performance rates per department'}
                </p>
              </div>

              {/* Department filter dropdown in Tab 3 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {orgLevel && (
                  <select
                    value={staffReportDeptFilter}
                    onChange={e => setStaffReportDeptFilter(e.target.value)}
                    style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                      background: 'var(--theme-bg, #fff4e7)', fontSize: '0.84rem',
                      fontWeight: 700, outline: 'none', cursor: 'pointer',
                    }}
                  >
                    <option value="all">🏛️ {hi ? 'समस्त विभाग (All Depts)' : 'All Departments'}</option>
                    {allDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                    ))}
                  </select>
                )}

                <select
                  value={staffReportTierFilter}
                  onChange={e => setStaffReportTierFilter(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                    background: 'var(--theme-bg, #fff4e7)', fontSize: '0.84rem',
                    fontWeight: 700, outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="all">{hi ? 'समस्त पद (All Tiers)' : 'All Hierarchy Roles'}</option>
                  <option value="2">🏢 {hi ? 'विभाग प्रमुख (Tier 2)' : 'Department Heads'}</option>
                  <option value="3">📍 {hi ? 'क्षेत्र अधिकारी (Tier 3)' : 'Area Officers'}</option>
                  <option value="4">👷 {hi ? 'पर्यवेक्षक (Tier 4)' : 'Supervisors'}</option>
                  <option value="5">🛠️ {hi ? 'मैदानी कर्मचारी (Tier 5)' : 'Operational Staff'}</option>
                </select>
              </div>
            </div>

            {/* Search filter */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
              <input
                type="text"
                placeholder={hi ? 'कर्मचारी नाम, फोन या कोड से खोजें...' : 'Search staff by name, staff code, or phone number...'}
                value={staffReportSearch}
                onChange={e => setStaffReportSearch(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px 10px 36px',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)',
                  fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'var(--font-primary)',
                }}
              />
            </div>

            <div style={{ background: 'var(--theme-component, #d9d9d9)', border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', color: '#fff' }}>
                      {[
                        hi ? 'कर्मचारी' : 'Staff Member',
                        hi ? 'विभाग' : 'Department',
                        hi ? 'पद' : 'Role',
                        hi ? 'संपर्क' : 'Contact',
                        hi ? 'आवंटित' : 'Assigned',
                        hi ? 'खुले कार्य' : 'Open',
                        hi ? 'हल' : 'Resolved',
                        hi ? 'सफलता दर' : 'Rate',
                      ].map(h => (
                        <th key={h} style={{ padding: '12px 16px', fontWeight: 800 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staffReports.length === 0 && (
                      <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--gray-600)' }}>
                        {hi ? 'कोई अधीनस्थ कर्मचारी नहीं मिला' : 'No subordinate staff found for this filter.'}
                      </td></tr>
                    )}
                    {staffReports.map((st, idx) => (
                      <tr key={st.id} style={{ borderBottom: '1px solid var(--theme-component-border, #bfbfbf)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.2)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--gray-900)' }}>
                          <div>{st.full_name || 'Officer'}</div>
                          {st.staff_code && <span style={{ fontSize: '0.72rem', color: 'var(--theme-primary, #660033)', fontFamily: 'monospace' }}>{st.staff_code}</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--gray-800)', fontWeight: 600 }}>
                          {st.deptIcon} {st.deptName}
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
