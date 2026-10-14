// firebase-messaging-sw.js
// Place this file in the /public folder so it is served at the root.
// This service worker handles FCM background push notifications.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyBHfEU3SdN4bZQzdOVo6L9aPwErHBanHI4',
  authDomain:        'printing-task-78a01.firebaseapp.com',
  projectId:         'printing-task-78a01',
  storageBucket:     'printing-task-78a01.firebasestorage.app',
  messagingSenderId: '436690225125',
  appId:             '1:436690225125:web:ff11ddf8cc4fe55442910c',
  measurementId:     'G-K57MSQ3YBN',
});

const messaging = firebase.messaging();

// Handle background notifications (when tab is closed / app not focused)
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message received:', payload);

  // When a message contains a 'notification' payload, Firebase SDK automatically
  // displays it. Avoid calling self.registration.showNotification to prevent double notifications.
  if (payload.notification) {
    return;
  }

  // Only display manually for data-only messages
  const title = payload.data?.title || 'IMC Betul';
  const body = payload.data?.body || '';
  const url = payload.data?.url || '/';
  const icon = '/logo.png';

  self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    data: { url },
    vibrate: [300, 100, 300],
    tag: 'imc-betul',
    renotify: false,
  });
});

// Clicking the notification opens the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
