import { GoogleIcon } from '../common/GoogleIcon';
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Complaint } from '../../lib/supabase';
import { PhotoUploader } from '../common/PhotoUploader';
import { useStorage } from '../../hooks/useStorage';
import { StatusBadge } from '../common/StatusBadge';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ResolutionFormProps {
  complaint: Complaint;
  onUpdate: () => void;
}

export const ResolutionForm: React.FC<ResolutionFormProps> = ({ complaint, onUpdate }) => {
  const [note, setNote] = useState('');
  const [resolvedBy, setResolvedBy] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { uploadPhoto, uploading } = useStorage();

  const handleFileSelected = (file: File) => {
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleResolve = async () => {
    if (!resolvedBy.trim()) return alert('Please enter resolver name.');
    setSubmitting(true);

    let photoUrl: string | null = null;
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile);
    }

    const { error: resErr } = await supabase.from('resolutions').insert({
      complaint_id: complaint.id,
      admin_note: note,
      resolution_photo_url: photoUrl,
      resolved_by: resolvedBy,
    });

    if (!resErr) {
      await supabase.from('complaints').update({ status: 'resolved' }).eq('id', complaint.id);
    }

    setSubmitting(false);
    onUpdate();
  };

  const handleReject = async () => {
    if (!confirm('Mark this complaint as Rejected?')) return;
    await supabase.from('complaints').update({ status: 'rejected' }).eq('id', complaint.id);
    onUpdate();
  };

  const handleAdminVerify = async () => {
    await supabase.from('verifications').insert({
      complaint_id: complaint.id,
      verified_by: 'admin',
      is_satisfied: true,
      note: 'Verified by admin',
    });
    await supabase.from('complaints').update({ status: 'verified' }).eq('id', complaint.id);
    onUpdate();
  };

  const handleMarkInProgress = async () => {
    await supabase.from('complaints').update({ status: 'in_progress' }).eq('id', complaint.id);
    onUpdate();
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
          #{complaint.ticket_number}
        </h3>
        <StatusBadge status={complaint.status} />
      </div>

      {/* Action buttons based on status */}
      {(complaint.status === 'pending' || complaint.status === 'in_progress') && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <h4 style={{ margin: 0, color: '#374151', fontSize: '0.95rem', fontWeight: 800 }}>
              Resolve Complaint & Upload Work Photo
            </h4>
            {complaint.status === 'pending' && (
              <button
                onClick={handleMarkInProgress}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--blue-50)',
                  color: 'var(--blue-600)',
                  border: '1px solid var(--blue-200)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Mark In Progress
              </button>
            )}
          </div>

          <input
            placeholder="Resolved by officer / team name *"
            value={resolvedBy}
            onChange={(e) => setResolvedBy(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Details of work done to fix this issue... *"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', marginTop: 10 }}
          />

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 13, color: '#166534', fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Upload Work-Done Photo (Proof of work)
            </label>
            <PhotoUploader
              onFileSelected={handleFileSelected}
              preview={preview}
              onClear={() => { setPhotoFile(null); setPreview(null); }}
              uploading={uploading}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              onClick={handleResolve}
              disabled={submitting || uploading}
              style={{
                ...btnStyle('#16a34a'),
                padding: '11px 18px',
                fontSize: '0.9rem',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
              }}
            >
              <CheckCircle2 size={16} /> Mark as Resolved
            </button>
            <button onClick={handleReject} style={btnStyle('#dc2626')}>
              <XCircle size={15} /> Reject
            </button>
          </div>
        </div>
      )}

      {complaint.status === 'resolved' && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: '#7c3aed', fontSize: 14, fontWeight: 500 }}>
            <GoogleIcon name="hourglass_top" size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />Awaiting citizen verification. You can also verify as admin:
          </p>
          <button onClick={handleAdminVerify} style={{ ...btnStyle('#16a34a'), marginTop: 10 }}>
            <CheckCircle2 size={15} /> Admin Verify & Close
          </button>
        </div>
      )}

      {complaint.status === 'verified' && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <p style={{ margin: 0, color: '#166534', fontWeight: 600, fontSize: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#16a34a' }}>check_circle</span>This complaint is fully resolved and verified.</span>
          </p>
        </div>
      )}
    </div>
  );
};

const btnStyle = (bg: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', borderRadius: 8, border: 'none',
  background: bg, color: '#fff', fontWeight: 600,
  cursor: 'pointer', fontSize: 14,
});

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid #d1d5db', fontSize: 14,
  color: '#111827', outline: 'none',
};
