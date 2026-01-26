import { ref, shallowRef, computed, readonly, type Ref, type ComputedRef, type UnwrapRef } from 'vue';

/**
 * Configuration options for creating an entity store
 */
export interface StoreOptions<T> {
  /** Name of the store for debugging purposes */
  name: string;
  /** Initial data (optional) */
  initialData?: Record<number, T>;
}

/**
 * Return type of createEntityStore
 */
export interface EntityStore<T> {
  /** The reactive store data - readonly to prevent direct mutation */
  data: Readonly<Ref<Record<number, T>>>;
  /** Version counter for triggering updates without deep watching */
  version: Readonly<Ref<number>>;
  /** Whether the store has been initialized */
  isLoaded: Readonly<Ref<boolean>>;

  /** Get an entity by ID */
  get: (id: number) => T | undefined;
  /** Set an entity by ID */
  set: (id: number, value: T) => void;
  /** Update an entity (partial update) */
  update: (id: number, partial: Partial<T>) => void;
  /** Delete an entity by ID */
  remove: (id: number) => void;
  /** Clear all data */
  clear: () => void;
  /** Batch set multiple entities at once */
  batchSet: (records: Record<number, T>) => void;
  /** Mark the store as loaded */
  markLoaded: () => void;
  /** Get a computed ref for a specific entity (reactive to version changes) */
  useEntity: (id: number | Ref<number>) => ComputedRef<T | undefined>;
}

/**
 * Factory function to create a standardized entity store
 *
 * @example
 * ```typescript
 * interface User { id: number; name: string; }
 * const userStore = createEntityStore<User>({ name: 'users' });
 *
 * // Set a user
 * userStore.set(1, { id: 1, name: 'John' });
 *
 * // Get a user
 * const user = userStore.get(1);
 *
 * // Use in a component with reactivity
 * const currentUser = userStore.useEntity(computed(() => props.userId));
 * ```
 */
export function createEntityStore<T>(options: StoreOptions<T>): EntityStore<T> {
  const { name, initialData = {} } = options;

  // Internal state using shallowRef for better performance
  const _data = shallowRef<Record<number, T>>(initialData);
  const _version = ref(0);
  const _isLoaded = ref(Object.keys(initialData).length > 0);

  // Helper to increment version (triggers watchers)
  const _incrementVersion = () => {
    _version.value++;
  };

  // Public API
  const get = (id: number): T | undefined => {
    return _data.value[id];
  };

  const set = (id: number, value: T): void => {
    _data.value = {
      ..._data.value,
      [id]: value
    };
    _incrementVersion();
  };

  const update = (id: number, partial: Partial<T>): void => {
    const existing = _data.value[id];
    if (existing) {
      _data.value = {
        ..._data.value,
        [id]: { ...existing, ...partial }
      };
      _incrementVersion();
    }
  };

  const remove = (id: number): void => {
    const newData = { ..._data.value };
    delete newData[id];
    _data.value = newData;
    _incrementVersion();
  };

  const clear = (): void => {
    _data.value = {};
    _incrementVersion();
  };

  const batchSet = (records: Record<number, T>): void => {
    _data.value = {
      ..._data.value,
      ...records
    };
    _incrementVersion();
  };

  const markLoaded = (): void => {
    _isLoaded.value = true;
  };

  const useEntity = (id: number | Ref<number>): ComputedRef<T | undefined> => {
    return computed(() => {
      // Access version to make reactive to changes
      const _ = _version.value;
      const entityId = typeof id === 'number' ? id : id.value;
      return _data.value[entityId];
    });
  };

  return {
    data: readonly(_data) as Readonly<Ref<Record<number, T>>>,
    version: readonly(_version),
    isLoaded: readonly(_isLoaded),
    get,
    set,
    update,
    remove,
    clear,
    batchSet,
    markLoaded,
    useEntity
  };
}

/**
 * Type helper to extract the entity type from a store
 */
export type EntityType<S extends EntityStore<any>> = S extends EntityStore<infer T> ? T : never;
