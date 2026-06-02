import { ref } from 'vue';

/**
 * Owner-only feature gate (e.g. the high-res Hall export).
 *
 * This is *not* security — it's exclusivity for a feature that only produces a
 * nicer image of already-public data. We bake only the SHA-256 *hash* of the
 * token, never the token itself, so reading the bundle reveals an irreversible
 * hash rather than a usable secret. Unlock by visiting `?owner=<token>` once;
 * the token is stored and re-validated (by hash) on each load.
 */
const OWNER_TOKEN_HASH = '24827a5b2373862cf616fcf85194049ffbc14b40ea145e7a600d714d8bd31e34';
const STORAGE_KEY = 'eridu-owner-token';

const isOwner = ref(false);
let started = false;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function resolveOwner(): Promise<void> {
  // 1) Accept a fresh token from the URL, persist it, then strip the param.
  try {
    const url = new URL(window.location.href);
    const param = url.searchParams.get('owner');
    if (param !== null) {
      if (await sha256Hex(param) === OWNER_TOKEN_HASH) {
        localStorage.setItem(STORAGE_KEY, param);
      }
      url.searchParams.delete('owner');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  } catch { /* ignore */ }

  // 2) Validate the stored token by hash (a forged value won't match).
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && await sha256Hex(stored) === OWNER_TOKEN_HASH) {
      isOwner.value = true;
    }
  } catch { /* ignore */ }
}

export function useOwnerMode() {
  if (!started) {
    started = true;
    void resolveOwner();
  }
  return { isOwner };
}
