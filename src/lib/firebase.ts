import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, type Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyAdqMDHy_Uov0rPisb5WVnA-0ZbFD3tpnc',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'jila-betul.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'jila-betul',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'jila-betul.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '552918515736',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:552918515736:web:d15ce838af0398afa4036d',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || 'G-891CMNPMR2',
};

// Prevent duplicate app init during HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Messaging is only available in secure browser contexts (HTTPS / localhost)
let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && 'Notification' in window) {
  try {
    messaging = getMessaging(app);
  } catch {
    console.warn('[FCM] Messaging not supported in this browser context.');
  }
}

export { app, messaging };

/** Public VAPID key — used by the browser to subscribe to push */
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

/**
 * Saves or updates an FCM device token in Supabase fcm_tokens table.
 * Resilient against missing unique constraints on token.
 */
export async function saveFCMTokenToSupabase(
  token: string,
  userId?: string | null,
  platformOverride?: string
): Promise<{ error: any }> {
  try {
    const isNative = Capacitor.isNativePlatform();
    const platform = platformOverride || (isNative ? 'android' : 'web');
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 200) : (isNative ? 'Capacitor-Android' : '');

    // 1. Try checking if this token already exists
    const { data: existing } = await supabase
      .from('fcm_tokens')
      .select('id')
      .eq('token', token)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('fcm_tokens')
        .update({
          user_id: userId || null,
          platform,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.error('[FCM] Update error:', updateErr);
        return { error: updateErr };
      }
      return { error: null };
    }

    // 2. If not existing, insert
    const { error: insertErr } = await supabase
      .from('fcm_tokens')
      .insert({
        token,
        user_id: userId || null,
        platform,
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      });

    if (insertErr) {
      console.warn('[FCM] Insert error, attempting upsert fallback:', insertErr);
      const { error: upsertErr } = await supabase
        .from('fcm_tokens')
        .upsert(
          {
            token,
            user_id: userId || null,
            platform,
            user_agent: userAgent,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'token' }
        );
      if (upsertErr) {
        console.error('[FCM] Upsert fallback error:', upsertErr);
        return { error: upsertErr };
      }
    }

    return { error: null };
  } catch (e: any) {
    console.error('[FCM] saveFCMTokenToSupabase exception:', e);
    return { error: e };
  }
}

/**
 * Retrieves FCM token from Google (Native Android or Web) and saves it into Supabase.
 */
export async function fetchAndRegisterFCMToken(userId?: string | null): Promise<string | null> {
  // ── 1. Native Mobile (Capacitor Android) Push Flow ──
  if (Capacitor.isNativePlatform()) {
    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive !== 'granted') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') {
        console.warn('[Native FCM] Notification permission not granted:', permStatus.receive);
        return null;
      }

      return await new Promise<string | null>((resolve) => {
        let resolved = false;

        PushNotifications.addListener('registration', async (token) => {
          console.log('[Native FCM] Device token registered:', token.value);
          await saveFCMTokenToSupabase(token.value, userId, 'android');
          if (!resolved) {
            resolved = true;
            resolve(token.value);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('[Native FCM] Error during push registration:', error);
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        });

        PushNotifications.register();

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.warn('[Native FCM] Registration timed out waiting for token event.');
            resolve(null);
          }
        }, 10000);
      });
    } catch (nativeErr) {
      console.error('[Native FCM] Native registration exception:', nativeErr);
      return null;
    }
  }

  // ── 2. Standard Web Browser Flow ──
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[FCM] Push notifications not supported in this browser environment.');
    return null;
  }
  if (!messaging) {
    console.warn('[FCM] Firebase Messaging is not available.');
    return null;
  }

  try {
    let registration: ServiceWorkerRegistration | undefined;
    try {
      registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      }
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      console.warn('[FCM] ServiceWorker readiness check error:', swErr);
    }

    const options: Record<string, any> = {};
    if (registration) options.serviceWorkerRegistration = registration;
    if (VAPID_KEY && typeof VAPID_KEY === 'string' && VAPID_KEY.trim() !== '') {
      options.vapidKey = VAPID_KEY.trim();
    }

    let token: string | null = null;
    try {
      token = await getToken(messaging, options);
    } catch (optErr) {
      console.warn('[FCM] getToken with custom options failed, attempting registration fallback:', optErr);
      try {
        if (registration) {
          token = await getToken(messaging, { serviceWorkerRegistration: registration });
        } else {
          token = await getToken(messaging);
        }
      } catch (fallbackErr) {
        console.warn('[FCM] Registration fallback failed, attempting default getToken:', fallbackErr);
        token = await getToken(messaging);
      }
    }

    if (token) {
      console.log('[FCM] Successfully retrieved web token:', token);
      await saveFCMTokenToSupabase(token, userId, 'web');
      return token;
    }
  } catch (err) {
    console.error('[FCM] fetchAndRegisterFCMToken error:', err);
  }
  return null;
}
