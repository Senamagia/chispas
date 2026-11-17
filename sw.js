// Chispas · funciona sin cobertura y recibe avisos aunque la app esté cerrada.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js', 'firebase-config.js');
firebase.initializeApp(FIREBASE_CONFIG);
firebase.messaging(); // muestra solo los avisos que llegan con la app cerrada
const CACHE = 'chispas-v0.5.3';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'materiales.js', 'herramientas.js', 'presupuesto.js', 'plano.js', 'sencilla.js', 'puentes.js', 'consumo.js', 'ayuda.js', 'cloud.js', 'firebase-config.js', 'logo.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/badge-96.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request, new URL(e.request.url).origin === location.origin ? { cache: 'no-cache' } : {}).then((r) => { const u = new URL(e.request.url); if (r.ok && (u.origin === location.origin || u.host === 'www.gstatic.com' || u.host === 'cdn.jsdelivr.net')) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
// Al tocar un aviso, abre la app
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => cs[0] ? cs[0].focus() : self.clients.openWindow(e.notification.data?.FCM_MSG?.fcmOptions?.link || './#inicio'))); });
