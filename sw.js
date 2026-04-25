// ── PEÑA 3 TIEMPO - Service Worker ─────────────────────────────
const CACHE_NAME = 'pena3tiempo-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// ── INSTALL ─────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH - Network first, cache fallback ───────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  // Skip Firebase requests (always need network)
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request)
          .then(cached => cached || caches.match('/index.html'));
      })
  );
});

// ── PUSH NOTIFICATIONS ──────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: '⚽ Peña 3 Tiempo', body: 'Tienes una notificación' };
  try {
    data = event.data.json();
  } catch(e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon    || '/favicon.ico',
      badge:   data.badge   || '/favicon.ico',
      vibrate: data.vibrate || [200, 100, 200],
      tag:     data.tag     || 'pena-notif',
      data:    { url: data.url || '/' },
      actions: data.actions || [],
    })
  );
});

// ── NOTIFICATION CLICK ──────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
