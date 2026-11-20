import React, { useState, useEffect } from 'react';
import { BellRing, X, CheckCircle2, Share, PlusSquare } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { fetchAndRegisterFCMToken } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { triggerDeviceNotification } from '../services/notificationBridge';

export const NotificationPrompt: React.FC = () => {
  const { user, language } = useAuth();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'already_active' | 'denied'>('idle');
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  const checkPermissionGranted = async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await PushNotifications.checkPermissions();
        return perm.receive === 'granted';
      } catch {
        return false;
      }
    }
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (isIOS && !isStandalone) {
      setIsIOSDevice(true);
    }

    // Handler when user taps the navbar bell icon
    const openHandler = async () => {
      const isGranted = await checkPermissionGranted();
      if (isGranted) {
        setStatus('already_active');
      } else {
        setStatus('idle');
      }
      setShow(true);
    };

    window.addEventListener('betul:open-notifications', openHandler);

    // Initial visit check: only auto-show if NOT already granted
    let timer: number | undefined;
    checkPermissionGranted().then((alreadyGranted) => {
      if (!alreadyGranted) {
        timer = window.setTimeout(() => {
          setShow(true);
        }, 1200);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('betul:open-notifications', openHandler);
    };
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('imc_fcm_prompt_dismissed', Date.now().toString());
  };

  const handleAllow = async () => {
    setStatus('requesting');

    try {
      // ── 1. Native Mobile (Capacitor Android) ──
      if (Capacitor.isNativePlatform()) {
        const permRes = await PushNotifications.requestPermissions();
        if (permRes.receive === 'granted') {
          setStatus('granted');
          localStorage.removeItem('imc_fcm_prompt_dismissed');

          try {
            await fetchAndRegisterFCMToken(user?.id);
          } catch (fcmErr) {
            console.warn('[Native FCM] Token registration deferred:', fcmErr);
          }

          // Trigger confirmation device notification
          await triggerDeviceNotification(
            language === 'hi' ? '🔔 सूचनाएं चालू हो गईं' : '🔔 Notifications Enabled',
            language === 'hi'
              ? 'नगर पालिका बैतूल के अपडेट आपके डिवाइस पर प्राप्त होंगे।'
              : 'You will now receive Betul 311 alerts on this device.'
          );

          setTimeout(() => {
            setShow(false);
          }, 2000);
        } else {
          setStatus('denied');
          handleDismiss();
        }
        return;
      }

      // ── 2. Web Browser ──
      if (typeof Notification === 'undefined') {
        alert(language === 'hi' ? 'इस डिवाइस पर पुश नोटिफिकेशन समर्थित नहीं है।' : 'Push notifications are not supported on this device.');
        setStatus('idle');
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        setStatus('granted');
        localStorage.removeItem('imc_fcm_prompt_dismissed');

        try {
          await fetchAndRegisterFCMToken(user?.id);
        } catch (fcmErr) {
          console.warn('[FCM] Token registration deferred:', fcmErr);
        }

        await triggerDeviceNotification(
          language === 'hi' ? '🔔 सूचनाएं चालू हो गईं' : '🔔 Notifications Enabled',
          language === 'hi'
            ? 'नगर पालिका बैतूल के अपडेट आपके ब्राउज़र पर प्राप्त होंगे।'
            : 'You will now receive Betul 311 alerts on this browser.'
        );

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

        {status === 'already_active' ? (
          /* When clicked from Navbar and already granted */
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <CheckCircle2 size={42} color="#059669" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#059669', marginBottom: 2 }}>
              {isHindi ? 'सक्रिय स्थिति' : 'Active Status'}
            </div>
            <h4 style={{ margin: '0 0 6px', color: '#065f46', fontSize: '1.05rem', fontWeight: 800 }}>
              {isHindi ? 'पुश सूचनाएं सक्रिय हैं' : 'Push Notifications are Active'}
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.45 }}>
              {isHindi
                ? 'यह डिवाइस नगर पालिका बैतूल के अपडेट और अलर्ट प्राप्त करने के लिए कनेक्टेड है।'
                : 'This device is successfully connected to receive instant Betul municipal alerts.'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={async () => {
                  await triggerDeviceNotification(
                    isHindi ? '🔔 टेस्ट अलर्ट (Test Alert)' : '🔔 Betul 311 Test Alert',
                    isHindi ? 'सूचना प्रणाली पूर्ण रूप से कार्यरत है।' : 'Push notification system is working perfectly!'
                  );
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #146C94, #0E526F)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(20, 108, 148, 0.25)',
                }}
              >
                <BellRing size={15} />
                <span>{isHindi ? 'टेस्ट अलर्ट बजाएं' : 'Play Test Alert'}</span>
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1.5px solid #d1d5db',
                  background: '#f9fafb',
                  color: '#4b5563',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                {isHindi ? 'ठीक है' : 'OK'}
              </button>
            </div>
          </div>
        ) : status === 'granted' ? (
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
          /* Standard Flow */
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
