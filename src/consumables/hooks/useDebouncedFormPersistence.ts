import { ref, watch, onUnmounted, type Ref, type WatchSource } from 'vue';

export type RefMap = Record<string, Ref<any>>;
type Defaults<R extends RefMap> = { [K in keyof R]: R[K] extends Ref<infer V> ? V : never };

/**
 * Shared persistence boilerplate for domain hooks.
 *
 * Handles:
 *   - isLoading guard (blocks watch from triggering saves during load)
 *   - pendingSave chain (serializes concurrent saves)
 *   - loadRequestToken stale-load guard (staged-ref pattern)
 *   - Debounced watch → save
 *   - onUnmounted timer cleanup
 *
 * @param opts.isVisible    Accessor for the hook's visibility gate
 * @param opts.refs         Live refs whose values will be swapped on load
 * @param opts.defaults     Deep-cloneable defaults, one per ref key
 * @param opts.loadFn       Async fn(stagedRefs) → populates staged refs from storage
 * @param opts.saveFn       Async fn() → T|null — writes current ref values; returns saved record
 * @param opts.onSaved      Optional callback invoked with the non-null saveFn result
 * @param opts.afterFlush   Optional callback invoked after every debounced flush completes
 * @param opts.afterLoad    Optional callback invoked after a successful load swap
 * @param opts.watchSources Refs / computed values to watch for changes
 * @param opts.debounceMs   Debounce window in ms (default 250)
 */
export function useDebouncedFormPersistence<R extends RefMap, T = any>(opts: {
  isVisible:    () => boolean | undefined;
  refs:         R;
  defaults:     Defaults<R>;
  loadFn:       (staged: R) => Promise<unknown>;
  saveFn:       () => Promise<T | null>;
  onSaved?:     (saved: T) => void;
  afterFlush?:  () => void | Promise<void>;
  afterLoad?:   () => void | Promise<void>;
  watchSources: WatchSource[];
  debounceMs?:  number;
}) {
  const isLoading = ref(false);
  let pendingSave: Promise<void> | null = null;
  let loadToken = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Flush immediately: cancel any pending debounce, await prior save,
   * then execute save + onSaved + afterFlush in sequence.
   * Safe to call directly (e.g. from closeModal) — bypasses debounce.
   */
  async function flushNow(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null; }
    if (pendingSave) await pendingSave;
    pendingSave = (async () => {
      const saved = await opts.saveFn();
      if (saved != null) opts.onSaved?.(saved);
      await opts.afterFlush?.();
    })();
    await pendingSave;
    pendingSave = null;
  }

  watch(opts.watchSources, () => {
    if (!opts.isVisible() || isLoading.value) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flushNow, opts.debounceMs ?? 250);
  }, { deep: true });

  /**
   * Load from storage using staged refs to prevent stale async writes.
   * If a newer load supersedes this one (token mismatch), the swap is skipped.
   */
  async function loadNow(): Promise<void> {
    const token = ++loadToken;
    isLoading.value = true;
    try {
      // Build staged copies from structuredClone of defaults so the live refs
      // are never mutated by an in-flight load that gets superseded.
      const staged = Object.fromEntries(
        Object.entries(opts.refs).map(([k]) => [
          k,
          ref(structuredClone(opts.defaults[k as keyof R]))
        ])
      ) as unknown as R;

      await opts.loadFn(staged);

      // Discard if a newer load already started (rapid student switching).
      if (token !== loadToken) return;

      for (const k of Object.keys(opts.refs)) {
        opts.refs[k].value = (staged as any)[k].value;
      }
      await opts.afterLoad?.();
    } finally {
      isLoading.value = false;
    }
  }

  onUnmounted(() => {
    if (timer) clearTimeout(timer);
  });

  return { isLoading, loadNow, flushNow };
}
