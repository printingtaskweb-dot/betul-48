/**
 * FCMRegistrar
 * ─────────────────────────────────────────────────────────────
 * Invisible component – mounts once inside AuthProvider.
 * • Registers the Firebase service worker on page load for web.
 * • For native Android, checks permissions and registers token.
 * • If the user is logged in AND has already granted notification
 *   permission, silently refreshes/saves their FCM token.
 */
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { messaging, fetchAndRegisterFCMToken } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function FCMRegistrar() {
  const { user } = useAuth();

  /* ── Register service worker (Web only) ── */
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then(reg => console.log('[FCM] SW registered:', reg.scope))
      .catch(err => console.warn('[FCM] SW registration failed:', err));
  }, []);

  /* ── Auto-refresh token when permission already granted ── */
  useEffect(() => {
    // 1. Native Mobile (Capacitor Android)
    if (Capacitor.isNativePlatform()) {
      PushNotifications.checkPermissions()
        .then(status => {
          if (status.receive === 'granted') {
            fetchAndRegisterFCMToken(user?.id);
          }
        })
        .catch(console.warn);
      return;
    }

    // 2. Web Browser
    if (!messaging) return;
    if (typeof window === 'undefined') return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    fetchAndRegisterFCMToken(user?.id);
  }, [user]);

  return null; // renders nothing
}
