
const CACHE_NAME = 'palmcasia-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json'
];

const IMAGE_CACHE = 'palmcasia-images-v1';
const API_CACHE = 'palmcasia-api-v1';

// Cache duration in seconds
const API_CACHE_DURATION = 300; // 5 minutes
const IMAGE_CACHE_DURATION = 86400; // 24 hours

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(IMAGE_CACHE),
      caches.open(API_CACHE)
    ])
  );
});

function shouldCache(url) {
  // Add patterns for URLs that should be cached
  const cachePatterns = [
    '/api/market-data',
    '/api/stocks',
    '/images/'
  ];
  return cachePatterns.some(pattern => url.includes(pattern));
}

async function handleApiRequest(request, cache) {
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const cachedAt = cachedResponse.headers.get('cached-at');
    if (cachedAt && Date.now() - new Date(cachedAt).getTime() < API_CACHE_DURATION * 1000) {
      return cachedResponse;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok && shouldCache(request.url)) {
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.append('cached-at', new Date().toISOString());
      
      const cachedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }
    return response;
  } catch (error) {
    return cachedResponse || new Response('Network error', { status: 408 });
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle image caching
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => response);
          return response || fetchPromise;
        });
      })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(cache => 
        handleApiRequest(event.request, cache)
      )
    );
    return;
  }

  // Handle other requests
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      });
    })
  );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && 
                            name !== IMAGE_CACHE && 
                            name !== API_CACHE)
            .map((name) => caches.delete(name))
        );
      }),
      // Clean up expired items from API cache
      caches.open(API_CACHE).then(async (cache) => {
        const requests = await cache.keys();
        return Promise.all(
          requests.map(async (request) => {
            const response = await cache.match(request);
            const cachedAt = response?.headers.get('cached-at');
            if (cachedAt && Date.now() - new Date(cachedAt).getTime() > API_CACHE_DURATION * 1000) {
              return cache.delete(request);
            }
          })
        );
      })
    ])
  );
});

// Handle offline functionality
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Handle background sync
      Promise.resolve()
    );
  }
});
