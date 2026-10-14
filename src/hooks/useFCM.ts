import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import { messaging, VAPID_KEY } from '../lib/firebase';
import { supabase } from '../lib/supabase';

export interface FCMState {
  token: string | null;
  permission: NotificationPermission;
  loading: boolean;
  error: string | null;
  lastMessage: MessagePayload | null;
}

/**
 * useFCM — requests notification permission, retrieves the FCM device token,
 * saves it to Supabase `fcm_tokens` table, and listens for foreground messages.
 */
export function useFCM(userId?: string | null): FCMState & { requestPermission: () => Promise<void> } {
  const [token, setToken]         = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<MessagePayload | null>(null);

  // Save / update the FCM token in Supabase
  const saveToken = useCallback(async (fcmToken: string) => {
    if (!userId) return;
    const userAgent = navigator.userAgent.substring(0, 200);
    await supabase.from('fcm_tokens').upsert(
      {
        user_id:    userId,
        token:      fcmToken,
        platform:   'web',
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );
  }, [userId]);

  const requestPermission = useCallback(async () => {
    if (!messaging) {
      setError('Push notifications are not supported in this browser.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Notification permission denied. Please allow notifications in your browser settings.');
        return;
      }
      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (fcmToken) {
        setToken(fcmToken);
        await saveToken(fcmToken);
      } else {
        setError('Could not get FCM token. Ensure the service worker is registered.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to register push notifications.');
    } finally {
      setLoading(false);
    }
  }, [saveToken]);

  // Listen for foreground messages (when app tab is open)
  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message:', payload);
      setLastMessage(payload);
      // Show a manual notification for foreground (service worker only handles background)
      if (Notification.permission === 'granted') {
        const { title = 'IMC Betul', body = '' } = payload.notification || {};
        new Notification(title, { body, icon: '/icon-192.png' });
      }
    });
    return unsubscribe;
  }, []);

  // Auto-register if permission already granted
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPermission(Notification.permission);
    if (Notification.permission === 'granted' && userId) {
      requestPermission();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { token, permission, loading, error, lastMessage, requestPermission };
}
