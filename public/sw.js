/* Ayzal Kidz Care Hospital — app-shell service worker */
const CACHE = 'ayzal-shell-v3';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/splash.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isApi(url) {
  return url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co');
}

function isAsset(url) {
  return /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|gif|ico)$/i.test(url.pathname)
    || url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/icons/')
    || url.pathname.startsWith('/images/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.g') && !url.hostname.includes('gstatic.com')) {
    return;
  }

  if (isApi(url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then((c) => c || caches.match('/')))
    );
    return;
  }

  if (isAsset(url) || url.hostname.includes('fonts.g') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networked = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || networked;
      })
    );
  }
});
