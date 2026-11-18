/**
 * FCMRegistrar
 * ─────────────────────────────────────────────────────────────
 * Invisible component – mounts once inside AuthProvider.
 * • Registers the Firebase service worker on page load.
 * • If the user is logged in AND has already granted notification
 *   permission, silently refreshes/saves their FCM token.
 * • Does NOT show any UI – permission prompt is only shown when
 *   the user explicitly clicks "Enable Notifications" elsewhere.
 */
import { useEffect } from 'react';
import { messaging, fetchAndRegisterFCMToken } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function FCMRegistrar() {
  const { user } = useAuth();

  /* ── Register service worker ── */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then(reg => console.log('[FCM] SW registered:', reg.scope))
      .catch(err => console.warn('[FCM] SW registration failed:', err));
  }, []);

  /* ── Auto-refresh token when permission already granted ── */
  useEffect(() => {
    if (!messaging) return;
    if (typeof window === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    fetchAndRegisterFCMToken(user?.id);
  }, [user]);

  return null; // renders nothing
}
