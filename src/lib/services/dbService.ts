// dbService.ts - Database operations and cache management

import { db, arrayToRecord } from '../db/database';
import { isQuotaExceededError, clearImageCacheStorage } from '../utils/storageQuota';
import type {
  StudentRecord,
  ItemRecord,
  EquipmentRecord,
  FormRecord,
  ItemsInventoryRecord,
  EquipmentInventoryRecord
} from '../db/database';

/**
 * Run an IndexedDB write, recovering from a full storage budget. The schaledb
 * image cache shares the origin quota with IndexedDB, so once it fills up every
 * write throws QuotaExceededError. On that error we free the image cache (drops
 * usage back under the limit) and retry the write once. `fallback` is returned
 * if the write still fails.
 */
async function withQuotaRetry<T>(write: () => Promise<T>, label: string, fallback: T): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isQuotaExceededError(error) && await clearImageCacheStorage()) {
      try {
        return await write();
      } catch (retryError) {
        console.error(`${label} after freeing storage:`, retryError);
        return fallback;
      }
    }
    console.error(`${label}:`, error);
    return fallback;
  }
}

// ========== Metadata Operations ==========

/**
 * Get metadata value by key
 */
export async function getMetadata<T = any>(key: string): Promise<T | undefined> {
  try {
    const record = await db.metadata.get(key);
    return record?.value as T | undefined;
  } catch (error) {
    console.error(`Error getting metadata ${key}:`, error);
    return undefined;
  }
}

/**
 * Set metadata value
 */
export async function setMetadata(key: string, value: any): Promise<boolean> {
  try {
    await db.metadata.put({ key, value });
    return true;
  } catch (error) {
    console.error(`Error setting metadata ${key}:`, error);
    return false;
  }
}

/**
 * Check if migration is completed
 */
export async function isMigrationCompleted(): Promise<boolean> {
  const completed = await getMetadata<boolean>('migrationCompleted');
  return completed === true;
}

/**
 * Get last fetched timestamp
 */
async function getLastFetched(): Promise<number> {
  const timestamp = await getMetadata<number>('lastFetched');
  return timestamp || 0;
}

/**
 * Get data source (api or migration)
 */
async function getDataSource(): Promise<'api' | 'migration' | undefined> {
  return await getMetadata<'api' | 'migration'>('dataSource');
}

/**
 * Check if data needs refresh based on lastFetched and dataSource
 * @param maxAgeDays Maximum age in days before refresh needed
 */
export async function needsRefresh(maxAgeDays: number = 7): Promise<boolean> {
  const [lastFetched, dataSource] = await Promise.all([
    getLastFetched(),
    getDataSource()
  ]);

  // Always refresh if data came from migration
  if (dataSource === 'migration') {
    return true;
  }

  // Check age-based expiration
  if (!lastFetched) {
    return true;
  }

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return Date.now() - lastFetched > maxAgeMs;
}

/**
 * Update cache metadata after successful API fetch
 */
export async function updateCacheMetadata(): Promise<void> {
  await Promise.all([
    setMetadata('lastFetched', Date.now()),
    setMetadata('dataSource', 'api')
  ]);
}

// ========== Student Operations ==========

/**
 * Get all students as array
 */
export async function getAllStudents(): Promise<StudentRecord[]> {
  try {
    return await db.students.toArray();
  } catch (error) {
    console.error('Error getting all students:', error);
    return [];
  }
}

/**
 * Get all students as record keyed by Id
 */
export async function getAllStudentsAsRecord(): Promise<Record<number, StudentRecord>> {
  const students = await getAllStudents();
  return arrayToRecord(students);
}

/**
 * Save students (bulk upsert)
 */
export async function saveStudents(students: StudentRecord[]): Promise<boolean> {
  try {
    await db.students.bulkPut(students);
    return true;
  } catch (error) {
    console.error('Error saving students:', error);
    return false;
  }
}

// ========== Item Operations ==========

/**
 * Get all items as array
 */
export async function getAllItems(): Promise<ItemRecord[]> {
  try {
    return await db.items.toArray();
  } catch (error) {
    console.error('Error getting all items:', error);
    return [];
  }
}

/**
 * Get all items as record keyed by Id
 */
export async function getAllItemsAsRecord(): Promise<Record<number, ItemRecord>> {
  const items = await getAllItems();
  return arrayToRecord(items);
}

/**
 * Save items (bulk upsert)
 */
export async function saveItems(items: ItemRecord[]): Promise<boolean> {
  try {
    await db.items.bulkPut(items);
    return true;
  } catch (error) {
    console.error('Error saving items:', error);
    return false;
  }
}

// ========== Equipment Operations ==========

/**
 * Get all equipment as array
 */
async function getAllEquipment(): Promise<EquipmentRecord[]> {
  try {
    return await db.equipment.toArray();
  } catch (error) {
    console.error('Error getting all equipment:', error);
    return [];
  }
}

/**
 * Get all equipment as record keyed by Id
 */
