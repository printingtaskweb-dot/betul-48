import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, X, ExternalLink, CheckCircle } from 'lucide-react';
import { subscribeToInAppAlerts, initNotificationBridge, type InAppAlert } from '../services/notificationBridge';

export const LiveAlertToast: React.FC = () => {
  const [currentAlert, setCurrentAlert] = useState<InAppAlert | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Start the realtime bridge listener
    initNotificationBridge();

    const unsubscribe = subscribeToInAppAlerts((alert) => {
      setCurrentAlert(alert);

      // Auto dismiss after 7 seconds
      const timer = setTimeout(() => {
        setCurrentAlert((prev) => (prev?.id === alert.id ? null : prev));
      }, 7000);

      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  if (!currentAlert) return null;

  const isSuccess = currentAlert.type === 'complaint_created' && currentAlert.title.includes('दर्ज');

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: '12px',
        right: '12px',
        zIndex: 9999999,
        maxWidth: '460px',
        margin: '0 auto',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          background: isSuccess ? '#064e3b' : '#0f2f3f',
          color: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2)',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          backdropFilter: 'blur(8px)',
          animation: 'slideDownToast 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes slideDownToast {
            from { transform: translateY(-40px); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
          }
          @keyframes toastPulse {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.15); }
          }
        `}</style>

        {/* Icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: isSuccess ? 'rgba(16, 185, 129, 0.25)' : 'rgba(14, 165, 233, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {isSuccess ? (
            <CheckCircle size={20} color="#34d399" />
          ) : (
            <BellRing size={20} color="#38bdf8" style={{ animation: 'toastPulse 1.8s infinite ease-in-out' }} />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.25 }}>
              {currentAlert.title}
            </h4>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>अभी (Just now)</span>
          </div>

          <p style={{ margin: '4px 0 8px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.35 }}>
            {currentAlert.message}
          </p>

          {currentAlert.ticketNumber && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => {
                  const url = currentAlert.url || `/track?ticket=${encodeURIComponent(currentAlert.ticketNumber!)}`;
                  setCurrentAlert(null);
                  navigate(url);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>ट्रैक करें (Track Ticket)</span>
                <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setCurrentAlert(null)}
          aria-label="Dismiss alert"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
