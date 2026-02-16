import { CREDITS_ID, injectSyntheticEntities } from '@/consumables/constants/syntheticEntities';
import { ResourceProps } from '@/types/resource';
import { StudentProps } from '@/types/student';

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

export function toNumericResourceRecord(
  resources: Record<string, ResourceProps>
): Record<number, ResourceProps> {
  const numericRecord: Record<number, ResourceProps> = {};
  Object.entries(resources).forEach(([id, resource]) => {
    numericRecord[Number(id)] = resource;
  });
  return numericRecord;
}

export function createResourceRecordWithSynthetic(
  items: Record<string, ResourceProps>
): Record<number, ResourceProps> {
  const numericRecord = toNumericResourceRecord(items);
  injectSyntheticEntities(numericRecord as Record<number, any>);
  return numericRecord;
}

export function ensureSyntheticResourceEntries(
  resources: Record<number, ResourceProps>
): { resources: Record<number, ResourceProps>; addedSynthetic: boolean } {
  if (resources[CREDITS_ID]) {
    return { resources, addedSynthetic: false };
  }

  const patched = { ...resources };
  injectSyntheticEntities(patched as Record<number, any>);
  return { resources: patched, addedSynthetic: true };
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
