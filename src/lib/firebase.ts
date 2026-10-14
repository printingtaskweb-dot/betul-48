import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyCyNQwBfihfjul7B8ssPoahIzNDRIwvFnQ',
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
