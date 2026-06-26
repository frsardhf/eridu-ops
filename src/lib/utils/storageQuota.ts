// Storage-quota helpers. The schaledb image cache (Cache Storage, see
// public/image-cache-sw.js) shares the origin's storage budget with IndexedDB.
// When it fills the budget, even a one-field IndexedDB write throws
// QuotaExceededError (surfaced by Dexie as an AbortError wrapping it). Freeing
// the image cache drops usage back under the limit so writes succeed again.

/** True if an error is (or wraps) a storage QuotaExceededError. */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; inner?: { name?: string } };
  return e.name === 'QuotaExceededError' || e.inner?.name === 'QuotaExceededError';
}

/**
 * Deletes the schaledb image caches to free origin storage. Safe to call any
 * time: the images are cache-first and re-fetch on demand. Returns true if at
 * least one cache was deleted.
 */
export async function clearImageCacheStorage(): Promise<boolean> {
  if (!('caches' in self)) return false;
  try {
    const keys = await caches.keys();
    const imageKeys = keys.filter((k) => k.startsWith('eridu-images'));
    const results = await Promise.all(imageKeys.map((k) => caches.delete(k)));
    return results.some(Boolean);
  } catch {
    return false;
  }
}
