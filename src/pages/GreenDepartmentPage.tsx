import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { useDepartments, useComplaints } from '../hooks/useComplaints';
import { notifyComplaintActivity } from '../services/notificationBridge';
import { useLocation as useGPS } from '../hooks/useLocation';
import { useStorage } from '../hooks/useStorage';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { LocationPicker } from '../components/common/LocationPicker';
import { ComplaintCard } from '../components/common/ComplaintCard';
import { BottomNav } from '../components/BottomNav';
import { CivicHeader } from '../components/common/CivicHeader';
import { watermarkPhoto } from '../lib/watermarkPhoto';
import { isValidMobile, lettersAndSpaces, mobileDigits } from '../lib/inputValidation';
import { Recycle, Info, CheckCircle2 } from 'lucide-react';
import { GoogleIcon } from '../components/common/GoogleIcon';
import { ArcLoader } from '../components/common/ArcLoader';

const WASTE_TYPES = [
  { id: 'leaves', label: 'Fallen Leaves', hi: 'गिरे पत्ते', icon: 'eco' },
  { id: 'branches', label: 'Tree Branches', hi: 'टहनियाँ', icon: 'eco' },
  { id: 'garden', label: 'Garden Waste', hi: 'बगीचा कचरा', icon: 'potted_plant' },
  { id: 'biodegradable', label: 'Biodegradable Waste', hi: 'जैविक कचरा', icon: 'recycling' },
  { id: 'tree_fall', label: 'Fallen Tree', hi: 'गिरा पेड़', icon: 'park', urgent: true },
  { id: 'other', label: 'Other Green Waste', hi: 'अन्य हरित कचरा', icon: 'category' },
];

