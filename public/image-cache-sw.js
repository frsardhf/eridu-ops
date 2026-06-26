const staticCacheVer = 1;
const staticCacheName = `eridu-images-v${staticCacheVer}`;
const currentCacheList = [staticCacheName];

// Cap the image cache so it can't grow until it exhausts the origin's storage
// budget and starves IndexedDB writes (QuotaExceededError). Student icons are
// small, so a few thousand entries is plenty; oldest entries are trimmed first.
const MAX_CACHE_ENTRIES = 2500;

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHE_ENTRIES) return;
  // keys() preserves insertion order, so the front is the oldest.
  const overflow = keys.length - MAX_CACHE_ENTRIES;
  for (let i = 0; i < overflow; i++) {
    await cache.delete(keys[i]);
  }
}

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

  // CORS requests need readable responses — cached opaque entries can't satisfy them.
  // Pass through to the network so the export function can read the response body.
  if (e.request.mode === 'cors') return;

  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;

    const response = await fetch(e.request);
    // Cache both ok (cors) and opaque (no-cors) responses
    if (response.ok || response.type === 'opaque') {
      const cache = await caches.open(staticCacheName);
      try {
        await cache.put(e.request, response.clone());
        await trimCache(cache);
      } catch (error) {
        // Quota exceeded or other cache error
      }
    }
    return response;
  })());
});
