import React, { useState, useEffect } from 'react';
import { BellRing, X, CheckCircle2 } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { messaging, VAPID_KEY, saveFCMTokenToSupabase } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * NotificationPrompt
 * ─────────────────────────────────────────────────────────────
 * Interactive floating popup shown to users on their first visit.
 * • Triggers browser notification permission upon clicking "Allow".
 * • Automatically obtains the FCM device token and saves it to Supabase.
 * • Supports both guest visitors and logged-in users.
 * • Remembers user dismissal so it doesn't bother them repeatedly.
 */
export const NotificationPrompt: React.FC = () => {
  const { user, language } = useAuth();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (!messaging) return;

    // If permission already decided in browser, do not show popup
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return;
    }

    // Check if dismissed recently (within last 3 days)
    const dismissedAt = localStorage.getItem('imc_fcm_prompt_dismissed');
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 3) return;
    }

    // Smooth entry after 1.8 seconds on page load
    const timer = setTimeout(() => {
      setShow(true);
    }, 1800);

    return () => clearTimeout(timer);
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
    <aside
      aria-label="Notification permission request"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        maxWidth: 390,
        width: 'calc(100vw - 32px)',
        zIndex: 99999,
        background: 'var(--theme-component, #ffffff)',
        borderRadius: 16,
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
        padding: '20px',
        animation: 'slideUpFCM 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'inherit',
      }}
    >
      <style>{`
        @keyframes slideUpFCM {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseFCM {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.1); }
        }
      `}</style>

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
          color: '#888',
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
      ) : (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #660033, #800040)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(102, 0, 51, 0.25)',
              }}
            >
              <BellRing size={22} style={{ animation: 'pulseFCM 2s infinite ease-in-out' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#660033' }}>
                {isHindi ? 'नगर पालिका बैतूल' : 'IMC Betul 311'}
              </div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#111827', lineHeight: 1.25 }}>
                {isHindi ? 'पुश सूचनाएं सक्षम करें?' : 'Enable Push Notifications?'}
              </h4>
            </div>
          </div>

          {/* Description */}
          <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.45 }}>
            {isHindi
              ? 'पानी की आपूर्ति, स्वच्छता, शिकायत की स्थिति और आपातकालीन नागरिक घोषणाओं की सूचनाएं तुरंत पाएं।'
              : 'Stay informed with instant updates on your complaint status, water supply schedules, and municipal announcements.'}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleAllow}
              disabled={status === 'requesting'}
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: 10,
                border: 'none',
                background: status === 'requesting' ? '#999' : 'linear-gradient(135deg, #660033, #800040)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: status === 'requesting' ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(102, 0, 51, 0.25)',
                transition: 'transform 0.15s, opacity 0.15s',
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
  );
};