export async function getAllEquipmentAsRecord(): Promise<Record<number, EquipmentRecord>> {
  const equipment = await getAllEquipment();
  return arrayToRecord(equipment);
}

/**
 * Save equipment (bulk upsert)
 */
export async function saveEquipment(equipment: EquipmentRecord[]): Promise<boolean> {
  try {
    await db.equipment.bulkPut(equipment);
    return true;
  } catch (error) {
    console.error('Error saving equipment:', error);
    return false;
  }
}

// ========== Form Operations ==========

/**
 * Get form data for a student
 */
export async function getFormData(studentId: number): Promise<FormRecord | undefined> {
  try {
    return await db.forms.get(studentId);
  } catch (error) {
    console.error(`Error getting form data for student ${studentId}:`, error);
    return undefined;
  }
}

/**
 * Sanitize form data to plain JSON-serializable objects
 * Removes Vue reactivity (refs, computed, proxies) and non-cloneable data
 */
function sanitizeFormData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data !== 'object') {
    return data;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFormData(item));
  }

  // Handle plain objects and Vue Proxies - recursively sanitize
  // Use JSON parse/stringify as a safe way to strip Vue reactivity
  // This handles Proxy objects, refs, and other Vue internals
  try {
    const sanitized: any = {};
    for (const key in data) {
      // Use hasOwnProperty to avoid prototype chain
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];

        // Skip functions, symbols, undefined
        if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
          continue;
        }

        // Recursively sanitize nested objects
        sanitized[key] = sanitizeFormData(value);
      }
    }
    return sanitized;
  } catch (error) {
    // Fallback: if iteration fails, try JSON round-trip
    console.warn('Sanitization iteration failed, using JSON fallback:', error);
    try {
      return JSON.parse(JSON.stringify(data));
    } catch (jsonError) {
      console.error('JSON sanitization also failed:', jsonError);
      return {};
    }
  }
}

/**
 * Save form data for a student.
 *
 * Wrapped in an `rw` transaction so concurrent get-merge-put calls serialize
 * on the row. The original motivation was a real race between the per-domain
 * hooks (useStudentUpgrade / useStudentGear / useStudentGifts) that all wrote
 * to `forms[studentId]`; those are now consolidated into `useStudentForm`
 * (one persistence cycle, one writer). The transaction stays as a defensive
 * guard for any future caller that touches this row from a separate context.
 *
 * Returns the merged sanitized data on success for immediate store updates.
 */
export async function saveFormData(studentId: number, formData: Partial<FormRecord>): Promise<FormRecord | null> {
  // Sanitize outside the transaction — pure CPU work, no DB I/O needed.
  const sanitizedFormData = sanitizeFormData(formData);

  return withQuotaRetry(
    () => db.transaction('rw', db.forms, async () => {
      const existing = await db.forms.get(studentId);
      const merged: FormRecord = {
        studentId,
        ...(existing ?? {}),
        ...sanitizedFormData,
      };
      await db.forms.put(merged);
      return merged;
    }),
    `Error saving form data for student ${studentId}`,
    null,
  );
}

/**
 * Get all form data as record keyed by studentId
 */
export async function getAllFormData(): Promise<Record<number, FormRecord>> {
  try {
    const forms = await db.forms.toArray();
    return forms.reduce((acc, form) => {
      acc[form.studentId] = form;
      return acc;
    }, {} as Record<number, FormRecord>);
  } catch (error) {
    console.error('Error getting all form data:', error);
    return {};
  }
}

// ========== Items Inventory Operations ==========

/**
 * Get all items inventories as id→quantity record
 */
export async function getAllItemsInventories(): Promise<Record<number, number>> {
  try {
    const records = await db.items_inventory.toArray();
    return records.reduce((acc, record) => {
      acc[record.Id] = record.QuantityOwned;
      return acc;
    }, {} as Record<number, number>);
  } catch (error) {
    console.error('Error getting all items inventories:', error);
    return {};
  }
}

/**
 * Save multiple items inventories (bulk upsert)
 */
export async function saveItemsInventories(inventories: ItemsInventoryRecord[]): Promise<boolean> {
  return withQuotaRetry(
    async () => { await db.items_inventory.bulkPut(inventories); return true; },
    'Error saving items inventories',
    false,
  );
}

// ========== Equipment Inventory Operations ==========

/**
 * Get all equipment inventories
 */
export async function getAllEquipmentInventories(): Promise<Record<number, number>> {
  try {
    const records = await db.equipment_inventory.toArray();
    return records.reduce((acc, record) => {
      acc[record.Id] = record.QuantityOwned;
      return acc;
    }, {} as Record<number, number>);
  } catch (error) {
    console.error('Error getting all equipment inventories:', error);
    return {};
  }
}

/**
 * Save multiple equipment inventories (bulk upsert)
 */
export async function saveEquipmentInventories(inventories: EquipmentInventoryRecord[]): Promise<boolean> {
  return withQuotaRetry(
    async () => { await db.equipment_inventory.bulkPut(inventories); return true; },
    'Error saving equipment inventories',
    false,
  );
}