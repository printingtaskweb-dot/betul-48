import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, type Messaging } from 'firebase/messaging';

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
    console.warn('[FCM] Messaging not supported in this context.');
  }
}

export { app, messaging };

/** Public VAPID key — used by the browser to subscribe to push */
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

import { supabase } from './supabase';

/**
 * Saves or updates an FCM device token in Supabase fcm_tokens table.
 * Resilient against missing unique constraints on token.
 */
export async function saveFCMTokenToSupabase(token: string, userId?: string | null): Promise<{ error: any }> {
  try {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 200) : '';

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
          platform: 'web',
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
        platform: 'web',
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
            platform: 'web',
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
 * Retrieves FCM token from Google and saves it into Supabase.
 * Handles service worker readiness and VAPID key fallbacks safely.
 */
export async function fetchAndRegisterFCMToken(userId?: string | null): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[FCM] Push notifications not supported in this environment.');
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
      console.log('[FCM] Successfully retrieved token:', token);
      await saveFCMTokenToSupabase(token, userId);
      return token;
    }
  } catch (err) {
    console.error('[FCM] fetchAndRegisterFCMToken error:', err);
  }
  return null;
}

