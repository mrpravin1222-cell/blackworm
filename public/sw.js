const CACHE_NAME = 'blackworm-enterprise-v4';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/blackworm-logo.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Do not intercept Firebase / Firestore real-time websockets or API endpoints
  if (
    url.origin.includes('firestore') ||
    url.origin.includes('firebase') ||
    url.origin.includes('googleapis') ||
    url.pathname.includes('/api/')
  ) {
    return;
  }

  // Navigation requests: try network first, then cache, then fallback index.html
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          
          // Custom fallback response if offline and nothing in cache
          return new Response(
            `<!DOCTYPE html>
            <html lang="mr">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>इंटरनेट एरर - ब्लॅकवर्म ॲग्रिटेक</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #fff; margin:0; padding: 20px; display:flex; height:100vh; align-items:center; justify-content:center; text-align:center; }
                .card { background: #1e293b; padding: 32px 24px; border-radius: 24px; max-width: 360px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; }
                .icon { width: 64px; height: 64px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 28px; }
                h1 { font-size: 20px; font-weight: 800; margin: 0 0 10px; color: #f87171; }
                p { font-size: 14px; color: #94a3b8; margin: 0 0 24px; line-height: 1.5; }
                button { background: #dc2626; color: white; border: none; padding: 14px 24px; border-radius: 14px; font-size: 15px; font-weight: 700; width: 100%; cursor: pointer; }
                button:active { transform: scale(0.98); }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">⚠️</div>
                <h1>इंटरनेट नेटवर्क एरर</h1>
                <p>कृपया तुमचे इंटरनेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.</p>
                <button onclick="window.location.reload()">पुन्हा प्रयत्न करा</button>
              </div>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Network-first with cache fallback for static JS/CSS assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