export const GreenDepartmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useAuth();
  const { departments } = useDepartments();
  const { complaints, submitComplaint } = useComplaints('green');
  const gps = useGPS();
  const { uploadPhoto, uploading, progress: uploadProgress, statusText: uploadStatusText } = useStorage();
  const [submitPhaseText, setSubmitPhaseText] = useState('');
  const [submitPhasePercent, setSubmitPhasePercent] = useState<number | undefined>(undefined);

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

  // Auto-detect location on mount (silent)
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
      // Re-stamp right before upload so the file we ship is ALWAYS
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

      setSubmitPhasePercent(30);
      setSubmitPhaseText(
        language === 'hi'
          ? 'फोटो सुरक्षित सर्वर पर अपलोड की जा रही है...'
          : 'Uploading green waste photo 1 of 1 to cloud...'
      );

      const photoUrl = await uploadPhoto(stampedForUpload, {
        currentPhoto: 1,
        totalPhotos: 1,
        onProgress: (pct, msg) => {
          setSubmitPhasePercent(pct);
          setSubmitPhaseText(msg);
        },
      });

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

      setSubmitPhasePercent(95);
      setSubmitPhaseText(
        language === 'hi'
          ? 'हरित कचरा अनुरोध दर्ज हो रहा है...'
          : 'Registering green waste collection request...'
      );
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

      setSubmitPhasePercent(100);
      setSubmitPhaseText(
        language === 'hi'
          ? 'अनुरोध सफलतापूर्वक दर्ज हो गया!'
          : 'Request submitted successfully!'
      );
      setTicket(result.ticket_number);

      // Trigger instant in-app alert & device notification
      notifyComplaintActivity({
        ticketNumber: result.ticket_number,
        departmentName: 'हरित विभाग (Green Dept)',
        address: gps.address,
        isSelfSubmission: true,
      });
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
      <div className="min-h-screen bg-sand-50 text-civic-950 font-sans pb-28 lg:pb-12">
        <CivicHeader title={language === 'hi' ? 'हरित कचरा पिकअप' : 'Green Waste Pickup'} />
        <div className="max-w-xl mx-auto px-4 pt-12 text-center">
          <div className="bg-white rounded-3xl border border-sand-200 p-8 sm:p-10 shadow-soft space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-civic-950">
                {language === 'hi'
                  ? 'हरित कचरा पिकअप अनुरोध दर्ज हुआ!'
                  : 'Green Waste Request Submitted!'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {language === 'hi'
                  ? 'नगर निगम की हरित कचरा टीम जल्द ही कचरा उठाने पहुंचेगी।'
                  : 'The municipal green waste team has received your doorstep pickup request.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                {language === 'hi' ? 'ट्रैकिंग टिकट नंबर' : 'Tracking Ticket ID'}
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-wider">
                #{ticket}
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {language === 'hi'
                ? 'कचरा उठाने के बाद आप कार्य का सत्यापन कर सकेंगे। इस टिकट नंबर से स्थिति ट्रैक करें।'
                : 'Track field truck dispatch and verify resolution once the garden waste is collected.'}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate(`/track?ticket=${ticket}`)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-civic-700 hover:bg-civic-800 text-white font-bold text-sm shadow-sm transition active:scale-95 cursor-pointer"
              >
                {language === 'hi' ? 'स्थिति देखें' : 'Track Status'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTicket(null);
                  setOriginalFile(null);
                  setPhotoFile(null);
                  setPreview(null);
                  setDescription('');
                  setSelectedType('');
                  gps.detectLocation();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sand-50 hover:bg-civic-50 text-civic-900 border border-sand-200 font-bold text-sm transition cursor-pointer"
              >
                {language === 'hi' ? 'नया अनुरोध' : 'New Request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 text-civic-950 font-sans pb-28 lg:pb-12">
      <CivicHeader
        title={language === 'hi' ? 'हरित कचरा' : 'Green Waste'}
        subtitle={language === 'hi' ? 'विशिष्ट नागरिक सेवा • नगर पालिका परिषद' : 'Featured Civic Service • Municipal Council'}
        showBack
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{language === 'hi' ? 'हरित पर्यावरण साथी' : 'Swachh Green Initiative'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-civic-950 tracking-tight">
            {t(language, 'greenDeptTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t(language, 'greenDeptSubtitle')} (Fallen leaves, tree pruning & garden waste)
          </p>

          {/* Clean Pill Tabs */}
          <div className="flex gap-2 mt-4 bg-white p-1 rounded-2xl border border-sand-200 shadow-2xs max-w-fit">
            <button
              type="button"
              onClick={() => setTab('report')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                tab === 'report'
                  ? 'bg-civic-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-civic-900 hover:bg-sand-50'
              }`}
            >
              {language === 'hi' ? 'पिकअप अनुरोध' : 'Request Pickup'}
            </button>
            <button
              type="button"
              onClick={() => setTab('status')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                tab === 'status'
                  ? 'bg-civic-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-civic-900 hover:bg-sand-50'
              }`}
            >
              {language === 'hi' ? 'हाल की स्थिति' : 'Recent Status'}
            </button>
          </div>
        </div>

        {/* ── TAB: REPORT ──────────────────────────────────────── */}
        {tab === 'report' && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-card space-y-6"
          >
            {/* Helpful Tip Callout */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 text-emerald-900">
              <Info
                size={18}
                className="text-emerald-700 shrink-0 mt-0.5"
              />
              <p className="text-xs sm:text-sm leading-relaxed text-emerald-800">
                {t(language, 'greenDeptTip')}
              </p>
            </div>

            {/* Waste type selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {language === 'hi'
                  ? 'कचरे का प्रकार चुनें *'
                  : 'Select Waste Category *'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {WASTE_TYPES.map((wt) => {
                  const isSelected = selectedType === wt.id;
                  return (
                    <button
                      key={wt.id}
                      type="button"
                      onClick={() => setSelectedType(wt.id)}
                      className={`relative flex items-center gap-2.5 p-3 rounded-2xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                          : 'bg-sand-50/60 border-sand-200 hover:bg-sand-100/60 text-slate-700 font-medium'
                      }`}
                    >
                      <GoogleIcon name={wt.icon} size={20} color={isSelected ? '#059669' : '#64748b'} />
                      <span className="text-xs leading-tight">
                        {language === 'hi' ? wt.hi : wt.label}
                      </span>
                      {wt.urgent && (
                        <span className="absolute -top-1.5 right-2 bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-2xs">
                          URGENT
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo — Live GPS camera */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-sm">photo_camera</span>
                  {language === 'hi' ? 'लाइव कैमरा फोटो' : 'Live Camera Photo'} *
                </span>
              </label>

              <div>
                <PhotoUploader
                  onFileSelected={handleFileSelected}
                  preview={preview}
                  onClear={handleClearPhoto}
                  uploading={uploading}
                  disabled={watermarking}
                />

                {watermarking && (
                  <p className="mt-2 text-xs text-slate-500 text-center italic">
                    {language === 'hi'
                      ? 'स्टैम्प लगाया जा रहा है…'
                      : 'Stamping…'}
                  </p>
                )}

                {/* GPS location strip below preview */}
                {preview && !watermarking && locationReady && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-sand-50 border border-sand-200 flex items-center gap-2 text-xs text-slate-600">
                    <span className="material-symbols-rounded text-emerald-600 text-sm">location_on</span>
                    <span className="truncate font-semibold">
                      {gps.address ||
                        `${gps.latitude?.toFixed(4)}, ${gps.longitude?.toFixed(4)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Silent GPS indicator */}
            <div>
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
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-sm">edit_note</span>
                  {language === 'hi' ? 'अतिरिक्त विवरण' : 'Additional Details'}
                </span>{' '}
                <span className="text-slate-400 font-normal lowercase">({t(language, 'optional')})</span>
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
                className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition resize-y"
              />
            </div>

            {/* Contact details */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-sm">person</span>
                  {t(language, 'yourDetails')}
                </span>{' '}
                <span className="text-slate-400 font-normal lowercase">({t(language, 'optional')})</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder={t(language, 'name')}
                  value={citizenName}
                  onChange={(e) => setCitizenName(lettersAndSpaces(e.target.value))}
                  className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition"
                />
                <input
                  placeholder={t(language, 'phone')}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(mobileDigits(e.target.value))}
                  className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition"
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-rounded text-rose-600 text-base">warning</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || uploading || watermarking}
              className={`w-full py-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer shadow-sm ${
                submitting || uploading || watermarking
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-civic-700 hover:bg-civic-800 text-white'
              }`}
            >
              <Recycle size={18} />
              {submitting
                ? 'Submitting…'
                : watermarking
                ? language === 'hi'
                  ? 'फोटो तैयार हो रहा है…'
                  : 'Preparing photo…'
                : language === 'hi'
                ? 'हरित कचरा उठाने हेतु अनुरोध भेजें'
                : 'Request Green Waste Pickup'}
            </button>
          </form>
        )}

        {/* ── TAB: STATUS ──────────────────────────────────────── */}
        {tab === 'status' && (
          <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-card space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-civic-950">
              {language === 'hi'
                ? 'हाल की हरित कचरा शिकायतें'
                : 'Recent Green Waste Complaints'}
            </h3>
            {complaints.length === 0 && (
              <div className="text-center py-12 px-4 rounded-2xl bg-sand-50 border border-dashed border-sand-200 text-slate-500">
                <p className="mb-2"><span className="material-symbols-rounded text-4xl text-emerald-600">eco</span></p>
                <p className="font-semibold text-sm">
                  {language === 'hi'
                    ? 'अभी कोई शिकायत नहीं है'
                    : 'No green complaints recorded yet'}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3">
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
              ? 'हरित कचरा फोटो व अनुरोध अपलोड हो रहा है'
              : 'Submitting Green Waste Pickup Request'
          }
          subtitle={
            submitPhaseText ||
            uploadStatusText ||
            (language === 'hi'
              ? 'कृपया प्रतीक्षा करें, फोटो और विवरण अपलोड हो रहे हैं...'
              : 'Please wait, syncing photo & GPS telemetry to municipal cloud...')
          }
          percent={submitPhasePercent ?? (uploading ? uploadProgress : undefined)}
          photoCount={{ current: 1, total: 1 }}
        />
      )}

      <BottomNav />
    </div>
  );
};
