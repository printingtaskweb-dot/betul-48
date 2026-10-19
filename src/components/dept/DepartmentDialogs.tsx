import React, { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { DeptComplaint } from '../../hooks/useDeptComplaints';
import { Camera, CheckCircle, Plus } from 'lucide-react';

// ─── Resolution Modal ────────────────────────────────────────────────────────
interface ResolveModalProps {
  complaint: DeptComplaint;
  resolvedBy: string;
  language: 'en' | 'hi';
  onClose: () => void;
  onResolved: () => void;
  resolveComplaint: (id: string, note: string, photo: File | null, by: string) => Promise<boolean>;
}

export function ResolveModal({ complaint, resolvedBy, language, onClose, onResolved, resolveComplaint }: ResolveModalProps) {
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

export function CreateDeptModal({ language, onClose, onCreated }: CreateDeptModalProps) {
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
