import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { useDepartments, useComplaints } from '../hooks/useComplaints';
import { useLocation as useGPS } from '../hooks/useLocation';
import { useStorage } from '../hooks/useStorage';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { LocationPicker } from '../components/common/LocationPicker';
import { ComplaintCard } from '../components/common/ComplaintCard';
import { BottomNav } from '../components/BottomNav';
import { watermarkPhoto } from '../lib/watermarkPhoto';
import { isValidMobile, lettersAndSpaces, mobileDigits } from '../lib/inputValidation';
import { ArrowLeft, Recycle, Info } from 'lucide-react';

const WASTE_TYPES = [
  { id: 'leaves', label: 'Fallen Leaves', hi: 'गिरे पत्ते', icon: '🍂' },
  { id: 'branches', label: 'Tree Branches', hi: 'टहनियाँ', icon: '🌿' },
  { id: 'garden', label: 'Garden Waste', hi: 'बगीचा कचरा', icon: '🌱' },
  { id: 'biodegradable', label: 'Biodegradable Waste', hi: 'जैविक कचरा', icon: '♻️' },
  { id: 'tree_fall', label: 'Fallen Tree', hi: 'गिरा पेड़', icon: '🌳', urgent: true },
  { id: 'other', label: 'Other Green Waste', hi: 'अन्य हरित कचरा', icon: '🗂️' },
];

