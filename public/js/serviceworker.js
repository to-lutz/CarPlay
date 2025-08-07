const CACHE_NAME = 'my-pwa-cache-v1';

self.addEventListener('install', event => {
  // Optional: Sofort aktivieren
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Alte Caches entfernen, falls nötig
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Falls im Cache, direkt zurückgeben
      if (cachedResponse) {
        return cachedResponse;
      }

      // Falls nicht im Cache, fetchen und cachen
      return fetch(event.request).then(networkResponse => {
        // Man kann hier noch prüfen, ob response ok ist
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Response klonen, da sie ein Stream ist
        const responseClone = networkResponse.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return networkResponse;
      }).catch(() => {
        // Optional: fallback, wenn offline und nix im Cache
        return caches.match('/offline.html');
      });
    })
  );
});
