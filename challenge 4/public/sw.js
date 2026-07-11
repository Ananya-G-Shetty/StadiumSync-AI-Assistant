const CACHE_NAME = 'stadiumsync-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/chat',
  '/map',
  '/amenities',
  '/schedule',
  '/manifest.json',
  '/globals.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install Event - Pre-cache essential pages & assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache and pre-cached core assets.');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Strategic Caching
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip POST requests (like API chats, Server Actions)
  if (event.request.method !== 'GET') {
    return;
  }

  // Network-First with Cache Fallback for dynamic pages/database API calls
  if (
    requestUrl.pathname.includes('/actions') ||
    requestUrl.pathname.includes('/api/') ||
    requestUrl.pathname === '/schedule' ||
    requestUrl.pathname === '/amenities'
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone response and store in cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If offline, check cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-First with Network Fallback for static assets (images, scripts, styles, layouts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache new static requests on the fly
        if (response.status === 200 && (
          event.request.url.includes('_next/static/') ||
          event.request.url.includes('/fonts/') ||
          event.request.url.includes('/icons/')
        )) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
