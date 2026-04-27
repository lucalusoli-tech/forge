// FORGE Timer Service Worker — DIAGNOSTIC: hardcoded 2s timeout
// Ignores duration from page. Always fires after 2 seconds.
// Purpose: isolate whether the bug is "iOS suspends SW after long wait"
// vs "something about setTimeout context drops the notification."

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
    console.log('[SW] TIMER_START received, IGNORING duration, using 2s');
    if (timerTimeout) clearTimeout(timerTimeout);
    timerTimeout = setTimeout(async () => {
      console.log('[SW] timeout fired (2s)');
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
    }, 2000); // <-- HARDCODED 2 SECONDS
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
