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
import { watermarkPhoto } from '../lib/watermarkPhoto';
import type { Department } from '../lib/supabase';
import { isValidMobile, lettersAndSpaces, mobileDigits } from '../lib/inputValidation';
import { ArrowLeft, CheckCircle2, ChevronDown, Search, X } from 'lucide-react';

export const ComplaintForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useAuth();
  const { departments, loading: deptsLoading } = useDepartments();
  const { submitComplaint } = useComplaints();
  const loc = useLocation();
  const { uploadPhoto, uploading } = useStorage();

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
    const stamped = await stampPhoto(file);
    if (stamped) {
      setPhotoFile(stamped);
      setPreview(URL.createObjectURL(stamped));
    }
    setWatermarking(false);
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
          ? 'कृपया समस्या का फोटो अपलोड करें।'
          : 'Please attach a photo.'
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
      // 🔑 Re-stamp right before upload so the file we ship is ALWAYS
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
      });

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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--green-50)',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 440, width: '100%' }}>
          <CheckCircle2
            size={64}
            color="var(--green-600)"
            style={{ marginBottom: 16 }}
          />
          <h2
            style={{
              color: 'var(--green-900)',
              marginBottom: 8,
              fontSize: 'var(--text-xl)',
            }}
          >
            {t(language, 'success')}
          </h2>
          <p
            style={{
              color: 'var(--gray-500)',
              marginBottom: 6,
              fontSize: '0.9rem',
            }}
          >
            {t(language, 'ticketGenerated')}:
          </p>
          <div
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              border: '2px solid var(--theme-primary, #146C94)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 24px',
              marginBottom: 20,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(1.2rem, 2vw, 1.8rem)',
                fontWeight: 900,
                color: 'var(--theme-primary, #146C94)',
                letterSpacing: 2,
                fontFamily: 'monospace',
              }}
            >
              {ticket}
            </span>
          </div>
          <p
            style={{
              color: 'var(--gray-600)',
              fontSize: '0.85rem',
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            {language === 'hi'
              ? 'इस टिकट नंबर को सुरक्षित रखें। विभाग द्वारा समाधान के बाद आपको इसे सत्यापित करने का अवसर मिलेगा।'
              : 'Save this ticket number to track resolution progress. You will be able to verify once resolved.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`/track?ticket=${ticket}`)}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background:
                  'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {t(language, 'trackStatus')}
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-component, #d9d9d9)',
                color: 'var(--gray-800)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {t(language, 'home')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     Main form
     ───────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--page-background)',
        paddingBottom: 90,
      }}
    >
      <header
        style={{
          background:
            'var(--header-gradient, linear-gradient(135deg, #0E526F 0%, #146C94 50%, #0E526F 100%))',
          padding: '14px 20px',
          color: '#fff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="app-container"
          style={{ display: 'flex', alignItems: 'center', gap: 14 }}
        >
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
            <h1
              style={{
                margin: 0,
                fontSize: 'var(--text-lg)',
                fontWeight: 800,
                color: '#fff',
              }}
            >
              {t(language, 'reportIssue')}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              IMC & Betul Municipal Corporation · Swachh 311
            </p>
          </div>
        </div>
      </header>

      <div className="content-container-sm" style={{ paddingTop: 20 }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--theme-component, #d9d9d9)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(16px, 3vw, 28px)',
            border: '1.5px solid var(--theme-component-border, #bfbfbf)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Department selector */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>
              🏢 {t(language, 'selectDept')} *
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
                      <span style={{ fontSize: 20, lineHeight: 1 }}>
                        {selectedDept.icon}
                      </span>
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
                              <span style={{ fontSize: 20, lineHeight: 1 }}>
                                {dept.icon}
                              </span>
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
              👤 {language === 'hi' ? 'आपका नाम' : 'Your Name'}
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
              📞 {language === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'}
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
              📝 {language === 'hi' ? 'समस्या का विवरण' : 'Description'} *
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

          {/* Photo — GPS camera style */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>
              📷 {language === 'hi' ? 'फोटो अपलोड करें' : 'Upload Photo'} *
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
                <span style={{ fontSize: 13 }}>📍</span>
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
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || uploading || watermarking}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background:
                submitting || uploading || watermarking
                  ? 'var(--gray-300)'
                  : 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              cursor:
                submitting || uploading || watermarking
                  ? 'not-allowed'
                  : 'pointer',
              boxShadow: '0 4px 16px rgba(102,0,51,0.3)',
              transition: 'var(--transition)',
            }}
          >
            {submitting
              ? 'Submitting…'
              : watermarking
              ? language === 'hi'
                ? 'फोटो तैयार हो रहा है…'
                : 'Preparing photo…'
              : `📤 ${t(language, 'submit')}`}
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
};

/* ─── Shared styles ─── */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.88rem',
  fontWeight: 700,
  color: 'var(--gray-800)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
  fontSize: '0.88rem',
  color: 'var(--gray-900)',
  outline: 'none',
  background: 'var(--theme-bg, #F6F1F1)',
};
