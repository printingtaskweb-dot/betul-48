import React, { useState, useEffect } from 'react';
import { BellRing, X, CheckCircle2, Share, PlusSquare } from 'lucide-react';
import { getToken, isSupported } from 'firebase/messaging';
import { messaging, VAPID_KEY, saveFCMTokenToSupabase } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * NotificationPrompt
 * ─────────────────────────────────────────────────────────────
 * Interactive floating prompt shown to users on their first visit.
 * • Works on both Desktop and Mobile devices.
 * • On Mobile: Positioned cleanly above the bottom navigation bar.
 * • On iOS: Shows helpful "Add to Home Screen" instructions.
 * • On Android/Desktop: One-click "Allow" enables push notifications.
 */
export const NotificationPrompt: React.FC = () => {
  const { user, language } = useAuth();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

    // Check recent dismissal (within last 24 hours)
    const dismissedAt = localStorage.getItem('imc_fcm_prompt_dismissed');
    if (dismissedAt) {
      const hoursSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    const checkSupportAndShow = async () => {
      try {
        const supported = await isSupported();

        if (!supported) {
          // If iOS Safari without PWA installation, show iOS instructions
          if (isIOS && !isStandalone) {
            setIsIOSDevice(true);
            setTimeout(() => setShow(true), 1500);
          }
          return;
        }

        // For supported browsers, check Notification permission
        if (typeof Notification !== 'undefined') {
          if (Notification.permission === 'granted' || Notification.permission === 'denied') {
            return;
          }
        }

        // Show prompt after 1.5 seconds
        setTimeout(() => setShow(true), 1500);
      } catch (err) {
        console.warn('[FCM] Error checking messaging support:', err);
      }
    };

    checkSupportAndShow();
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('imc_fcm_prompt_dismissed', Date.now().toString());
  };

  const handleAllow = async () => {
    if (!messaging) return;
    setStatus('requesting');

    try {
      // 1. Direct user gesture: trigger browser permission prompt
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        setStatus('granted');
        localStorage.removeItem('imc_fcm_prompt_dismissed');

        // 2. Fetch FCM token from Google
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          // 3. Register device in Supabase fcm_tokens table
          const { error: saveErr } = await saveFCMTokenToSupabase(token, user?.id);
          if (saveErr) {
            console.error('[FCM] Error saving token to Supabase:', saveErr);
          } else {
            console.log('[FCM] Device token successfully registered in Supabase.');
          }
        }

        // Auto close after 2 seconds
        setTimeout(() => {
          setShow(false);
        }, 2000);
      } else {
        setStatus('denied');
        handleDismiss();
      }
    } catch (err) {
      console.warn('[FCM] Permission request failed:', err);
      handleDismiss();
    }
  };

  if (!show) return null;

  const isHindi = language === 'hi';

  return (
    <>
      <style>{`
        .fcm-prompt-card {
          position: fixed;
          z-index: 999999;
          left: 14px;
          right: 14px;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
          max-width: 420px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28), 0 2px 10px rgba(0, 0, 0, 0.1);
          border: 1.5px solid #d1d5db;
          padding: 18px;
          animation: slideUpFCM 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: inherit;
        }
        @media (min-width: 640px) {
          .fcm-prompt-card {
            left: auto;
            right: 24px;
            bottom: 24px;
            margin: 0;
            width: 390px;
          }
        }
        @keyframes slideUpFCM {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseFCM {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.1); }
        }
      `}</style>

      <aside className="fcm-prompt-card" aria-label="Notification permission prompt">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            padding: 4,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        {status === 'granted' ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <CheckCircle2 size={42} color="#059669" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', color: '#065f46', fontSize: '1.05rem', fontWeight: 800 }}>
              {isHindi ? 'सूचनाएं चालू कर दी गईं!' : 'Notifications Enabled!'}
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#555' }}>
              {isHindi
                ? 'अब आपको सभी महत्वपूर्ण अपडेट तुरंत प्राप्त होंगे।'
                : 'You will now receive instant municipal alerts and updates.'}
            </p>
          </div>
        ) : isIOSDevice ? (
          /* iOS Safari Specific Instruction */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #146C94, #0E526F)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(20, 108, 148, 0.25)',
                }}
              >
                <BellRing size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#146C94' }}>
                  {isHindi ? 'आईफोन सूचनाएं' : 'iPhone Notifications'}
                </div>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#111827', lineHeight: 1.25 }}>
                  {isHindi ? 'ऐप को होम स्क्रीन पर जोड़ें' : 'Add App to Home Screen'}
                </h4>
              </div>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.45 }}>
              {isHindi
                ? 'iPhone पर पुश नोटिफिकेशन प्राप्त करने के लिए: सफारी में नीचे शेयर (Share) आइकन दबाएं और "Add to Home Screen" चुनें।'
                : 'To receive push notifications on iOS: tap the Share button in Safari and select "Add to Home Screen".'}
            </p>
            <div style={{ display: 'flex', gap: 8, background: '#f3f4f6', padding: '10px 12px', borderRadius: 8, fontSize: '0.78rem', color: '#374151', marginBottom: 14 }}>
              <Share size={16} color="#146C94" />
              <span>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> <PlusSquare size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /></span>
            </div>
            <button
              onClick={handleDismiss}
              style={{
                width: '100%',
                padding: '10px 0',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #146C94, #0E526F)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              {isHindi ? 'समझ गया' : 'Got it'}
            </button>
          </div>
        ) : (
          /* Standard Android & Desktop Flow */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #146C94, #0E526F)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(20, 108, 148, 0.25)',
                }}
              >
                <BellRing size={22} style={{ animation: 'pulseFCM 2s infinite ease-in-out' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#146C94' }}>
                  {isHindi ? 'नगर पालिका बैतूल' : 'IMC Betul 311'}
                </div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#111827', lineHeight: 1.25 }}>
                  {isHindi ? 'पुश सूचनाएं सक्षम करें?' : 'Enable Push Notifications?'}
                </h4>
              </div>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.45 }}>
              {isHindi
                ? 'पानी की आपूर्ति, स्वच्छता, शिकायत की स्थिति और आपातकालीन नागरिक घोषणाओं की सूचनाएं तुरंत पाएं।'
                : 'Stay informed with instant updates on your complaint status, water supply schedules, and municipal announcements.'}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleAllow}
                disabled={status === 'requesting'}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: status === 'requesting' ? '#999' : 'linear-gradient(135deg, #146C94, #0E526F)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: status === 'requesting' ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(20, 108, 148, 0.25)',
                }}
              >
                <BellRing size={15} />
                {status === 'requesting'
                  ? (isHindi ? 'सक्षम कर रहे हैं...' : 'Enabling...')
                  : (isHindi ? 'चालू करें' : 'Allow')}
              </button>

              <button
                onClick={handleDismiss}
                disabled={status === 'requesting'}
                style={{
                  padding: '11px 16px',
                  borderRadius: 10,
                  border: '1.5px solid #d1d5db',
                  background: '#f9fafb',
                  color: '#4b5563',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                }}
              >
                {isHindi ? 'बाद में' : 'Later'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
