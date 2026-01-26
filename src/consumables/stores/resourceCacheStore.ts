import { ref } from 'vue';
import { getResources, getEquipments } from '../utils/studentStorage';
import type { CachedResource } from '../../types/resource';

/**
 * Resource Cache Store - In-memory cache for IndexedDB data
 * Loads resources and equipment data once at startup for synchronous access
 */

// Reactive cache for resources (items from IndexedDB)
const resourcesCache = ref<Record<number, CachedResource>>({});

// Reactive cache for equipment (from IndexedDB)
const equipmentCache = ref<Record<number, CachedResource>>({});

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
      // Convert string keys to numbers for type safety
      const typedResources: Record<number, CachedResource> = {};
      for (const [id, resource] of Object.entries(resources)) {
        typedResources[Number(id)] = resource as CachedResource;
      }
      resourcesCache.value = typedResources;
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
    initializeResourcesCache(),
    initializeEquipmentCache()
  ]);
}

/**
 * Get resource data by ID (synchronous)
 * Returns the cached data immediately
 */
export function getResourceDataByIdSync(id: string | number): CachedResource | null {
  const numericId = typeof id === 'string' ? Number(id) : id;
  return resourcesCache.value[numericId] ?? null;
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
 * Update a resource in the cache
 * Call this after saving to IndexedDB to keep cache in sync
 */
export function updateResourceInCache(id: string | number, data: CachedResource) {
  const numericId = typeof id === 'string' ? Number(id) : id;
  resourcesCache.value[numericId] = data;
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
 * Update all resources in cache
 * Call this after bulk import or updates
 */
export function updateResourcesCache(resources: Record<number, CachedResource>) {
  resourcesCache.value = resources;
  isResourcesLoaded.value = true;
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
  return isResourcesLoaded.value && isEquipmentLoaded.value;
}

/**
 * Get all resources from cache
 */
export function getAllResourcesFromCache(): Record<number, CachedResource> {
  return resourcesCache.value;
}

/**
 * Get all equipment from cache
 */
export function getAllEquipmentFromCache(): Record<number, CachedResource> {
  return equipmentCache.value;
}
