// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Basit duplicate önleyici: aynı title+body 3 sn içinde gelirse gösterme
let lastNotification = {
  title: null,
  body: null,
  time: 0,
};

function showDedupedNotification(title, options) {
  const body = options?.body || "";
  const now = Date.now();

  // İlk bildirim veya 3 saniyeden fazla geçmişse göster
  const isDuplicate = 
    lastNotification.title !== null &&
    lastNotification.title === title &&
    lastNotification.body === body &&
    (now - lastNotification.time) < 3000; // 3 saniye

  if (isDuplicate) {
    // Aynı bildirimi kısa sürede tekrar gösterme
    console.log('[firebase-messaging-sw.js] Duplicate notification ignored:', title);
    return Promise.resolve();
  }

  // Bildirimi göster ve son bildirimi kaydet
  lastNotification = { title, body, time: now };
  console.log('[firebase-messaging-sw.js] Showing notification:', title);
  return self.registration.showNotification(title, options);
}

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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Yeni Bildirim';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/logogorev.png',
    badge: '/logogorev.png',
    data: payload.data,
  };

  return showDedupedNotification(notificationTitle, notificationOptions);
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
