import { useState, useEffect, useCallback } from 'react';
import { onMessage, type MessagePayload } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { messaging, fetchAndRegisterFCMToken } from '../lib/firebase';

export interface FCMState {
  token: string | null;
  permission: NotificationPermission;
  loading: boolean;
  error: string | null;
  lastMessage: MessagePayload | null;
}

/**
 * useFCM — requests notification permission, retrieves the FCM device token,
 * saves it to Supabase `fcm_tokens` table, and listens for messages on both Native and Web platforms.
 */
export function useFCM(userId?: string | null): FCMState & { requestPermission: () => Promise<void> } {
  const [token, setToken]           = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<MessagePayload | null>(null);

  const requestPermission = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Native Mobile (Capacitor Android) Flow
    if (Capacitor.isNativePlatform()) {
      try {
        const permRes = await PushNotifications.requestPermissions();
        if (permRes.receive === 'granted') {
          setPermission('granted');
          const fcmToken = await fetchAndRegisterFCMToken(userId);
          if (fcmToken) {
            setToken(fcmToken);
          }
        } else {
          setPermission('denied');
          setError('Notification permission denied. Please allow notifications in Android settings.');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to request native notification permission.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. Web Browser Flow
    if (!messaging) {
      setError('Push notifications are not supported in this browser.');
      setLoading(false);
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Notification permission denied. Please allow notifications in your browser settings.');
        return;
      }
      const fcmToken = await fetchAndRegisterFCMToken(userId);
      if (fcmToken) {
        setToken(fcmToken);
      } else {
        setError('Could not get FCM token. Ensure the service worker is registered.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to register push notifications.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Listen for messages & check permission state
  useEffect(() => {
    // ── Native Mobile Setup ──
    if (Capacitor.isNativePlatform()) {
      const recListenerPromise = PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Native FCM] Foreground push received:', notification);
        setLastMessage({
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: notification.data,
        } as any);
      });

      const actionListenerPromise = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[Native FCM] Push action tapped:', action);
        const data = action.notification.data;
        if (data && data.url && typeof window !== 'undefined') {
          window.location.href = data.url;
        }
      });

      // Check current native permission
      PushNotifications.checkPermissions().then((status) => {
        if (status.receive === 'granted') {
          setPermission('granted');
          if (userId) {
            fetchAndRegisterFCMToken(userId).then((tok) => {
              if (tok) setToken(tok);
            });
          }
        } else if (status.receive === 'denied') {
          setPermission('denied');
        }
      }).catch(console.warn);

      return () => {
        recListenerPromise.then((h) => h.remove()).catch(console.warn);
        actionListenerPromise.then((h) => h.remove()).catch(console.warn);
      };
    }

    // ── Web Browser Setup ──
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Web foreground message:', payload);
      setLastMessage(payload);
      if (typeof window !== 'undefined' && Notification.permission === 'granted') {
        const title = payload.notification?.title || payload.data?.title || 'IMC Betul 311';
        const body = payload.notification?.body || payload.data?.body || '';
        const url = payload.data?.url || '/';

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/logo.png',
              badge: '/logo.png',
              data: { url },
              vibrate: [300, 100, 300],
            } as any);
          }).catch(() => {
            try {
              new Notification(title, { body, icon: '/logo.png' });
            } catch (e) {
              console.warn('[FCM] Notification fallback error:', e);
            }
          });
        } else {
          try {
            new Notification(title, { body, icon: '/logo.png' });
          } catch (e) {
            console.warn('[FCM] Notification fallback error:', e);
          }
        }
      }
    });

    return unsubscribe;
  }, [userId]);

  // Auto-register if permission already granted (Web only)
  useEffect(() => {
    if (Capacitor.isNativePlatform() || typeof window === 'undefined') return;
    setPermission(Notification.permission);
    if (Notification.permission === 'granted' && userId) {
      requestPermission();
    }
  }, [userId, requestPermission]);

  return { token, permission, loading, error, lastMessage, requestPermission };
}
