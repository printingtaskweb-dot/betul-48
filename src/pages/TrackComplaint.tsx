import React, { useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { useComplaints } from '../hooks/useComplaints';
import type { Complaint } from '../lib/supabase';
import { StatusBadge } from '../components/common/StatusBadge';
import { supabase } from '../lib/supabase';
import { BottomNav } from '../components/BottomNav';
import {
  ArrowLeft, Search, CheckCircle2, XCircle, Compass,
  Navigation, Camera, X
} from 'lucide-react';

interface ResolutionData {
  id: string;
  admin_note: string;
  resolution_photo_url: string | null;
  resolved_by: string;
  resolved_at: string;
}

export const TrackComplaint: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, language, profile, isAdmin } = useAuth();
  const { getComplaintByTicket } = useComplaints();
  const [ticket, setTicket] = useState(searchParams.get('ticket') || '');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [resolution, setResolution] = useState<ResolutionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // Department resolve modal states
  const [resolvingModal, setResolvingModal] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [resolveBy, setResolveBy] = useState('');
  const [resolvePhoto, setResolvePhoto] = useState<File | null>(null);
  const [resolvePreview, setResolvePreview] = useState<string | null>(null);
  const [submittingResolve, setSubmittingResolve] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResolution = async (complaintId: string) => {
    try {
      const { data } = await supabase
        .from('resolutions')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('resolved_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setResolution(data);
    } catch {
      setResolution(null);
    }
  };

  const handleSearch = async () => {
    if (!ticket.trim()) return;
    setLoading(true);
    setNotFound(false);
    setComplaint(null);
    setResolution(null);
    const result = await getComplaintByTicket(ticket.trim().toUpperCase());
    if (result) {
      setComplaint(result);
      await fetchResolution(result.id);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  };

  const isDeptStaff = profile?.role === 'dept_staff' && !isAdmin;

  const handleCitizenVerify = async (satisfied: boolean) => {
    if (!complaint) return;
    if (isDeptStaff) {
      alert(
        language === 'hi'
          ? 'विभाग स्टाफ अपने स्वयं के कार्य को सत्यापित नहीं कर सकता। केवल शिकायतकर्ता नागरिक या एडमिन ही सत्यापन कर सकते हैं।'
          : 'Department staff cannot verify completed work. Only the complaint citizen or an administrator can verify.'
      );
      return;
    }
    setVerifying(true);

    await supabase.from('verifications').insert({
      complaint_id: complaint.id,
      verified_by: 'citizen',
      is_satisfied: satisfied,
      note: satisfied ? 'Citizen confirmed resolution' : 'Citizen rejected resolution',
    });

    if (satisfied) {
      await supabase.from('complaints').update({ status: 'verified' }).eq('id', complaint.id);
      setComplaint({ ...complaint, status: 'verified' });
    } else {
      await supabase.from('complaints').update({ status: 'in_progress' }).eq('id', complaint.id);
      setComplaint({ ...complaint, status: 'in_progress' });
    }
    setVerified(true);
    setVerifying(false);
  };

  const handleAdminVerify = async (satisfied: boolean) => {
    if (!complaint || !isAdmin) return;
    setVerifying(true);

    await supabase.from('verifications').insert({
      complaint_id: complaint.id,
      verified_by: 'admin',
      is_satisfied: satisfied,
      note: satisfied ? 'Verified and closed by municipal administrator' : 'Admin rejected resolution',
    });

    if (satisfied) {
      await supabase.from('complaints').update({ status: 'verified' }).eq('id', complaint.id);
      setComplaint({ ...complaint, status: 'verified' });
    } else {
      await supabase.from('complaints').update({ status: 'in_progress' }).eq('id', complaint.id);
      setComplaint({ ...complaint, status: 'in_progress' });
    }
    setVerified(true);
    setVerifying(false);
  };

  const handlePhotoSelect = (file: File) => {
    setResolvePhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setResolvePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    if (!resolveNote.trim()) {
      alert(language === 'hi' ? 'कृपया कार्य का विवरण दर्ज करें' : 'Please enter resolution notes');
      return;
    }

    setSubmittingResolve(true);
    try {
      let photoUrl: string | null = null;
      if (resolvePhoto) {
        const ext = resolvePhoto.name.split('.').pop();
        const path = `resolutions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('complaint-photos')
          .upload(path, resolvePhoto);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from('complaint-photos')
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const resolverName = resolveBy.trim() || user?.email || 'Department Field Officer';
      const { data: insertedRes, error: resErr } = await supabase
        .from('resolutions')
        .insert({
          complaint_id: complaint.id,
          admin_note: resolveNote.trim(),
          resolution_photo_url: photoUrl,
          resolved_by: resolverName,
        })
        .select()
        .single();
      if (resErr) throw resErr;

      await supabase
        .from('complaints')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', complaint.id);

      setComplaint({ ...complaint, status: 'resolved' });
      setResolution(insertedRes);
      setResolvingModal(false);
      setResolveNote('');
      setResolvePhoto(null);
      setResolvePreview(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Resolution failed');
    } finally {
      setSubmittingResolve(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingBottom: 90 }}>
      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
          padding: '14px 20px',
          color: '#fff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="app-container" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 'var(--radius-sm)',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <ArrowLeft size={20} color="#fff" />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 800, color: '#fff' }}>
              {t(language, 'trackComplaint')}
            </h1>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
              {language === 'hi' ? 'शिकायत का टिकट नंबर दर्ज करें' : 'Enter ticket number to track progress'}
            </p>
          </div>
        </div>
      </header>

      <div className="content-container-sm" style={{ paddingTop: 24 }}>
        {/* Search Input Box */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            background: 'var(--theme-component, #d9d9d9)',
            padding: 8,
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          }}
        >
          <input
            placeholder="e.g. IMC-2024-00001"
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              fontSize: '0.95rem',
              outline: 'none',
              fontFamily: 'monospace',
              letterSpacing: 1,
              background: 'transparent',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--theme-primary, #146C94)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.88rem',
            }}
          >
            <Search size={16} /> {loading ? '...' : language === 'hi' ? 'खोजें' : 'Search'}
          </button>
        </div>

        {notFound && (
          <div
            style={{
              marginTop: 24,
              textAlign: 'center',
              padding: '36px 20px',
              background: 'var(--theme-component, #d9d9d9)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
              color: 'var(--gray-600)',
            }}
          >
            <p style={{ fontSize: 36, margin: '0 0 10px' }}>🔍</p>
            <p style={{ fontWeight: 700, color: 'var(--gray-800)', margin: '0 0 4px' }}>
              {language === 'hi' ? 'कोई शिकायत नहीं मिली' : 'No complaint found'}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>
              {language === 'hi'
                ? `टिकट नंबर '${ticket}' की पुनः जांच करें।`
                : `Please check the ticket number '${ticket}' and try again.`}
            </p>
          </div>
        )}

        {complaint && (
          <div
            style={{
              marginTop: 20,
              background: 'var(--theme-component, #d9d9d9)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {complaint.photo_url && (
              <img
                src={complaint.photo_url}
                alt="Complaint"
                style={{ width: '100%', height: 220, objectFit: 'cover' }}
              />
            )}
            <div style={{ padding: '20px clamp(16px, 2.5vw, 24px)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    color: 'var(--gray-900)',
                    fontFamily: 'monospace',
                  }}
                >
                  #{complaint.ticket_number}
                </span>
                <StatusBadge status={complaint.status} />
              </div>

              {complaint.department && (
                <p style={{ margin: '0 0 8px', fontSize: '0.88rem', color: 'var(--gray-600)', fontWeight: 600 }}>
                  {complaint.department.icon} {complaint.department.name} Department
                </p>
              )}
              <p style={{ margin: '0 0 10px', fontSize: '0.92rem', color: 'var(--gray-800)', lineHeight: 1.5 }}>
                {complaint.description}
              </p>
              {complaint.address && (
                <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                  📍 {complaint.address}
                </p>
              )}

              {/* GPS Coordinates + Navigation */}
              {complaint.latitude && complaint.longitude && (
                <div
                  style={{
                    background: 'var(--green-50)',
                    border: '1.5px solid var(--green-300)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    marginBottom: 12,
                  }}
                >
                  {/* Exact Coordinates Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--theme-primary, #146C94)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🎯 {language === 'hi' ? 'सटीक GPS स्थान' : 'Exact GPS Coordinates'}
                    </span>
                    <code style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-primary, #146C94)', background: 'var(--theme-bg, #F6F1F1)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--theme-component-border, #bfbfbf)' }}>
                      {complaint.latitude.toFixed(6)}, {complaint.longitude.toFixed(6)}
                    </code>
                  </div>

                  {/* Navigation Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${complaint.latitude},${complaint.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(102,0,51,0.3)',
                        minWidth: 160,
                      }}
                    >
                      <Navigation size={15} />
                      {language === 'hi' ? 'दिशा-निर्देश पाएं' : 'Get Directions'}
                    </a>
                    <a
                      href={`https://maps.google.com/?q=${complaint.latitude},${complaint.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--theme-component, #d9d9d9)',
                        color: 'var(--theme-primary, #146C94)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        border: '1.5px solid var(--theme-primary, #146C94)',
                      }}
                    >
                      <Compass size={15} />
                      {language === 'hi' ? 'मानचित्र पर देखें' : 'View on Map'}
                    </a>
                  </div>
                </div>
              )}

              <p style={{ margin: '0 0 0', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                {language === 'hi' ? 'शिकायत का समय:' : 'Submitted on:'}{' '}
                {new Date(complaint.created_at).toLocaleString('en-IN')}
              </p>

              {/* ── Department Action Banner (Visible when pending / in_progress) ── */}
              {(complaint.status === 'pending' || complaint.status === 'in_progress') && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '16px',
                    background: '#f0fdf4',
                    border: '2px dashed #16a34a',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        🏢 {language === 'hi' ? 'विभाग अधिकारी / कर्मचारी कार्यवाही' : 'Department Officer Action'}
                      </span>
                      <h4 style={{ margin: '4px 0 2px', fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>
                        {language === 'hi' ? 'क्या आपने कार्य पूरा कर लिया है?' : 'Have you completed this work on-site?'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-600)' }}>
                        {language === 'hi'
                          ? 'कार्य समाप्ति का फोटो अपलोड करके शिकायत का निराकरण करें ताकि नागरिक सत्यापन कर सके।'
                          : 'Upload work-done photo to resolve this complaint so the citizen can cross-check & verify.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setResolvingModal(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '10px 18px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'linear-gradient(135deg, #15803d, #16a34a)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
                      }}
                    >
                      <Camera size={16} />
                      {language === 'hi' ? 'काम पूरा — फोटो अपलोड करें' : 'Resolve & Upload Work Photo'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Work-Done Cross-Check Proof Section (When resolution exists) ── */}
              {resolution && (
                <div
                  style={{
                    marginTop: 20,
                    padding: '18px',
                    background: 'var(--theme-component, #d9d9d9)',
                    border: '2px solid var(--theme-component-border, #bfbfbf)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📸 {language === 'hi' ? 'विभाग द्वारा कार्य सत्यापन एवं प्रमाण' : 'Department Work Verification Proof'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                      {new Date(resolution.resolved_at).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Side-by-side or stacked Before/After Comparison */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                    {complaint.photo_url && (
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase' }}>
                          🔴 {language === 'hi' ? 'शिकायत के समय की फोटो (Before)' : 'Complaint Photo (Before)'}
                        </p>
                        <a href={complaint.photo_url} target="_blank" rel="noreferrer">
                          <img
                            src={complaint.photo_url}
                            alt="Before"
                            style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--gray-200)' }}
                          />
                        </a>
                      </div>
                    )}

                    {resolution.resolution_photo_url ? (
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
                          🟢 {language === 'hi' ? 'कार्य समाप्ति का फोटो (After / Done)' : 'Work Done Photo (After)'}
                        </p>
                        <a href={resolution.resolution_photo_url} target="_blank" rel="noreferrer">
                          <img
                            src={resolution.resolution_photo_url}
                            alt="After"
                            style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '2px solid #86efac' }}
                          />
                        </a>
                      </div>
                    ) : (
                      <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed var(--gray-200)' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                          {language === 'hi' ? 'कार्य का फोटो संलग्न नहीं' : 'No completion photo attached'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Resolution note */}
                  <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 800, color: '#15803d' }}>
                      📝 {language === 'hi' ? 'निराकरण टिप्पणी:' : 'Resolution Note:'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--gray-800)', lineHeight: 1.5 }}>
                      {resolution.admin_note}
                    </p>
                    {resolution.resolved_by && (
                      <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                        {language === 'hi' ? 'समाधानकर्ता:' : 'Resolved by:'} <strong>{resolution.resolved_by}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              <div
                className="status-timeline"
                style={{
                  marginTop: 20,
                  padding: '16px 18px',
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--gray-200)',
                }}
              >
                <h4 className="status-timeline-title" style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--gray-800)', fontWeight: 800 }}>
                  {language === 'hi' ? 'निराकरण समयरेखा' : 'Redressal Timeline'}
                </h4>
                <div className="status-timeline-steps">
                  {(['pending', 'in_progress', 'resolved', 'verified'] as const).map((s, i) => {
                    const statuses = ['pending', 'in_progress', 'resolved', 'verified'];
                    const currentIdx = statuses.indexOf(complaint.status);
                    const stepIdx = statuses.indexOf(s);
                    const isDone = currentIdx >= stepIdx;
                    return (
                      <div
                        key={s}
                        className="status-timeline-step"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          marginBottom: i < 3 ? 10 : 0,
                        }}
                      >
                        <div
                          className="status-timeline-marker"
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: isDone ? 'var(--green-600)' : 'var(--gray-200)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {isDone ? '✓' : i + 1}
                        </div>
                        <StatusBadge status={s} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Verification Panel – when status is 'resolved' */}
              {complaint.status === 'resolved' && !verified && (
                <div>
                  {/* Case 1: Department Staff is viewing */}
                  {isDeptStaff ? (
                    <div
                      style={{
                        marginTop: 20,
                        padding: '16px 18px',
                        background: '#fef3c7',
                        border: '1.5px solid #f59e0b',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.88rem', color: '#92400e' }}>
                        ⏳ {language === 'hi' ? 'सत्यापन केवल नागरिक या एडमिन द्वारा मान्य' : 'Verification Only by Citizen or Admin'}
                      </p>
                      <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#78350f', lineHeight: 1.5 }}>
                        {language === 'hi'
                          ? 'विभाग ने कार्य समाधान प्रस्तुत कर दिया है। पारदर्शिता हेतु विभाग स्वयं अपने कार्य को सत्यापित नहीं कर सकता। सत्यापन केवल शिकायतकर्ता नागरिक या नगर निगम एडमिन द्वारा ही किया जाएगा।'
                          : 'Department has submitted work resolution proof. For fairness, department staff cannot self-verify. Verification must be performed by the complaint citizen or an administrator.'}
                      </p>
                    </div>
                  ) : isAdmin ? (
                    /* Case 2: Municipal Admin is viewing */
                    <div
                      style={{
                        marginTop: 20,
                        padding: '16px 18px',
                        background: 'var(--theme-component, #d9d9d9)',
                        border: '2px solid var(--theme-primary, #146C94)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--theme-primary, #146C94)', textTransform: 'uppercase' }}>
                        👑 {language === 'hi' ? 'नगर निगम एडमिन सत्यापन' : 'Municipal Admin Verification'}
                      </p>
                      <p style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                        {language === 'hi'
                          ? 'विभाग द्वारा कार्य समाप्ति का फोटो उपलब्ध है। क्या आप एडमिन के रूप में इसे सत्यापित और बंद करना चाहते हैं?'
                          : 'Work-done proof has been provided. Do you approve and mark this verified as Administrator?'}
                      </p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => handleAdminVerify(true)}
                          disabled={verifying}
                          style={{
                            flex: 1,
                            padding: '11px 0',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            background: 'var(--theme-primary, #146C94)',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            fontSize: '0.85rem',
                          }}
                        >
                          <CheckCircle2 size={16} /> {language === 'hi' ? 'एडमिन सत्यापन करें' : 'Admin Verify & Close'}
                        </button>
                        <button
                          onClick={() => handleAdminVerify(false)}
                          disabled={verifying}
                          style={{
                            flex: 1,
                            padding: '11px 0',
                            borderRadius: 'var(--radius-sm)',
                            border: '1.5px solid #dc2626',
                            background: 'var(--theme-component, #d9d9d9)',
                            color: '#dc2626',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            fontSize: '0.85rem',
                          }}
                        >
                          <XCircle size={16} /> {language === 'hi' ? 'अस्वीकार करें' : 'Reject Resolution'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Case 3: Complaint Citizen / User is viewing */
                    <div
                      style={{
                        marginTop: 20,
                        padding: '16px 18px',
                        background: 'var(--theme-component, #d9d9d9)',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 12px',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: 'var(--gray-900)',
                          lineHeight: 1.4,
                        }}
                      >
                        🔔 {language === 'hi'
                          ? 'नागरिक सत्यापन: नगर निगम टीम द्वारा समस्या का समाधान किया गया है। क्या आप संतुष्ट हैं?'
                          : 'Citizen Verification: The municipal team marked this issue as resolved. Is the problem fixed at your location?'}
                      </p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => handleCitizenVerify(true)}
                          disabled={verifying}
                          style={{
                            flex: 1,
                            padding: '11px 0',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            background: 'var(--theme-primary, #146C94)',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            fontSize: '0.85rem',
                          }}
                        >
                          <CheckCircle2 size={16} /> {language === 'hi' ? 'हाँ, हल हो गया!' : 'Yes, Fixed!'}
                        </button>
                        <button
                          onClick={() => handleCitizenVerify(false)}
                          disabled={verifying}
                          style={{
                            flex: 1,
                            padding: '11px 0',
                            borderRadius: 'var(--radius-sm)',
                            border: '1.5px solid #dc2626',
                            background: 'var(--theme-component, #d9d9d9)',
                            color: '#dc2626',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            fontSize: '0.85rem',
                          }}
                        >
                          <XCircle size={16} /> {language === 'hi' ? 'नहीं, अभी भी समस्या है' : 'Not Fixed Yet'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {verified && (
                <div
                  style={{
                    marginTop: 18,
                    padding: '14px 18px',
                    background: 'var(--green-50)',
                    border: '1px solid var(--green-200)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <p style={{ margin: 0, color: 'var(--green-800)', fontWeight: 700, fontSize: '0.88rem' }}>
                    ✅ {language === 'hi'
                      ? 'धन्यवाद! आपकी प्रतिक्रिया दर्ज कर ली गई है।'
                      : 'Thank you! Your verification feedback has been updated.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Department Staff Resolution Modal on Track Page ── */}
      {resolvingModal && complaint && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: 'var(--theme-component, #d9d9d9)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                  📸 {language === 'hi' ? 'शिकायत का समाधान दर्ज करें' : 'Resolve Complaint & Upload Work Photo'}
                </h3>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>
                  #{complaint.ticket_number}
                </p>
              </div>
              <button
                onClick={() => setResolvingModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitResolve} style={{ padding: 24 }}>
              {/* Officer / Resolver Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: 6 }}>
                  👤 {language === 'hi' ? 'अधिकारी / कर्मचारी का नाम' : 'Resolved by (Officer / Team)'}
                </label>
                <input
                  type="text"
                  placeholder={user?.email || 'e.g. Ramesh Verma (Field Officer)'}
                  value={resolveBy}
                  onChange={(e) => setResolveBy(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--gray-200)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Work Done Note */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: 6 }}>
                  📝 {language === 'hi' ? 'कार्य का विवरण (नागरिक इसे देखेगा) *' : 'Resolution Details (Visible to citizen) *'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={language === 'hi' ? 'समस्या का समाधान कैसे हुआ? स्थल से कचरा उठा लिया गया...' : 'What action was taken to fix this issue?...'}
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--gray-200)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Work-Done Photo Upload */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: 6 }}>
                  📷 {language === 'hi' ? 'कार्य समाप्ति का फोटो (प्रमाण हेतु)' : 'Work-Done Completion Photo (Proof)'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
                  style={{ display: 'none' }}
                />

                {!resolvePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--green-300)',
                      borderRadius: 'var(--radius-md)',
                      padding: '24px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'var(--green-50)',
                    }}
                  >
                    <Camera size={26} color="var(--green-600)" style={{ margin: '0 auto 6px', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--green-800)' }}>
                      {language === 'hi' ? 'फोटो खींचें या गैलरी से चुनें' : 'Take or Upload Resolution Photo'}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                      JPG, PNG, WEBP
                    </p>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={resolvePreview}
                      alt="Work done"
                      style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '2px solid #86efac' }}
                    />
                    <button
                      type="button"
                      onClick={() => { setResolvePhoto(null); setResolvePreview(null); }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%',
                        width: 28, height: 28, color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setResolvingModal(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--theme-component-border, #bfbfbf)', background: 'var(--theme-bg, #F6F1F1)',
                    color: 'var(--gray-700)', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingResolve}
                  style={{
                    flex: 2, padding: '12px', borderRadius: 'var(--radius-sm)',
                    border: 'none', background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
                    color: '#fff', fontWeight: 800, fontSize: '0.9rem',
                    cursor: submittingResolve ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    boxShadow: '0 4px 14px rgba(102,0,51,0.3)',
                  }}
                >
                  {submittingResolve ? (
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {language === 'hi' ? 'समाधान जमा करें' : 'Submit as Resolved'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
