const staticCacheVer = 1;
const staticCacheName = `eridu-images-v${staticCacheVer}`;
const currentCacheList = [staticCacheName];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    self.skipWaiting();
    await caches.open(staticCacheName);
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (!currentCacheList.includes(key)) {
          return caches.delete(key);
        }
      }))
    )
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Only cache schaledb images
  if (url.origin !== 'https://schaledb.com' || !url.pathname.startsWith('/images/')) return;

  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;

    const response = await fetch(e.request);
    // Cache both ok (cors) and opaque (no-cors) responses
    if (response.ok || response.type === 'opaque') {
      const cache = await caches.open(staticCacheName);
      try {
        cache.put(e.request, response.clone());
      } catch (error) {
        // Quota exceeded or other cache error
      }
    }
    return response;
  })());
});
