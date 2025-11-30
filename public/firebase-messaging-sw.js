// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// This will be replaced with actual config from environment
firebase.initializeApp({
  apiKey: "AIzaSyCOdYl83hq2gOIBQc72AFQHG2WjlPkgJmI",
  authDomain: "gorev-app-a2e47.firebaseapp.com",
  projectId: "gorev-app-a2e47",
  storageBucket: "gorev-app-a2e47.firebasestorage.app",
  messagingSenderId: "1081003098799",
  appId: "1:1081003098799:web:35d5ffd3e06fb1ba0f4ca0"
});

const messaging = firebase.messaging();

// In-memory deduplication: track last shown notification
let lastNotification = {
  title: null,
  body: null,
  timestamp: 0
};

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Yeni Bildirim';
  const notificationBody = payload.notification?.body || '';
  const currentTime = Date.now();

  // Check if this is a duplicate notification
  const isDuplicate = 
    lastNotification.title === notificationTitle &&
    lastNotification.body === notificationBody &&
    (currentTime - lastNotification.timestamp) < 3000; // 3 seconds

  if (isDuplicate) {
    console.log('[firebase-messaging-sw.js] Duplicate notification detected (same title/body within 3s) - ignoring');
    return Promise.resolve();
  }

  // Update last notification info
  lastNotification = {
    title: notificationTitle,
    body: notificationBody,
    timestamp: currentTime
  };

  const notificationOptions = {
    body: notificationBody,
    icon: '/logogorev.png',
    badge: '/logogorev.png',
    data: payload.data,
  };

  console.log('[firebase-messaging-sw.js] Showing notification:', notificationTitle);
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  event.notification.close();

  const noteId = event.notification.data?.noteId;
  const url = noteId ? `/?note=${noteId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
