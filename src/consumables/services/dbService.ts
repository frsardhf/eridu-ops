// dbService.ts - Database operations and cache management

import { db, arrayToRecord } from '../db/database';
import type {
  StudentRecord,
  ItemRecord,
  EquipmentRecord,
  FormRecord,
  ResourceInventoryRecord,
  EquipmentInventoryRecord
} from '../db/database';

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
export async function getLastFetched(): Promise<number> {
  const timestamp = await getMetadata<number>('lastFetched');
  return timestamp || 0;
}

/**
 * Get data source (api or migration)
 */
export async function getDataSource(): Promise<'api' | 'migration' | undefined> {
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
 * Get student by ID
 */
export async function getStudentById(id: number): Promise<StudentRecord | undefined> {
  try {
    return await db.students.get(id);
  } catch (error) {
    console.error(`Error getting student ${id}:`, error);
    return undefined;
  }
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
export async function getAllEquipment(): Promise<EquipmentRecord[]> {
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
 * Save form data for a student
 * Returns the merged sanitized data on success for immediate store updates
 */
export async function saveFormData(studentId: number, formData: Partial<FormRecord>): Promise<FormRecord | null> {
  try {
    // Get existing data
    const existing = await db.forms.get(studentId);

    // Sanitize the incoming form data to remove Vue reactivity
    const sanitizedFormData = sanitizeFormData(formData);

    // Merge with existing data
    const merged: FormRecord = {
      studentId,
      ...(existing ?? {}),
      ...sanitizedFormData
    };

    await db.forms.put(merged);
    return merged;
  } catch (error) {
    console.error(`Error saving form data for student ${studentId}:`, error);
    return null;
  }
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

// ========== Resource Inventory Operations ==========

/**
 * Get resource inventory
 */
export async function getResourceInventory(id: number): Promise<number> {
  try {
    const record = await db.resources.get(id);
    return record?.QuantityOwned || 0;
  } catch (error) {
    console.error(`Error getting resource inventory ${id}:`, error);
    return 0;
  }
}

/**
 * Set resource inventory
 */
export async function setResourceInventory(id: number, quantity: number): Promise<boolean> {
  try {
    await db.resources.put({ id, QuantityOwned: quantity });
    return true;
  } catch (error) {
    console.error(`Error setting resource inventory ${id}:`, error);
    return false;
  }
}

/**
 * Get all resource inventories
 */
export async function getAllResourceInventories(): Promise<Record<number, number>> {
  try {
    const records = await db.resources.toArray();
    return records.reduce((acc, record) => {
      acc[record.id] = record.QuantityOwned;
      return acc;
    }, {} as Record<number, number>);
  } catch (error) {
    console.error('Error getting all resource inventories:', error);
    return {};
  }
}

/**
 * Save multiple resource inventories (bulk upsert)
 */
export async function saveResourceInventories(inventories: ResourceInventoryRecord[]): Promise<boolean> {
  try {
    await db.resources.bulkPut(inventories);
    return true;
  } catch (error) {
    console.error('Error saving resource inventories:', error);
    return false;
  }
}

// ========== Equipment Inventory Operations ==========

/**
 * Get equipment inventory
 */
export async function getEquipmentInventory(id: number): Promise<number> {
  try {
    const record = await db.equipments_inventory.get(id);
    return record?.QuantityOwned || 0;
  } catch (error) {
    console.error(`Error getting equipment inventory ${id}:`, error);
    return 0;
  }
}

/**
 * Set equipment inventory
 */
export async function setEquipmentInventory(id: number, quantity: number): Promise<boolean> {
  try {
    await db.equipments_inventory.put({ id, QuantityOwned: quantity });
    return true;
  } catch (error) {
    console.error(`Error setting equipment inventory ${id}:`, error);
    return false;
  }
}

/**
 * Get all equipment inventories
 */
export async function getAllEquipmentInventories(): Promise<Record<number, number>> {
  try {
    const records = await db.equipments_inventory.toArray();
    return records.reduce((acc, record) => {
      acc[record.id] = record.QuantityOwned;
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
  try {
    await db.equipments_inventory.bulkPut(inventories);
    return true;
  } catch (error) {
    console.error('Error saving equipment inventories:', error);
    return false;
  }
}

// ========== Utility Operations ==========

/**
 * Clear all data from database (for testing/debugging)
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.students.clear(),
    db.items.clear(),
    db.equipment.clear(),
    db.forms.clear(),
    db.resources.clear(),
    db.equipments_inventory.clear()
    // Note: Don't clear metadata to preserve migration state
  ]);
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  students: number;
  items: number;
  equipment: number;
  forms: number;
  resources: number;
  equipmentInventories: number;
}> {
  const [students, items, equipment, forms, resources, equipmentInventories] = await Promise.all([
    db.students.count(),
    db.items.count(),
    db.equipment.count(),
    db.forms.count(),
    db.resources.count(),
    db.equipments_inventory.count()
  ]);

  return {
    students,
    items,
    equipment,
    forms,
    resources,
    equipmentInventories
  };
}
