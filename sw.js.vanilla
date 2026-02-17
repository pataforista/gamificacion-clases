importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log(`Workbox is loaded`);

  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' ||
      request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
    })
  );

  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  workbox.routing.registerRoute(
    new RegExp('https://cdn.jsdelivr.net/.*'),
    new workbox.strategies.CacheFirst({
      cacheName: 'external-resources',
    })
  );

  // Fallback to network for everything else
  workbox.routing.setDefaultHandler(new workbox.strategies.NetworkFirst());
} else {
  console.log(`Workbox didn't load`);
}
