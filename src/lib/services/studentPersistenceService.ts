// studentPersistenceService.ts - IndexedDB persistence facade for form data and
// inventories. Thin wrappers over dbService that add id coercion, inventory
// merging, synthetic entities, and ref hydration. (Moved from utils/studentStorage.)

import {
  getFormData as dbGetFormData,
  saveFormData as dbSaveFormData,
  getAllItemsInventories,
  getAllEquipmentInventories,
  saveItemsInventories,
  saveEquipmentInventories,
  getAllItemsAsRecord,
  getAllEquipmentAsRecord,
} from './dbService';
import type { ItemsInventoryRecord, EquipmentInventoryRecord, FormRecord } from '../db/database';
import type { CachedResource } from '../../types/resource';
import { toNumericId } from '../utils/idCoercion';
import { SYNTHETIC_ENTITIES } from '../constants/syntheticEntities';

/** Saves a student's form data to IndexedDB (id coerced to numeric). */
export async function saveFormData(
  studentId: string | number,
  data: Partial<FormRecord>,
): Promise<FormRecord | null> {
  if (!studentId) return null;

  try {
    const numericId = toNumericId(studentId);
    return await dbSaveFormData(numericId, data);
  } catch (error) {
    console.error('Error saving form data to IndexedDB:', error);
    return null;
  }
}

/** Merges item records with inventory quantities, adding QuantityOwned to each. */
function mergeWithInventory<T extends object>(
  items: Record<number, T>,
  inventories: Record<number, number>,
): Record<string, T & { QuantityOwned: number }> {
  const result: Record<string, T & { QuantityOwned: number }> = {};
  for (const [id, item] of Object.entries(items)) {
    result[id] = {
      ...item,
      QuantityOwned: inventories[Number(id)] || 0,
    };
  }
  return result;
}

/**
 * Retrieves items data with inventory from IndexedDB.
 * Synthetic entities (e.g. Credits) are unioned in at read time: they don't
 * live in SchaleDB so we keep their metadata out of the items master table.
 */
export async function getItems(): Promise<Record<string, CachedResource> | null> {
  try {
    const [items, inventories] = await Promise.all([
      getAllItemsAsRecord(),
      getAllItemsInventories(),
    ]);

    const merged = mergeWithInventory(items, inventories) as Record<string, CachedResource>;

    for (const entity of Object.values(SYNTHETIC_ENTITIES)) {
      const idStr = String(entity.Id);
      if (!merged[idStr]) {
        merged[idStr] = {
          ...entity,
          QuantityOwned: inventories[entity.Id] ?? 0,
        };
      }
    }

    return merged;
  } catch (error) {
    console.error('Error retrieving items from IndexedDB:', error);
    return null;
  }
}

/** Retrieves equipment data with inventory (QuantityOwned) from IndexedDB. */
export async function getEquipment(): Promise<Record<string, CachedResource> | null> {
  try {
    const [equipment, inventories] = await Promise.all([
      getAllEquipmentAsRecord(),
      getAllEquipmentInventories(),
    ]);

    return mergeWithInventory(equipment, inventories);
  } catch (error) {
    console.error('Error retrieving equipment from IndexedDB:', error);
    return null;
  }
}

/** Retrieves a single student's form data from IndexedDB (null if not found). */
async function getFormData(studentId: string | number): Promise<FormRecord | null> {
  if (!studentId) return null;

  try {
    const numericId = toNumericId(studentId);
    const formData = await dbGetFormData(numericId);
    return formData || null;
  } catch (error) {
    console.error('Error retrieving form data from IndexedDB:', error);
    return null;
  }
}

/**
 * Deep-merges a student's stored form data into `refs` (keyed by storage key),
 * falling back to `defaultValues` for absent keys. Returns false if no data.
 */
export async function loadFormDataToRefs(
  studentId: string | number,
  refs: Record<string, { value: unknown }>,
  defaultValues: Record<string, unknown> = {},
): Promise<boolean> {
  if (!studentId) return false;

  try {
    const formRecord = await getFormData(studentId);
    if (!formRecord) return false;
    // Read dynamically by storage key; FormRecord has no string index signature.
    const studentData = formRecord as unknown as Record<string, unknown>;

    for (const key of Object.keys(refs)) {
      let mergedValue: unknown;

      if (key in studentData) {
        const storedValue = studentData[key];
        const defaultValue = defaultValues[key];

        if (
          typeof defaultValue === 'object' &&
          defaultValue !== null &&
          !Array.isArray(defaultValue) &&
          typeof storedValue === 'object' &&
          storedValue !== null
        ) {
          // Deep merge objects
          const base = { ...(defaultValue as Record<string, unknown>) };

          for (const nestedKey of Object.keys(base)) {
            if (nestedKey in (storedValue as Record<string, unknown>)) {
              const baseVal = base[nestedKey];
              const storedVal = (storedValue as Record<string, unknown>)[nestedKey];

              if (
                typeof baseVal === 'object' &&
                baseVal !== null &&
                typeof storedVal === 'object' &&
                storedVal !== null
              ) {
                base[nestedKey] = {
                  ...(baseVal as Record<string, unknown>),
                  ...(storedVal as Record<string, unknown>),
                };
              } else {
                base[nestedKey] = storedVal;
              }
            }
          }

          // Include extra keys from stored value
          for (const storedKey of Object.keys(storedValue as Record<string, unknown>)) {
            if (!(storedKey in base)) {
              base[storedKey] = (storedValue as Record<string, unknown>)[storedKey];
            }
          }

          mergedValue = base;
        } else {
          // Primitives / arrays
          mergedValue = storedValue;
        }
      } else if (key in defaultValues) {
        mergedValue = structuredClone(defaultValues[key]);
      }

      if (mergedValue !== undefined) {
        refs[key].value = mergedValue;
      }
    }

    return true;
  } catch (error) {
    console.error('Error loading form data to refs:', error);
    return false;
  }
}

/**
 * Saves items inventory to IndexedDB. Accepts either a plain id->quantity map
 * or a full item record map with QuantityOwned.
 */
export async function saveItemsInventory(
  data: Record<string, number> | Record<string, { QuantityOwned?: number }>,
): Promise<boolean> {
  try {
    const inventories: ItemsInventoryRecord[] = Object.entries(data).map(([id, value]) => ({
      Id: Number(id),
      QuantityOwned: (typeof value === 'number' ? value : value?.QuantityOwned) || 0,
    }));

    return await saveItemsInventories(inventories);
  } catch (error) {
    console.error('Error saving items inventory to IndexedDB:', error);
    return false;
  }
}

/**
 * Saves equipment inventory to IndexedDB. Accepts either a plain id->quantity
 * map or a full equipment record map with QuantityOwned.
 */
export async function saveEquipmentInventory(
  data: Record<string, number> | Record<string, { QuantityOwned?: number }>,
): Promise<boolean> {
  try {
    const inventories: EquipmentInventoryRecord[] = Object.entries(data).map(([id, value]) => ({
      Id: Number(id),
      QuantityOwned: (typeof value === 'number' ? value : value?.QuantityOwned) || 0,
    }));

    return await saveEquipmentInventories(inventories);
  } catch (error) {
    console.error('Error saving equipment inventory to IndexedDB:', error);
    return false;
  }
}
