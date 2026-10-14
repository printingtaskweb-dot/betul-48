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
import { getToken } from 'firebase/messaging';
import { messaging, VAPID_KEY, saveFCMTokenToSupabase } from '../lib/firebase';
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

    const refresh = async () => {
      try {
        const token = await getToken(messaging!, { vapidKey: VAPID_KEY });
        if (!token) return;
        const { error } = await saveFCMTokenToSupabase(token, user?.id);
        if (error) {
          console.warn('[FCM] Token refresh failed:', error);
        } else {
          console.log('[FCM] Token refreshed and saved.');
        }
      } catch (e) {
        console.warn('[FCM] Token refresh failed:', e);
      }
    };

    refresh();
  }, [user]);

  return null; // renders nothing
}
