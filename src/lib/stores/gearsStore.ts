import { ref } from 'vue';
import { Material } from '../../types/upgrade';
import { toNumericId } from '../utils/idCoercion';

/**
 * In-memory reactive cache for per-student equipment-material calculations.
 * Derived from form state; not persisted.
 */

const gearsDataStore = ref<Record<number, Material[]>>({});

export function updateGearsData(studentId: string | number, gears: Material[]) {
  const numericId = toNumericId(studentId);
  gearsDataStore.value[numericId] = gears;
}

export function getAllGearsData(): Record<number, Material[]> {
  return gearsDataStore.value;
}