export const GreenDepartmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useAuth();
  const { departments } = useDepartments();
  const { complaints, submitComplaint } = useComplaints('green');
  const gps = useGPS();
  const { uploadPhoto, uploading } = useStorage();

  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');

  // Photo state — originalFile is the raw capture, photoFile is the stamped one
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [watermarking, setWatermarking] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'report' | 'status'>('report');

  const greenDept = departments.find((d) => d.slug === 'green');
  const locationReady = !!gps.latitude && !!gps.longitude;

  // 🔹 Auto-detect location on mount (silent)
  useEffect(() => {
    gps.detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────────────────────────────────────
     Watermark helper — single source of truth
     ───────────────────────────────────────────── */
  const stampPhoto = async (file: File): Promise<File | null> => {
    if (!locationReady) return null;
    try {
      return await watermarkPhoto(file, {
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: gps.accuracy,
        address: gps.address,
        timestamp: new Date(),
        appName: 'Swachh 311 · IMC',
        departmentName: greenDept?.name ?? 'Green Waste',
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
  }, [locationReady, gps.latitude, gps.longitude]);

  /* ─────────────────────────────────────────────
     Submit — always re-stamp from originalFile before upload
     ───────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType)
      return setError(
        language === 'hi'
          ? 'कृपया कचरे का प्रकार चुनें।'
          : 'Please select waste type.'
      );

    if (!locationReady)
      return setError(
        language === 'hi'
          ? 'कृपया GPS लॉक होने की प्रतीक्षा करें…'
          : 'Please wait for GPS lock…'
      );

    if (!originalFile)
      return setError(
        language === 'hi'
          ? 'कृपया कचरे की तस्वीर अपलोड करें।'
          : 'Please attach a photo of the waste.'
      );

    if (!isValidMobile(citizenPhone))
      return setError(language === 'hi' ? 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।' : 'Enter a valid 10-digit mobile number.');

    if (!greenDept)
      return setError(
        'Department not found. Please ensure database is initialized.'
      );

    setSubmitting(true);
    setError(null);

    try {
      // 🔑 Re-stamp right before upload so the file we ship is ALWAYS
      //    watermarked with the current GPS + dept values.
      let stampedForUpload = photoFile;
      try {
        stampedForUpload = await watermarkPhoto(originalFile, {
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy,
          address: gps.address,
          timestamp: new Date(),
          appName: 'Swachh 311 · IMC',
          departmentName: greenDept.name,
        });
      } catch {
        stampedForUpload = photoFile || originalFile;
      }

      if (stampedForUpload === originalFile) {
        console.warn(
          '[GreenDept] watermark returned original file — uploading un-watermarked photo'
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

      const wasteLabel =
        WASTE_TYPES.find((w) => w.id === selectedType)?.label || selectedType;
      const fullDesc = `[${wasteLabel}] ${description}`.trim();

      const result = await submitComplaint({
        department_id: greenDept.id,
        citizen_name: lettersAndSpaces(citizenName).trim() || null,
        citizen_phone: mobileDigits(citizenPhone) || null,
        description: fullDesc,
        latitude: gps.latitude ?? null,
        longitude: gps.longitude ?? null,
        address: gps.address ?? null,
        photo_url: photoUrl,
      });

      setTicket(result.ticket_number);
    } catch (err: any) {
      setError(err.message || 'Error submitting complaint');
    }

    setSubmitting(false);
  };

  /* ─────────────────────────────────────────────
     Success view
     ───────────────────────────────────────────── */
  if (ticket) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--green-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420, width: '100%' }}>
          <div
            style={{
              fontSize: 64,
              animation: 'bounceIn 0.5s ease',
              marginBottom: 12,
            }}
          >
            ✅
          </div>
          <h2
            style={{
              color: 'var(--green-900)',
              marginBottom: 8,
              fontSize: 'var(--text-xl)',
              fontWeight: 800,
            }}
          >
            {language === 'hi'
              ? 'हरित कचरा शिकायत दर्ज हुई!'
              : 'Green Waste Request Submitted!'}
          </h2>
          <p
            style={{
              color: 'var(--gray-500)',
              marginBottom: 8,
              fontSize: '0.88rem',
            }}
          >
            {language === 'hi'
              ? 'आपका ट्रैकिंग टिकट नंबर:'
              : 'Your tracking ticket number:'}
          </p>
          <div
            style={{
              background: '#fff',
              border: '2px solid var(--green-400)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 20px',
              marginBottom: 16,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(1.2rem, 2vw, 1.8rem)',
                fontWeight: 900,
                color: 'var(--green-800)',
                letterSpacing: 2,
                fontFamily: 'monospace',
              }}
            >
              {ticket}
            </span>
          </div>
          <p
            style={{
              color: 'var(--gray-500)',
              fontSize: '0.82rem',
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            {language === 'hi'
              ? 'नगर निगम की हरित कचरा टीम जल्द ही कचरा उठाने पहुंचेगी। समाधान के बाद आप इसे सत्यापित कर सकेंगे।'
              : 'The municipal green waste collection team has received your ticket and location. You will verify once completed.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`/track?ticket=${ticket}`)}
              style={{
                padding: '11px 22px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--green-600)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {language === 'hi' ? 'स्थिति देखें' : 'Track Status'}
            </button>
            <button
              onClick={() => {
                setTicket(null);
                setOriginalFile(null);
                setPhotoFile(null);
                setPreview(null);
                setDescription('');
                setSelectedType('');
                gps.detectLocation();
              }}
              style={{
                padding: '11px 22px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--gray-300)',
                background: '#fff',
                color: 'var(--gray-700)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {language === 'hi' ? 'नई शिकायत' : 'New Request'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--page-background)',
        paddingBottom: 90,
      }}
    >
      {/* Header */}
      <header
        style={{
          background:
            'var(--header-gradient, linear-gradient(135deg, #0E526F 0%, #146C94 50%, #0E526F 100%))',
          padding: '16px 20px 24px',
          color: '#fff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="app-container"
          style={{ paddingLeft: 0, paddingRight: 0 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}
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
              <ArrowLeft size={18} color="#fff" />
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
                🌿 {t(language, 'greenDeptTitle')}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.78rem',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                {t(language, 'greenDeptSubtitle')}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              {
                id: 'report',
                label:
                  language === 'hi'
                    ? '📸 शिकायत दर्ज करें'
                    : '📸 Request Pickup',
              },
              {
                id: 'status',
                label:
                  language === 'hi'
                    ? '📋 हाल की स्थिति'
                    : '📋 Recent Green Status',
              },
            ].map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id as any)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  cursor: 'pointer',
                  background:
                    tab === tb.id ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: tab === tb.id ? 'var(--green-900)' : '#fff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  transition: 'var(--transition)',
                }}
              >
                {tb.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── TAB: REPORT ──────────────────────────────────────── */}
      {tab === 'report' && (
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
            {/* Helpful Tip Callout */}
            <div
              style={{
                background: 'var(--theme-bg, #F6F1F1)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                gap: 10,
                marginBottom: 20,
              }}
            >
              <Info
                size={18}
                color="var(--green-600)"
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: '0.82rem',
                  color: 'var(--green-800)',
                  lineHeight: 1.5,
                }}
              >
                {t(language, 'greenDeptTip')}
              </p>
            </div>

            {/* Waste type selection */}
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>
                🗂️{' '}
                {language === 'hi'
                  ? 'कचरे का प्रकार चुनें *'
                  : 'Select Waste Category *'}
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {WASTE_TYPES.map((wt) => {
                  const isSelected = selectedType === wt.id;
                  return (
                    <button
                      key={wt.id}
                      type="button"
                      onClick={() => setSelectedType(wt.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected
                          ? '2px solid var(--green-600)'
                          : '1.5px solid var(--gray-200)',
                        background: isSelected ? 'var(--green-50)' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'var(--transition)',
                        position: 'relative',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{wt.icon}</span>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected
                            ? 'var(--green-900)'
                            : 'var(--gray-800)',
                          lineHeight: 1.25,
                        }}
                      >
                        {language === 'hi' ? wt.hi : wt.label}
                      </span>
                      {wt.urgent && (
                        <span
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: 6,
                            background: '#dc2626',
                            color: '#fff',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '2px 5px',
                            borderRadius: 4,
                          }}
                        >
                          URGENT
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo — GPS camera style (moved above location, no gating) */}
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>
                📸 {t(language, 'uploadPhoto')} *
              </label>

              <div style={{ marginTop: 8 }}>
                <PhotoUploader
                  onFileSelected={handleFileSelected}
                  preview={preview}
                  onClear={handleClearPhoto}
                  uploading={uploading}
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
                    {language === 'hi'
                      ? 'स्टैम्प लगाया जा रहा है…'
                      : 'Stamping…'}
                  </p>
                )}

                {/* GPS location strip below the preview */}
                {preview && !watermarking && locationReady && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(0,0,0,0.05)',
                      border:
                        '1px solid var(--theme-component-border, #bfbfbf)',
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
                      {gps.address ||
                        `${gps.latitude?.toFixed(4)}, ${gps.longitude?.toFixed(4)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Silent GPS indicator — only visible while locking */}
            <div style={{ marginBottom: 22 }}>
              <LocationPicker
                latitude={gps.latitude}
                longitude={gps.longitude}
                accuracy={gps.accuracy}
                address={gps.address}
                loading={gps.loading}
                error={gps.error}
                onDetect={gps.detectLocation}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>
                📝{' '}
                {language === 'hi'
                  ? 'अतिरिक्त विवरण'
                  : 'Additional Details'}{' '}
                ({t(language, 'optional')})
              </label>
              <textarea
                placeholder={
                  language === 'hi'
                    ? 'स्थान का कोई लैंडमार्क या कचरे की मात्रा बताएं (उदा. 3 बोरी पत्ते, मुख्य गेट के पास)...'
                    : 'Mention pile estimate or nearby landmarks (e.g. 3 sacks of trimmed branches)…'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }}
              />
            </div>

            {/* Contact details */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>
                👤 {t(language, 'yourDetails')} ({t(language, 'optional')})
              </label>
              <div className="two-col-responsive" style={{ marginTop: 8 }}>
                <input
                  placeholder={t(language, 'name')}
                  value={citizenName}
                  onChange={(e) => setCitizenName(lettersAndSpaces(e.target.value))}
                  style={inputStyle}
                />
                <input
                  placeholder={t(language, 'phone')}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(mobileDigits(e.target.value))}
                  style={inputStyle}
                />
              </div>
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
                boxShadow: '0 6px 20px rgba(102,0,51,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Recycle size={18} />
              {submitting
                ? 'Submitting…'
                : watermarking
                ? language === 'hi'
                  ? 'फोटो तैयार हो रहा है…'
                  : 'Preparing photo…'
                : language === 'hi'
                ? '📤 हरित कचरा उठाने हेतु अनुरोध भेजें'
                : '📤 Request Green Waste Pickup'}
            </button>
          </form>
        </div>
      )}

      {/* ── TAB: STATUS ──────────────────────────────────────── */}
      {tab === 'status' && (
        <div className="content-container-sm" style={{ paddingTop: 20 }}>
          <h3
            style={{
              marginBottom: 14,
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              color: 'var(--gray-900)',
            }}
          >
            {language === 'hi'
              ? 'हाल की हरित कचरा शिकायतें'
              : 'Recent Green Waste Complaints'}
          </h3>
          {complaints.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 20px',
                background: 'var(--theme-component, #d9d9d9)',
                borderRadius: 'var(--radius-md)',
                border:
                  '1.5px dashed var(--theme-component-border, #bfbfbf)',
                color: 'var(--gray-600)',
              }}
            >
              <p style={{ fontSize: 36, marginBottom: 8 }}>🌿</p>
              <p style={{ fontWeight: 600 }}>
                {language === 'hi'
                  ? 'अभी कोई शिकायत नहीं है'
                  : 'No green complaints recorded yet'}
              </p>
            </div>
          )}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {complaints.map((c) => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                onClick={() => navigate(`/track?ticket=${c.ticket_number}`)}
              />
            ))}
          </div>
        </div>
      )}

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
