import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '../lib/supabase';

export interface InAppAlert {
  id: string;
  title: string;
  message: string;
  type: 'complaint_created' | 'complaint_updated' | 'broadcast' | 'info';
  ticketNumber?: string;
  url?: string;
  timestamp: number;
}

type AlertCallback = (alert: InAppAlert) => void;
const listeners = new Set<AlertCallback>();

export function subscribeToInAppAlerts(cb: AlertCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function broadcastInAppAlert(alert: InAppAlert) {
  listeners.forEach((cb) => {
    try {
      cb(alert);
    } catch (e) {
      console.warn('[NotificationBridge] Listener error:', e);
    }
  });
}

/** Play a subtle in-app audio chime using Web Audio API */
export function playAlertChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
}

/**
 * Triggers a native Android notification and/or browser notification
 */
export async function triggerDeviceNotification(title: string, body: string, data?: Record<string, any>) {
  playAlertChime();

  // 1. Native Mobile (Capacitor Android)
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      const notifId = Math.floor(Math.random() * 100000);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'beep.wav',
            extra: data || {},
          },
        ],
      });
      return;
    } catch (err) {
      console.warn('[NotificationBridge] Native local notification error:', err);
    }
  }

  // 2. Standard Web Browser
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        data,
      });
    } catch (e) {
      console.warn('[NotificationBridge] Web notification error:', e);
    }
  }
}

/**
 * Triggered on activity: e.g. when a complaint is created or status is updated
 */
export async function notifyComplaintActivity(params: {
  ticketNumber: string;
  departmentName?: string;
  address?: string | null;
  isSelfSubmission?: boolean;
}) {
  const { ticketNumber, departmentName, address, isSelfSubmission } = params;

  const title = isSelfSubmission
    ? '✅ शिकायत दर्ज हो गई (Complaint Registered)'
    : '📢 नई शिकायत प्राप्त हुई (New Grievance)';

  const body = isSelfSubmission
    ? `टिकट #${ticketNumber} बैतूल नगर पालिका को भेज दिया गया है।`
    : `टिकट #${ticketNumber} - ${departmentName || 'नगर निगम'}${address ? ` (${address.substring(0, 40)})` : ''}`;

  const alert: InAppAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    message: body,
    type: 'complaint_created',
    ticketNumber,
    url: `/track?ticket=${encodeURIComponent(ticketNumber)}`,
    timestamp: Date.now(),
  };

  // 1. In-App Banner/Toast
  broadcastInAppAlert(alert);

  // 2. Device Notification (Status bar & sound)
  await triggerDeviceNotification(title, body, { ticketNumber, url: alert.url });
}

/**
 * Initializes real-time listener between website and APK
 */
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export function initNotificationBridge() {
  if (realtimeChannel) return;

  try {
    realtimeChannel = supabase
      .channel('betul:complaints-bridge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'complaints' },
        (payload: any) => {
          const newComplaint = payload.new;
          if (!newComplaint || !newComplaint.ticket_number) return;

          // Check if this was submitted by current session
          const myRecentTickets = (() => {
            try {
              const raw = localStorage.getItem('betul_my_complaints') || '[]';
              return (JSON.parse(raw) as any[]).map((c) => c.ticket_number);
            } catch {
              return [];
            }
          })();

          if (myRecentTickets.includes(newComplaint.ticket_number)) {
            // Already alerted on submission
            return;
          }

          notifyComplaintActivity({
            ticketNumber: newComplaint.ticket_number,
            departmentName: 'नगर पालिका बैतूल',
            address: newComplaint.address,
            isSelfSubmission: false,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_log' },
        (payload: any) => {
          const log = payload.new;
          if (!log || !log.title) return;

          const alert: InAppAlert = {
            id: `alert-broadcast-${log.id || Date.now()}`,
            title: `📢 ${log.title}`,
            message: log.body || '',
            type: 'broadcast',
            url: log.url || '/',
            timestamp: Date.now(),
          };

          broadcastInAppAlert(alert);
          triggerDeviceNotification(`📢 ${log.title}`, log.body || '', { url: log.url });
        }
      )
      .subscribe((status) => {
        console.log('[NotificationBridge] Supabase Realtime status:', status);
      });
  } catch (err) {
    console.warn('[NotificationBridge] Init error:', err);
  }
}
