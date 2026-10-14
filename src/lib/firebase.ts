import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyBHfEU3SdN4bZQzdOVo6L9aPwErHBanHI4',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'printing-task-78a01.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'printing-task-78a01',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'printing-task-78a01.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '436690225125',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:436690225125:web:ff11ddf8cc4fe55442910c',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || 'G-K57MSQ3YBN',
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
export const VAPID_KEY =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BFFLuQMQRMh679lJ4Hfa9DTZrzUhcbc4Q7JaepHr64JKmydWIAfv6vSYv42cS0QFmIn5_zIU4MF692yCuZiLBVs';

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

