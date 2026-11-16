// Chispas · funciona sin cobertura: guarda la app en el móvil.
const CACHE = 'chispas-v0.1.0';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'logo.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/badge-96.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && new URL(e.request.url).origin === location.origin) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
// Al tocar un aviso, abre la app
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => cs[0] ? cs[0].focus() : self.clients.openWindow('./#inicio'))); });
