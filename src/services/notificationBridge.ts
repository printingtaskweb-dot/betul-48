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
 * Triggered on activity: when a complaint is created
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

  broadcastInAppAlert(alert);
  await triggerDeviceNotification(title, body, { ticketNumber, url: alert.url });
}

/**
 * Initializes real-time listener between website and APK
 * Handles:
 * 1. New Complaints (INSERT on complaints)
 * 2. Complaint Status Updates & Assignments (UPDATE on complaints)
 * 3. News Announcements (INSERT/UPDATE on local_news)
 * 4. Broadcast Notifications (INSERT on notification_log)
 */
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export function initNotificationBridge() {
  if (realtimeChannel) return;

  try {
    realtimeChannel = supabase
      .channel('betul:global-activity-bridge')
      // ── 1. New Complaint Created ──
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'complaints' },
        (payload: any) => {
          const newComplaint = payload.new;
          if (!newComplaint || !newComplaint.ticket_number) return;

          const myRecentTickets = (() => {
            try {
              const raw = localStorage.getItem('betul_my_complaints') || '[]';
              return (JSON.parse(raw) as any[]).map((c) => c.ticket_number);
            } catch {
              return [];
            }
          })();

          if (myRecentTickets.includes(newComplaint.ticket_number)) {
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
      // ── 2. Complaint Resolved / Verified / Assigned / Reassigned ──
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'complaints' },
        (payload: any) => {
          const oldC = payload.old;
          const newC = payload.new;
          if (!newC || !newC.ticket_number) return;

          const ticket = newC.ticket_number;

          // A. Status Changed to Resolved
          if (newC.status === 'resolved' && oldC?.status !== 'resolved') {
            const title = '✅ शिकायत का समाधान हुआ (Complaint Resolved)';
            const body = `शिकायत #${ticket} का समाधान सफलतापूर्वक कर दिया गया है।`;
            const alert: InAppAlert = {
              id: `alert-res-${ticket}-${Date.now()}`,
              title,
              message: body,
              type: 'complaint_updated',
              ticketNumber: ticket,
              url: `/track?ticket=${encodeURIComponent(ticket)}`,
              timestamp: Date.now(),
            };
            broadcastInAppAlert(alert);
            triggerDeviceNotification(title, body, { ticketNumber: ticket, url: alert.url });
          }
          // B. Status Changed to Verified
          else if (newC.status === 'verified' && oldC?.status !== 'verified') {
            const title = '🌟 समाधान सत्यापित (Resolution Verified)';
            const body = `शिकायत #${ticket} की जांच और समाधान को अंतिम रूप से सत्यापित कर दिया गया है।`;
            const alert: InAppAlert = {
              id: `alert-ver-${ticket}-${Date.now()}`,
              title,
              message: body,
              type: 'complaint_updated',
              ticketNumber: ticket,
              url: `/track?ticket=${encodeURIComponent(ticket)}`,
              timestamp: Date.now(),
            };
            broadcastInAppAlert(alert);
            triggerDeviceNotification(title, body, { ticketNumber: ticket, url: alert.url });
          }
          // C. Status Changed to In Progress
          else if (newC.status === 'in_progress' && oldC?.status !== 'in_progress') {
            const title = '🔧 कार्य प्रगति पर है (Work In Progress)';
            const body = `शिकायत #${ticket} पर फील्ड टीम द्वारा कार्यवाही शुरू की गई है।`;
            const alert: InAppAlert = {
              id: `alert-prog-${ticket}-${Date.now()}`,
              title,
              message: body,
              type: 'complaint_updated',
              ticketNumber: ticket,
              url: `/track?ticket=${encodeURIComponent(ticket)}`,
              timestamp: Date.now(),
            };
            broadcastInAppAlert(alert);
            triggerDeviceNotification(title, body, { ticketNumber: ticket, url: alert.url });
          }
          // D. Task Allocated / Reassigned to Staff or Department
          else if (
            (newC.assigned_to && newC.assigned_to !== oldC?.assigned_to) ||
            (newC.department_id && oldC?.department_id && newC.department_id !== oldC?.department_id)
          ) {
            const title = '📋 कार्य आवंटित हुआ (Task Allocated)';
            const body = `शिकायत #${ticket} का कार्य संबंधित अधिकारी/वार्ड को आवंटित/पुनः आवंटित किया गया है।`;
            const alert: InAppAlert = {
              id: `alert-assign-${ticket}-${Date.now()}`,
              title,
              message: body,
              type: 'complaint_updated',
              ticketNumber: ticket,
              url: `/track?ticket=${encodeURIComponent(ticket)}`,
              timestamp: Date.now(),
            };
            broadcastInAppAlert(alert);
            triggerDeviceNotification(title, body, { ticketNumber: ticket, url: alert.url });
          }
        }
      )
      // ── 3. New Municipal News Added ──
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'local_news' },
        (payload: any) => {
          const news = payload.new;
          if (!news || !news.title) return;
          if (news.status && news.status !== 'approved') return;

          const title = '📰 नई सूचना / समाचार (New Municipal Update)';
          const body = news.title.length > 70 ? `${news.title.substring(0, 67)}...` : news.title;
          const alert: InAppAlert = {
            id: `alert-news-${news.id || Date.now()}`,
            title,
            message: body,
            type: 'info',
            url: '/news',
            timestamp: Date.now(),
          };
          broadcastInAppAlert(alert);
          triggerDeviceNotification(title, body, { url: '/news' });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'local_news' },
        (payload: any) => {
          const oldNews = payload.old;
          const newNews = payload.new;
          if (!newNews || !newNews.title) return;
          // Trigger when approved
          if (newNews.status === 'approved' && oldNews?.status !== 'approved') {
            const title = '📰 स्वीकृत समाचार (Published Update)';
            const body = newNews.title.length > 70 ? `${newNews.title.substring(0, 67)}...` : newNews.title;
            const alert: InAppAlert = {
              id: `alert-news-app-${newNews.id || Date.now()}`,
              title,
              message: body,
              type: 'info',
              url: '/news',
              timestamp: Date.now(),
            };
            broadcastInAppAlert(alert);
            triggerDeviceNotification(title, body, { url: '/news' });
          }
        }
      )
      // ── 4. Broadcast Notification Center ──
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
