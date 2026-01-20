import { ref } from 'vue';
import { getResources, getEquipments } from '../utils/studentStorage';

/**
 * Resource Cache Store - In-memory cache for IndexedDB data
 * Loads resources and equipment data once at startup for synchronous access
 */

// Reactive cache for resources (items from IndexedDB)
const resourcesCache = ref<Record<string | number, any>>({});

// Reactive cache for equipment (from IndexedDB)
const equipmentCache = ref<Record<string | number, any>>({});

// Loading state
const isResourcesLoaded = ref(false);
const isEquipmentLoaded = ref(false);

/**
 * Initialize resources cache from IndexedDB
 * Should be called once at app startup
 */
export async function initializeResourcesCache() {
  try {
    const resources = await getResources();
    if (resources) {
      resourcesCache.value = resources;
      isResourcesLoaded.value = true;
    }
  } catch (error) {
    console.error('Failed to initialize resources cache:', error);
  }
}

/**
 * Initialize equipment cache from IndexedDB
 * Should be called once at app startup
 */
export async function initializeEquipmentCache() {
  try {
    const equipment = await getEquipments();
    if (equipment) {
      equipmentCache.value = equipment;
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
    initializeResourcesCache(),
    initializeEquipmentCache()
  ]);
}

/**
 * Get resource data by ID (synchronous)
 * Returns the cached data immediately
 */
export function getResourceDataByIdSync(id: string | number): Record<string, any> | null {
  return resourcesCache.value[id] ?? null;
}

/**
 * Get equipment data by ID (synchronous)
 * Returns the cached data immediately
 */
export function getEquipmentDataByIdSync(id: string | number): Record<string, any> | null {
  return equipmentCache.value[id] ?? null;
}

/**
 * Update a resource in the cache
 * Call this after saving to IndexedDB to keep cache in sync
 */
export function updateResourceInCache(id: string | number, data: any) {
  resourcesCache.value[id] = data;
}

/**
 * Update equipment in the cache
 * Call this after saving to IndexedDB to keep cache in sync
 */
export function updateEquipmentInCache(id: string | number, data: any) {
  equipmentCache.value[id] = data;
}

/**
 * Update all resources in cache
 * Call this after bulk import or updates
 */
export function updateResourcesCache(resources: Record<string | number, any>) {
  resourcesCache.value = resources;
  isResourcesLoaded.value = true;
}

/**
 * Update all equipment in cache
 * Call this after bulk import or updates
 */
export function updateEquipmentCache(equipment: Record<string | number, any>) {
  equipmentCache.value = equipment;
  isEquipmentLoaded.value = true;
}

/**
 * Check if caches are loaded
 */
export function areCachesLoaded(): boolean {
  return isResourcesLoaded.value && isEquipmentLoaded.value;
}

/**
 * Get all resources from cache
 */
export function getAllResourcesFromCache(): Record<string | number, any> {
  return resourcesCache.value;
}

/**
 * Get all equipment from cache
 */
export function getAllEquipmentFromCache(): Record<string | number, any> {
  return equipmentCache.value;
}
