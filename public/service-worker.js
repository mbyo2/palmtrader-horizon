const CACHE_NAME = 'palmcasia-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html'
];

const IMAGE_CACHE = 'palmcasia-images-v1';
const API_CACHE = 'palmcasia-api-v1';

// Cache duration in seconds
const API_CACHE_DURATION = 300; // 5 minutes
const IMAGE_CACHE_DURATION = 86400; // 24 hours

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(IMAGE_CACHE),
      caches.open(API_CACHE)
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
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
      }),
      self.clients.claim()
    ])
  );
});

function shouldCache(url) {
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

  // Handle navigation requests (SPA routing)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
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

// Enhanced background sync for trading orders
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  if (event.tag === 'sync-portfolio-data') {
    event.waitUntil(syncPortfolioData());
  } else if (event.tag === 'sync-trade-orders') {
    event.waitUntil(syncTradeOrders());
  } else if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Enhanced push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    requireInteraction: true,
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-192.png'
      }
    ]
  };

  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error('Error parsing push notification data:', error);
    }
  }

  const title = notificationData.title || 'PalmCacia Notification';
  const body = notificationData.body || 'You have a new notification';
  
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      ...options,
      ...notificationData.options
    })
  );
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  
  if (action === 'dismiss') {
    return;
  }
  
  // Route based on notification type
  let targetUrl = '/';
  
  if (notificationData.type === 'price-alert') {
    targetUrl = `/markets?symbol=${notificationData.symbol}`;
  } else if (notificationData.type === 'trade-confirmation') {
    targetUrl = '/portfolio';
  } else if (notificationData.type === 'portfolio-update') {
    targetUrl = '/portfolio';
  } else if (notificationData.url) {
    targetUrl = notificationData.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            // Navigate to the specific URL
            return client.postMessage({
              type: 'NAVIGATE',
              url: targetUrl
            });
          });
        }
      }
      
      // Open new window/tab if app is not open
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background sync functions
async function syncPortfolioData() {
  try {
    console.log('Syncing portfolio data in background...');
    // Implement portfolio sync logic here
    return Promise.resolve();
  } catch (error) {
    console.error('Error syncing portfolio data:', error);
    throw error;
  }
}

async function syncTradeOrders() {
  try {
    console.log('Syncing trade orders in background...');
    // Implement trade orders sync logic here
    return Promise.resolve();
  } catch (error) {
    console.error('Error syncing trade orders:', error);
    throw error;
  }
}

// Enhanced notification sync
async function syncNotifications() {
  try {
    console.log('Syncing notifications in background...');
    // Check for pending notifications and retry failed sends
    return Promise.resolve();
  } catch (error) {
    console.error('Error syncing notifications:', error);
    throw error;
  }
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'portfolio-update') {
    event.waitUntil(syncPortfolioData());
  }
});
