// FORGE Timer Service Worker
// Schedules lock-screen notifications — but ONLY fires them when the page
// is hidden. If the page is foreground, the page itself handles UX
// (ring, beep, vibrate) and the SW stays silent. This prevents duplicate
// notifications when both fire near-simultaneously.

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

let timerTimeout = null;

// Helper: are any of our windows currently visible to the user?
async function isAnyClientVisible() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return clients.some(c => c.visibilityState === 'visible');
}

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'TIMER_START') {
    // Cancel any existing scheduled notification
    if (timerTimeout) clearTimeout(timerTimeout);
    // Schedule notification from SW thread (independent of page JS)
    const ms = (e.data.duration || 90) * 1000;
    timerTimeout = setTimeout(async () => {
      timerTimeout = null;
      // Only fire the notification if NO window is currently visible.
      // If the user is looking at the app, the page itself will handle
      // the alert (ring + beep + vibrate). Firing a notification on top
      // of that creates the duplicate.
      const visible = await isAnyClientVisible();
      if (visible) {
        // Page is foreground — let it handle everything. Stay silent.
        return;
      }
      self.registration.showNotification('FORGE', {
        body: 'Rest over — next set',
        icon: 'https://forgetraining.app/icon-192.png',
        tag: 'forge-timer',
        renotify: false,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        silent: false
      });
    }, ms);
  }

  if (e.data.type === 'TIMER_CANCEL') {
    if (timerTimeout) { clearTimeout(timerTimeout); timerTimeout = null; }
  }

  // Fallback: page can still request immediate notification (used only
  // when page knows it's about to lose focus and wants the SW to take over).
  if (e.data.type === 'TIMER_DONE') {
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
