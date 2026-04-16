// FORGE Timer Service Worker
// Schedules lock-screen notifications independently from page JS

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

let timerTimeout = null;

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'TIMER_START') {
    // Cancel any existing scheduled notification
    if (timerTimeout) clearTimeout(timerTimeout);
    // Schedule notification from SW thread (independent of page JS)
    const ms = (e.data.duration || 90) * 1000;
    timerTimeout = setTimeout(async () => {
      timerTimeout = null;
      // Notify all clients that SW fired — prevents page from double-firing on resume
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => client.postMessage({ type: 'TIMER_SW_FIRED' }));
      self.registration.showNotification('FORGE', {
        body: 'Rest over — next set',
        icon: 'https://forgetraining.app/icon-192.png',
        tag: 'forge-timer',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        silent: false
      });
    }, ms);
  }

  if (e.data.type === 'TIMER_CANCEL') {
    if (timerTimeout) { clearTimeout(timerTimeout); timerTimeout = null; }
  }

  // Fallback: page can still request immediate notification
  if (e.data.type === 'TIMER_DONE') {
    if (timerTimeout) { clearTimeout(timerTimeout); timerTimeout = null; }
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
