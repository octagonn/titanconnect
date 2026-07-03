// Minimal service worker: makes the app installable as a PWA.
// Network-first passthrough — no offline caching, so deploys are always fresh.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
