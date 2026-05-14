import { ref } from 'vue';
import { Material } from '../../types/upgrade';
import { toNumericId } from '../utils/idCoercion';

/**
 * In-memory reactive cache for per-student material calculations.
 * Derived from form state; not persisted.
 */

const materialsDataStore = ref<Record<number, Material[]>>({});

export function updateMaterialsData(studentId: string | number, materials: Material[]) {
  const numericId = toNumericId(studentId);
  materialsDataStore.value[numericId] = materials;
}

export function getMaterialsData(studentId: string | number): Material[] {
  const numericId = toNumericId(studentId);
  return materialsDataStore.value[numericId] || [];
}

export function clearMaterialsData(studentId: string | number) {
  const numericId = toNumericId(studentId);
  delete materialsDataStore.value[numericId];
}

export function getAllMaterialsData(): Record<number, Material[]> {
  return materialsDataStore.value;
}

export function clearAllMaterialsData() {
  materialsDataStore.value = {};
}