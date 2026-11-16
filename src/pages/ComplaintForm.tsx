import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { useDepartments, useComplaints } from '../hooks/useComplaints';
import { useLocation } from '../hooks/useLocation';
import { useStorage } from '../hooks/useStorage';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { LocationPicker } from '../components/common/LocationPicker';
import { BottomNav } from '../components/BottomNav';
import { CivicHeader } from '../components/common/CivicHeader';
import { watermarkPhoto } from '../lib/watermarkPhoto';
import type { Department } from '../lib/supabase';
import { isValidMobile, lettersAndSpaces, mobileDigits } from '../lib/inputValidation';
import { CheckCircle2, ChevronDown, Search, X } from 'lucide-react';
import { GoogleIcon } from '../components/common/GoogleIcon';
import { ArcLoader } from '../components/common/ArcLoader';

export const ComplaintForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, language } = useAuth();
  const { departments, loading: deptsLoading } = useDepartments();
  const { submitComplaint } = useComplaints();
  const loc = useLocation();
  const { uploadPhoto, uploading, progress: uploadProgress, statusText: uploadStatusText } = useStorage();
  const [submitPhaseText, setSubmitPhaseText] = useState('');
  const [submitPhasePercent, setSubmitPhasePercent] = useState<number | undefined>(undefined);

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [watermarking, setWatermarking] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [deptOpen, setDeptOpen] = useState(false);
  const [deptQuery, setDeptQuery] = useState('');
  const deptBoxRef = useRef<HTMLDivElement>(null);

    // Auto pre-fill citizen name and phone if logged in
  useEffect(() => {
    if (profile?.full_name && !citizenName) setCitizenName(profile.full_name);
    if (profile?.phone && !citizenPhone) setCitizenPhone(profile.phone);
  }, [profile]);

  const locationReady = !!loc.latitude && !!loc.longitude;

  useEffect(() => {
    loc.detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const slug = searchParams.get('dept');
    if (slug && departments.length > 0) {
      const dept = departments.find((d) => d.slug === slug);
      if (dept) setSelectedDept(dept);
    }
  }, [searchParams, departments]);

  // Close dept dropdown on outside click / Esc
  useEffect(() => {
    if (!deptOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (deptBoxRef.current && !deptBoxRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeptOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [deptOpen]);

  const filteredDepts = useMemo(() => {
    const q = deptQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.slug ?? '').toLowerCase().includes(q)
    );
  }, [departments, deptQuery]);

  /* ─────────────────────────────────────────────
     Watermark helper — single source of truth
     ───────────────────────────────────────────── */
  const stampPhoto = async (file: File): Promise<File | null> => {
    if (!locationReady) return null;
    try {
      return await watermarkPhoto(file, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        address: loc.address,
        timestamp: new Date(),
        appName: 'Swachh 311 · IMC',
        departmentName: selectedDept?.name ?? null,
      });
    } catch (err) {
      console.warn('Watermark failed, using original photo', err);
      return file;
    }
  };

  /* ─────────────────────────────────────────────
     Photo captured → preview instantly, stamp when GPS ready
     ───────────────────────────────────────────── */
  const handleFileSelected = async (file: File) => {
    setOriginalFile(file);
    setError(null);
    setPreview(URL.createObjectURL(file)); // instant feedback

    if (!locationReady) return; // will be stamped by effect below

    setWatermarking(true);
    setSubmitPhasePercent(25);
    setSubmitPhaseText(
      language === 'hi'
        ? 'जीपीएस लोकेशन व टाइमस्टैम्प वाटरमार्क तैयार किया जा रहा है...'
        : 'Applying official GPS & timestamp watermark...'
    );
    const stamped = await stampPhoto(file);
    if (stamped) {
      setPhotoFile(stamped);
      setPreview(URL.createObjectURL(stamped));
    }
    setWatermarking(false);
    setSubmitPhasePercent(undefined);
    setSubmitPhaseText('');
  };

  const handleClearPhoto = () => {
    setOriginalFile(null);
    setPhotoFile(null);
    setPreview(null);
  };

  /* ─────────────────────────────────────────────
     Auto re-stamp when GPS arrives or dept changes
     ───────────────────────────────────────────── */
  useEffect(() => {
    if (!originalFile || !locationReady) return;
    let cancelled = false;

    (async () => {
      setWatermarking(true);
      const stamped = await stampPhoto(originalFile);
      if (cancelled || !stamped) {
        setWatermarking(false);
        return;
      }
      setPhotoFile(stamped);
      setPreview(URL.createObjectURL(stamped));
      setWatermarking(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept?.id, locationReady, loc.latitude, loc.longitude]);

  /* ─────────────────────────────────────────────
     Submit — always re-stamp from originalFile right before upload
     ───────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDept) {
      return setError(
        language === 'hi'
          ? 'कृपया विभाग का चयन करें।'
          : 'Please select a department.'
      );
    }
    if (!locationReady) {
      return setError(
        language === 'hi'
          ? 'कृपया GPS लॉक होने की प्रतीक्षा करें…'
          : 'Please wait for GPS lock…'
      );
    }
    if (!originalFile) {
      return setError(
        language === 'hi'
          ? 'कृपया समस्या का लाइव फोटो खींचें।'
          : 'Please capture a live photo of the issue.'
      );
    }
    if (!description.trim()) {
      return setError(
        language === 'hi'
          ? 'कृपया शिकायत का विवरण दें।'
          : 'Please describe the issue.'
      );
    }
    if (!isValidMobile(citizenPhone)) {
      return setError(language === 'hi' ? 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।' : 'Enter a valid 10-digit mobile number.');
    }

    setSubmitting(true);
    setError(null);

    try {
      // Re-stamp right before upload so the file we ship is ALWAYS
      //    the watermarked version with the current GPS + dept values.
      let stampedForUpload: File = photoFile || originalFile;
      try {
        stampedForUpload = await watermarkPhoto(originalFile, {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          address: loc.address,
          timestamp: new Date(),
          appName: 'Swachh 311 · IMC',
          departmentName: selectedDept.name,
        });
      } catch {
        stampedForUpload = photoFile || originalFile;
      }

      if (stampedForUpload === originalFile) {
        console.warn(
          '[ComplaintForm] watermark returned original file — uploading un-watermarked photo'
        );
      }

      const photoUrl = await uploadPhoto(stampedForUpload);

      if (!photoUrl) {
        throw new Error(
          language === 'hi'
            ? 'फोटो अपलोड नहीं हो पाया। कृपया पुनः प्रयास करें।'
            : 'Photo upload failed. Please try again.'
        );
      }

      const complaint = await submitComplaint({
        department_id: selectedDept.id,
        citizen_name: citizenName || null,
        citizen_phone: citizenPhone || null,
        description,
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null,
        address: loc.address ?? null,
        photo_url: photoUrl,
        created_by: user?.id || null,
      });

      // Save locally to device cache so profile page tracks it immediately
      try {
        const stored = JSON.parse(localStorage.getItem('betul_my_complaints') || '[]');
        stored.unshift({
          id: complaint.id,
          ticket_number: complaint.ticket_number,
          created_at: complaint.created_at || new Date().toISOString(),
          dept_name: selectedDept.name,
          status: 'pending',
          citizen_phone: citizenPhone || null,
        });
        localStorage.setItem('betul_my_complaints', JSON.stringify(stored.slice(0, 50)));
      } catch {}

      setTicket(complaint.ticket_number);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    }

    setSubmitting(false);
  };

  /* ─────────────────────────────────────────────
     Success screen
     ───────────────────────────────────────────── */
  if (ticket) {
    return (
      <div className="min-h-screen bg-sand-50 text-civic-950 font-sans pb-28 lg:pb-12">
        <CivicHeader title={language === 'hi' ? 'सफल पंजीकरण' : 'Complaint Submitted'} />
        <div className="max-w-xl mx-auto px-4 pt-12 text-center">
          <div className="bg-white rounded-3xl border border-sand-200 p-8 sm:p-10 shadow-soft space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-civic-950">
                {language === 'hi' ? 'शिकायत सफलतापूर्वक दर्ज हुई' : 'Grievance Submitted Successfully'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {language === 'hi'
                  ? 'आपकी समस्या संबंधित नगर पालिका वार्ड फील्ड टीम को आवंटित कर दी गई है।'
                  : 'Your complaint has been routed to the respective municipal field team.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                {language === 'hi' ? 'शिकायत टिकट नंबर' : 'Complaint Ticket ID'}
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-civic-800 tracking-wider">
                #{ticket}
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {language === 'hi'
                ? 'इस टिकट नंबर को सुरक्षित रखें। फील्ड टीम द्वारा समाधान किए जाने पर आपको सत्यापन का अवसर मिलेगा।'
                : 'Save this ticket ID to track field status and verify resolution once completed.'}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate(`/track?ticket=${ticket}`)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-civic-700 hover:bg-civic-800 text-white font-bold text-sm shadow-sm transition active:scale-95 cursor-pointer"
              >
                {language === 'hi' ? 'लाइव स्थिति ट्रैक करें' : 'Track Status'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sand-50 hover:bg-civic-50 text-civic-900 border border-sand-200 font-bold text-sm transition cursor-pointer"
              >
                {language === 'hi' ? 'मुख्य पृष्ठ' : 'Go to Home'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     Main form
     ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-sand-50 text-civic-950 font-sans pb-28 lg:pb-12">
      <CivicHeader
        title={language === 'hi' ? 'समस्या दर्ज करें' : 'Report Issue'}
        subtitle={language === 'hi' ? 'नगर पालिका परिषद बैतूल • 311' : 'Nagar Palika Parishad Betul • 311'}
        showBack
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-civic-50 border border-civic-100 text-civic-800 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{language === 'hi' ? 'नागरिक समाधान साथी' : 'Citizen Grievance Redressal'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-civic-950 tracking-tight">
            {language === 'hi' ? 'नई शिकायत दर्ज करें' : 'Report Civic Issue'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {language === 'hi'
              ? 'समस्या की लाइव फोटो लें व स्थान का विवरण देकर तुरंत दर्ज करें।'
              : 'Submit geo-tagged live photo evidence directly to municipal engineers.'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-card space-y-6"
        >
          {/* Department selector */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-rounded" style={{ fontSize: 15 }}>apartment</span>{t(language, 'selectDept')} *</span>
            </label>

            {deptsLoading ? (
              <div
                className="shimmer"
                style={{ height: 48, borderRadius: 10, marginTop: 8 }}
              />
            ) : (
              <div
                ref={deptBoxRef}
                style={{ position: 'relative', marginTop: 8 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setDeptOpen((o) => !o);
                    setDeptQuery('');
                  }}
                  style={{
                    ...inputStyle,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: selectedDept
                      ? `2px solid ${selectedDept.color}`
                      : '1.5px solid var(--theme-component-border, #bfbfbf)',
                  }}
                >
                  {selectedDept ? (
                    <>
                      <GoogleIcon name={selectedDept.icon} size={20} />
                      <span
                        style={{
                          flex: 1,
                          fontWeight: 700,
                          color: selectedDept.color,
                          fontSize: '0.9rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {selectedDept.name}
                      </span>
                    </>
                  ) : (
                    <span
                      style={{
                        flex: 1,
                        color: 'var(--gray-500)',
                        fontSize: '0.9rem',
                      }}
                    >
                      {language === 'hi'
                        ? '-- विभाग चुनें --'
                        : '-- Select a department --'}
                    </span>
                  )}
                  <ChevronDown
                    size={18}
                    style={{
                      flexShrink: 0,
                      color: 'var(--gray-500)',
                      transition: 'transform 0.2s ease',
                      transform: deptOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {deptOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      zIndex: 60,
                      background: 'var(--theme-bg, #F6F1F1)',
                      border:
                        '1.5px solid var(--theme-component-border, #bfbfbf)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--gray-200)',
                        background: '#fff',
                      }}
                    >
                      <Search size={15} color="var(--gray-500)" />
                      <input
                        autoFocus
                        value={deptQuery}
                        onChange={(e) => setDeptQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        placeholder={
                          language === 'hi'
                            ? 'विभाग खोजें…'
                            : 'Search department…'
                        }
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          fontSize: '0.88rem',
                          color: 'var(--gray-900)',
                        }}
                      />
                      {deptQuery && (
                        <button
                          type="button"
                          onClick={() => setDeptQuery('')}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                          }}
                        >
                          <X size={14} color="var(--gray-500)" />
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {filteredDepts.length === 0 ? (
                        <div
                          style={{
                            padding: '14px 16px',
                            fontSize: '0.85rem',
                            color: 'var(--gray-500)',
                            textAlign: 'center',
                          }}
                        >
                          {language === 'hi'
                            ? 'कोई विभाग नहीं मिला'
                            : 'No departments found'}
                        </div>
                      ) : (
                        filteredDepts.map((dept) => {
                          const isSelected = selectedDept?.id === dept.id;
                          return (
                            <button
                              key={dept.id}
                              type="button"
                              onClick={() => {
                                setSelectedDept(dept);
                                setDeptOpen(false);
                                setDeptQuery('');
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '11px 14px',
                                border: 'none',
                                borderLeft: isSelected
                                  ? `3px solid ${dept.color}`
                                  : '3px solid transparent',
                                background: isSelected
                                  ? `${dept.color}1A`
                                  : 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.88rem',
                                fontWeight: isSelected ? 800 : 600,
                                color: isSelected
                                  ? dept.color
                                  : 'var(--gray-800)',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.background = 'var(--gray-100)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  (
                                    e.currentTarget as HTMLButtonElement
                                  ).style.background = 'transparent';
                                }
                              }}
                            >
                              <GoogleIcon name={dept.icon} size={20} />
                              <span style={{ flex: 1 }}>{dept.name}</span>
                              {isSelected && (
                                <CheckCircle2 size={16} color={dept.color} />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Citizen name */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-rounded" style={{ fontSize: 15 }}>person</span>{language === 'hi' ? 'आपका नाम' : 'Your Name'}</span>
            </label>
            <input
              type="text"
              value={citizenName}
              onChange={(e) => setCitizenName(lettersAndSpaces(e.target.value))}
              placeholder={language === 'hi' ? 'वैकल्पिक' : 'Optional'}
              style={inputStyle}
            />
          </div>

          {/* Citizen phone */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-rounded" style={{ fontSize: 15 }}>call</span>{language === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'}</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={citizenPhone}
              onChange={(e) => setCitizenPhone(mobileDigits(e.target.value))}
              placeholder={language === 'hi' ? 'वैकल्पिक' : 'Optional'}
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="material-symbols-rounded" style={{ fontSize: 15 }}>edit_note</span>{language === 'hi' ? 'समस्या का विवरण' : 'Description'} *</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={
                language === 'hi'
                  ? 'कृपया समस्या का विस्तार से वर्णन करें…'
                  : 'Please describe the issue in detail…'
              }
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Photo — Live GPS camera */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 15 }}>photo_camera</span>
                {language === 'hi' ? 'लाइव कैमरा फोटो' : 'Live Camera Photo'} *
              </span>
            </label>

            <PhotoUploader
              onFileSelected={handleFileSelected}
              preview={preview}
              onClear={handleClearPhoto}
              disabled={watermarking}
            />

            {watermarking && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: '0.75rem',
                  color: 'var(--gray-500)',
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                {language === 'hi' ? 'स्टैम्प लगाया जा रहा है…' : 'Stamping…'}
              </p>
            )}

            {preview && !watermarking && locationReady && (
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.05)',
                  border: '1px solid var(--theme-component-border, #bfbfbf)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.75rem',
                  color: 'var(--gray-600, #4b5563)',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 15, color: '#146C94' }}>location_on</span>
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                  }}
                >
                  {loc.address ||
                    `${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}`}
                </span>
              </div>
            )}
          </div>

          {/* Silent GPS indicator */}
          <div style={{ marginBottom: 22 }}>
            <LocationPicker
              latitude={loc.latitude}
              longitude={loc.longitude}
              accuracy={loc.accuracy}
              address={loc.address}
              loading={loc.loading}
              error={loc.error}
              onDetect={loc.detectLocation}
              language={language}
            />
          </div>

          {error && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: 18,
                color: '#dc2626',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-rounded" style={{ fontSize: 16, color: '#dc2626' }}>warning</span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || uploading || watermarking}
            className="w-full py-3.5 px-6 rounded-2xl bg-civic-700 hover:bg-civic-800 disabled:bg-slate-300 text-white font-bold text-sm sm:text-base shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting
              ? 'Submitting…'
              : watermarking
              ? language === 'hi'
                ? 'फोटो तैयार हो रहा है…'
                : 'Preparing photo…'
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>send</span>{t(language, 'submit')}</span>}
          </button>
        </form>
      </div>

      {(submitting || uploading || watermarking) && (
        <ArcLoader
          mode="floating" position="bottom"
          theme="portal"
          status={
            watermarking
              ? language === 'hi'
                ? 'फोटो पर जीपीएस वाटरमार्क लगाया जा रहा है'
                : 'Applying Official GPS Watermark'
              : language === 'hi'
              ? 'शिकायत व फोटो अपलोड हो रही है'
              : 'Submitting Grievance & Photo'
          }
          subtitle={
            submitPhaseText ||
            uploadStatusText ||
            (language === 'hi'
              ? 'कृपया प्रतीक्षा करें, फोटो और विवरण अपलोड हो रहे हैं...'
              : 'Please wait, syncing photo & complaint telemetry to municipal cloud...')
          }
          percent={submitPhasePercent ?? (uploading ? uploadProgress : undefined)}
          photoCount={{ current: 1, total: 1 }}
        />
      )}

      <BottomNav />
    </div>
  );
};

/* ─── Shared styles ─── */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#475569',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid #e6e2d8',
  fontSize: '0.9rem',
  color: '#0f2531',
  outline: 'none',
  background: '#faf9f6',
};
