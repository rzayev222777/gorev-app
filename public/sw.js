importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAmiC-_61mzpWRwukPXPx1-5yV398aPBuA",
  authDomain: "gorev-2a82b.firebaseapp.com",
  projectId: "gorev-2a82b",
  storageBucket: "gorev-2a82b.firebasestorage.app",
  messagingSenderId: "230660017730",
  appId: "1:230660017730:web:08213f5da34d994e2f67db"
});

const messaging = firebase.messaging();
const SW_INSTANCE_ID = Math.random().toString(36).substr(2, 9);
const channel = new BroadcastChannel('fcm-notifications');
const shownNotifications = new Set();

console.log(`[SW-${SW_INSTANCE_ID}] Initialized`);

self.addEventListener('install', (event) => {
  console.log(`[SW-${SW_INSTANCE_ID}] Installing...`);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[SW-${SW_INSTANCE_ID}] Activating...`);
  event.waitUntil(self.clients.claim());
});

channel.onmessage = (event) => {
  if (event.data.type === 'NOTIFICATION_SHOWN') {
    console.log(`[SW-${SW_INSTANCE_ID}] Got broadcast: ${event.data.key} shown by ${event.data.sender}`);
    shownNotifications.add(event.data.key);
  }
};

messaging.onBackgroundMessage((payload) => {
  console.log(`[SW-${SW_INSTANCE_ID}] FCM received:`, payload);

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationBody = payload.notification?.body || '';
  const dedupeKey = `${notificationTitle}|${notificationBody}`;

  if (shownNotifications.has(dedupeKey)) {
    console.warn(`[SW-${SW_INSTANCE_ID}] Already shown by another SW - SKIP`);
    return Promise.resolve();
  }

  shownNotifications.add(dedupeKey);

  channel.postMessage({
    type: 'NOTIFICATION_SHOWN',
    key: dedupeKey,
    sender: SW_INSTANCE_ID
  });

  setTimeout(() => shownNotifications.delete(dedupeKey), 5000);

  const notificationOptions = {
    body: notificationBody,
    icon: '/logogorev.png',
    badge: '/logogorev.png',
    tag: `notif-${Date.now()}`,
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  console.log(`[SW-${SW_INSTANCE_ID}] SHOWING:`, notificationTitle);
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const noteId = event.notification.data.noteId;
  const url = noteId ? `/note/${noteId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
