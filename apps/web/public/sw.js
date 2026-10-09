// Diabeto Service Worker - Offline & Shell Caching
const CACHE_NAME = 'diabeto-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
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
  const request = event.request;
  
  // Guard 1: Only handle http: and https: protocols (skip chrome-extension://, ws://, etc.)
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return;
  }

  // Guard 2: Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Guard 3: Skip Vite development HMR and websocket ping requests
  if (url.pathname.includes('@vite') || url.pathname.includes('@fs') || url.search.includes('token=') || url.pathname.includes('node_modules')) {
    return;
  }

  // For API / Supabase requests: Network first with graceful offline fallback
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/v1') || url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline mode: network request unavailable.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // For navigation / static page requests: Cache first then network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try {
              if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
                cache.put(request, responseToCache).catch(() => {});
              }
            } catch (err) {
              // Silently ignore cache put failures for unsupported schemes
            }
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
