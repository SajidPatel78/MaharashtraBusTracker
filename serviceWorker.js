const CACHE_NAME = 'maharashtra-bus-tracker-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/app.js',
  '/js/firebase-config.js',
  '/js/map-controller.js',
  '/js/bus-service.js',
  '/js/notification-service.js',
  '/components/search-bar.js',
  '/components/bus-list.js',
  '/components/stop-list.js',
  '/pages/home.js',
  '/pages/bus-details.js',
  '/pages/bus-stops.js',
  '/assets/icon.svg',
  '/assets/splash.svg'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests and Firebase/Google API requests
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request)
        .then(fetchResponse => {
          // Don't cache API calls
          if (event.request.url.includes('/api/')) {
            return fetchResponse;
          }
          
          // Cache other successful responses
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        })
        .catch(error => {
          console.log('Fetch failed:', error);
          // For navigate requests, return the offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    })
  );
});

// Push notification event
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Bus update available',
    icon: 'assets/icon.svg',
    badge: 'assets/icon.svg',
    data: {
      url: data.clickAction || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Maharashtra Bus Tracker', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data.url;
      
      // If a window already exists, focus it
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
