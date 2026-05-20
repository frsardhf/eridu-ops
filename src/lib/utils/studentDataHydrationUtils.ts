import { ResourceProps } from '@/types/resource';
import { StudentProps } from '@/types/student';
import { saveItems, getAllItemsAsRecord } from '../services/dbService';
import {
  getItems,
  getEquipment,
  saveItemsInventory,
  saveEquipmentInventory,
} from '../utils/studentStorage';

export function toRecordById<T extends { Id: number | string }>(
  items: T[]
): Record<string, T> {
  return items.reduce((acc, item) => {
    acc[String(item.Id)] = item;
    return acc;
  }, {} as Record<string, T>);
}

export function attachElephIcons(
  students: Record<string, StudentProps>,
  items: Record<string, ResourceProps>
): Record<string, StudentProps> {
  const patched: Record<string, StudentProps> = { ...students };
  Object.entries(patched).forEach(([studentId, student]) => {
    const icon = items[studentId]?.Icon;
    if (icon) {
      patched[studentId] = {
        ...student,
        ElephIcon: icon
      };
    }
  });
  return patched;
}

export function mergeEquipmentWithExisting(
  equipment: Record<string, ResourceProps>,
  existingEquipments: Record<string, ResourceProps>
): Record<string, ResourceProps> {
  const mergedEquipments: Record<string, ResourceProps> = { ...equipment };

  Object.keys(existingEquipments).forEach(id => {
    if (mergedEquipments[id]) {
      mergedEquipments[id] = {
        ...mergedEquipments[id],
        QuantityOwned: existingEquipments[id].QuantityOwned || 0
      };
    } else {
      mergedEquipments[id] = existingEquipments[id];
    }
  });

  return mergedEquipments;
}

/**
 * Hydrates items data: on first run, persists SchaleDB items + initializes inventory.
 * Synthetic entities (Credits, etc.) are NOT persisted to the items master table —
 * they're unioned in at read time by `getItems`. First-run detection therefore
 * uses the raw items table (which won't include synthetics).
 */
export async function hydrateItemsData(
  items: Record<string, ResourceProps>
): Promise<Record<number, ResourceProps> | Record<string, ResourceProps>> {
  const rawItemsTable = await getAllItemsAsRecord();

  if (Object.keys(rawItemsTable).length === 0) {
    await saveItems(Object.values(items));
    await saveItemsInventory(items);
  }

  return (await getItems()) ?? items;
}

/**
 * Hydrates equipment data by loading existing inventory from IndexedDB,
 * initializing if empty, or merging to preserve QuantityOwned.
 */
export async function hydrateEquipmentData(
  equipment: Record<string, ResourceProps>
): Promise<Record<string, ResourceProps>> {
  const existingEquipments = await getEquipment();

  if (!existingEquipments || Object.keys(existingEquipments).length === 0) {
    await saveEquipmentInventory(equipment);
    return equipment;
  }

  const mergedEquipments = mergeEquipmentWithExisting(equipment, existingEquipments);
  await saveEquipmentInventory(mergedEquipments);
  return mergedEquipments;
}
