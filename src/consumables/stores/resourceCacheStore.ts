import { ref } from 'vue';
import { getItems, getEquipment } from '../utils/studentStorage';
import type { CachedResource } from '../../types/resource';

/**
 * Resource Cache Store - In-memory cache for IndexedDB data
 * Loads items and equipment data once at startup for synchronous access
 * Note: "resources" is the umbrella term covering both items and equipment.
 */

// Reactive cache for items (from IndexedDB)
const itemsCache = ref<Record<number, CachedResource>>({});

// Reactive cache for equipment (from IndexedDB)
const equipmentCache = ref<Record<number, CachedResource>>({});

// Loading state
const isItemsLoaded = ref(false);
const isEquipmentLoaded = ref(false);

/**
 * Initialize items cache from IndexedDB
 * Should be called once at app startup
 */
export async function initializeItemsCache() {
  try {
    const items = await getItems();
    if (items) {
      // Convert string keys to numbers for type safety
      const typedItems: Record<number, CachedResource> = {};
      for (const [id, item] of Object.entries(items)) {
        typedItems[Number(id)] = item as CachedResource;
      }
      itemsCache.value = typedItems;
      isItemsLoaded.value = true;
    }
  } catch (error) {
    console.error('Failed to initialize items cache:', error);
  }
}

/**
 * Initialize equipment cache from IndexedDB
 * Should be called once at app startup
 */
export async function initializeEquipmentCache() {
  try {
    const equipment = await getEquipment();
    if (equipment) {
      // Convert string keys to numbers for type safety
      const typedEquipment: Record<number, CachedResource> = {};
      for (const [id, eq] of Object.entries(equipment)) {
        typedEquipment[Number(id)] = eq as CachedResource;
      }
      equipmentCache.value = typedEquipment;
      isEquipmentLoaded.value = true;
    }
  } catch (error) {
    console.error('Failed to initialize equipment cache:', error);
  }
}

/**
 * Initialize all caches
 * Call this at app startup
 */
export async function initializeAllCaches() {
  await Promise.all([
    initializeItemsCache(),
    initializeEquipmentCache()
  ]);
}

/**
 * Get item data by ID (synchronous)
 * Returns the cached data immediately
 */
export function getResourceDataByIdSync(id: string | number): CachedResource | null {
  const numericId = typeof id === 'string' ? Number(id) : id;
  return itemsCache.value[numericId] ?? null;
}

/**
 * Get equipment data by ID (synchronous)
 * Returns the cached data immediately
 */
export function getEquipmentDataByIdSync(id: string | number): CachedResource | null {
  const numericId = typeof id === 'string' ? Number(id) : id;
  return equipmentCache.value[numericId] ?? null;
}

/**
 * Update an item in the cache
 * Call this after saving to IndexedDB to keep cache in sync
 */
export function updateItemInCache(id: string | number, data: CachedResource) {
  const numericId = typeof id === 'string' ? Number(id) : id;
  itemsCache.value[numericId] = data;
}

/**
 * Update equipment in the cache
 * Call this after saving to IndexedDB to keep cache in sync
 */
export function updateEquipmentInCache(id: string | number, data: CachedResource) {
  const numericId = typeof id === 'string' ? Number(id) : id;
  equipmentCache.value[numericId] = data;
}

/**
 * Update all items in cache
 * Call this after bulk import or updates
 */
export function updateItemsCache(items: Record<number, CachedResource>) {
  itemsCache.value = items;
  isItemsLoaded.value = true;
}

/**
 * Update all equipment in cache
 * Call this after bulk import or updates
 */
export function updateEquipmentCache(equipment: Record<number, CachedResource>) {
  equipmentCache.value = equipment;
  isEquipmentLoaded.value = true;
}

/**
 * Check if caches are loaded
 */
export function areCachesLoaded(): boolean {
  return isItemsLoaded.value && isEquipmentLoaded.value;
}

/**
 * Get all items from cache
 */
export function getAllItemsFromCache(): Record<number, CachedResource> {
  return itemsCache.value;
}

/**
 * Get all equipment from cache
 */
export function getAllEquipmentFromCache(): Record<number, CachedResource> {
  return equipmentCache.value;
}
