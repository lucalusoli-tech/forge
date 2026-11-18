// FORGE service worker — notifications only. No fetch handler, no caching (by design).
//
// Two ways a rest alert reaches the lock screen:
//  1. PUSH (main path): the server sends a Web Push when the rest ends. Reliable on iPhone
//     with FORGE installed to the home screen, and on Android.
//  2. LOCAL TIMER (fallback, when push isn't set up): the page posts TIMER_START and this worker
//     counts down itself. iOS pauses this once the app is in the background, which is why push exists.

const REST_TAG = 'forge-rest';
let localTimer = null;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function tellPagesFired() {
  const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  pages.forEach((c) => c.postMessage({ type: 'TIMER_SW_FIRED' }));
}

function showRest(title, body) {
  return self.registration.showNotification(title || 'Rest over', {
    body: body || 'Time for your next set',
    tag: REST_TAG,          // one rest alert at a time — a newer one replaces the old
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    data: { url: './' },
  });
}

// ── 1. Server push ──
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  // Safari requires every push to show a notification, so this always shows one.
  event.waitUntil(Promise.all([showRest(data.title, data.body), tellPagesFired()]));
});

// ── 2. Local countdown fallback ──
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'TIMER_START') {
    clearTimeout(localTimer);
    const ms = Math.max(1, Number(msg.duration) || 90) * 1000;
    localTimer = setTimeout(async () => {
      localTimer = null;
      const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const onScreen = pages.some((c) => c.visibilityState === 'visible');
      if (!onScreen) await showRest(); // the page handles its own alert when it's open on screen
      tellPagesFired();
    }, ms);
  } else if (msg.type === 'TIMER_CANCEL') {
    clearTimeout(localTimer);
    localTimer = null;
  }
});

// ── Tap on the notification: back into FORGE ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = pages.find((c) => 'focus' in c);
    if (open) return open.focus();
    return self.clients.openWindow((event.notification.data && event.notification.data.url) || './');
  })());
});
