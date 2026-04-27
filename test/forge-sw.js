// FORGE Timer Service Worker — DIAGNOSTIC BUILD
// Same logic as production, with console.log lines so we can see what's
// happening on iOS. Once the bug is identified, strip the logs back out.

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

let timerTimeout = null;

async function isAnyClientVisible() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return clients.some(c => c.visibilityState === 'visible');
}

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'TIMER_START') {
    console.log('[SW] TIMER_START received, duration:', e.data.duration);
    if (timerTimeout) clearTimeout(timerTimeout);
    const ms = (e.data.duration || 90) * 1000;
    timerTimeout = setTimeout(async () => {
      console.log('[SW] timeout fired');
      timerTimeout = null;
      const visible = await isAnyClientVisible();
      console.log('[SW] visible check:', visible);
      if (visible) {
        console.log('[SW] page visible, skipping notification');
        return;
      }
      console.log('[SW] page hidden, firing notification');
      try {
        await self.registration.showNotification('FORGE', {
          body: 'Rest over — next set',
          icon: 'https://forgetraining.app/icon-192.png',
          tag: 'forge-timer',
          renotify: false,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          silent: false
        });
        console.log('[SW] showNotification resolved');
      } catch (err) {
        console.error('[SW] showNotification threw:', err);
      }
    }, ms);
  }

  if (e.data.type === 'TIMER_CANCEL') {
    console.log('[SW] TIMER_CANCEL received');
    if (timerTimeout) { clearTimeout(timerTimeout); timerTimeout = null; }
  }

  if (e.data.type === 'TIMER_DONE') {
    console.log('[SW] TIMER_DONE received');
    if (timerTimeout) { clearTimeout(timerTimeout); timerTimeout = null; }
    self.registration.showNotification('FORGE', {
      body: 'Rest over — next set',
      icon: 'https://forgetraining.app/icon-192.png',
      tag: 'forge-timer',
      renotify: false,
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
