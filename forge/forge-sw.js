// FORGE Timer Service Worker
// Handles lock-screen notifications for rest timer

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'TIMER_DONE') {
    self.registration.showNotification('FORGE', {
      body: 'Rest over — next set',
      icon: 'https://forgetraining.app/icon-192.png',
      tag: 'forge-timer',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      silent: false
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(cls => {
      if (cls.length > 0) { cls[0].focus(); } else { self.clients.openWindow('/'); }
    })
  );
});
