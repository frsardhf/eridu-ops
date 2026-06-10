import { FetchedData } from '../../types/student';
import type { SchaleLocalization } from '../../types/schaledb';

/**
 * Fetch a single SchaleDB data file with automatic retry on failure.
 * Retries up to `maxRetries` times with linear back-off (1 s, 2 s, …).
 * Returns an empty object only after all attempts are exhausted.
 */
async function fetchData(type: string, lang: string, maxRetries = 2): Promise<any> {
  const url = `https://schaledb.com/data/${lang}/${type}.json`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt < maxRetries) {
        const delayMs = 1000 * (attempt + 1); // 1 s, 2 s
        console.warn(`Fetch attempt ${attempt + 1} failed for ${type}, retrying in ${delayMs}ms…`, error);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error(`Error fetching ${type} data after ${maxRetries + 1} attempts:`, error);
        return {};
      }
    }
  }
}

// Per-language cache of the in-flight or resolved fetch. Toggling back to a
// language already loaded this session reuses it (no network), and concurrent
// requests for the same language share one round-trip. A failed or empty fetch
// is evicted so the next attempt retries.
const _dataCache = new Map<string, Promise<FetchedData>>();

// `lang` is explicit (no store read here) so the service stays a pure I/O layer.
export function fetchAllData(lang: string): Promise<FetchedData> {
  const cached = _dataCache.get(lang);
  if (cached) return cached;

  const promise = (async (): Promise<FetchedData> => {
    const [students, items, equipment] = await Promise.all([
      fetchData('students', lang),
      fetchData('items', lang),
      fetchData('equipment', lang),
    ]);
    return { students, items, equipment };
  })();

  _dataCache.set(lang, promise);
  promise.then(
    data => {
      if (!data.students || Object.keys(data.students).length === 0) _dataCache.delete(lang);
    },
    () => _dataCache.delete(lang),
  );
  return promise;
}

// Per-language cache, same eviction idea as `_dataCache`. Applying the result
// to the localizationData store ref is the caller's job (localizationStore /
// useStudentData), which also guards against stale language toggles.
const _locCache = new Map<string, Promise<SchaleLocalization>>();

export function fetchLocalizationData(lang: string): Promise<SchaleLocalization> {
  const cached = _locCache.get(lang);
  if (cached) return cached;
  const promise = fetch(`https://schaledb.com/data/${lang}/localization.json`)
    .then(response => response.json() as Promise<SchaleLocalization>);
  _locCache.set(lang, promise);
  promise.catch(() => _locCache.delete(lang));
  return promise;
}
