import { ref } from 'vue';
import { Material } from '../../types/upgrade';
import { toNumericId } from '../utils/idCoercion';

/**
 * Materials store - now in-memory only (not persisted)
 * Materials are calculated on-demand from student form data
 * This store is just a reactive cache for performance
 */

// Create a reactive store for materials data (in-memory only)
// Uses number keys for consistency with database IDs
const materialsDataStore = ref<Record<number, Material[]>>({});

// Function to update materials data in the store (in-memory only)
export function updateMaterialsData(studentId: string | number, materials: Material[]) {
  const numericId = toNumericId(studentId);
  materialsDataStore.value[numericId] = materials;
  // No longer persisted to localStorage/IndexedDB
}

// Function to get materials data from the store
export function getMaterialsData(studentId: string | number): Material[] {
  const numericId = toNumericId(studentId);
  return materialsDataStore.value[numericId] || [];
}

// Function to clear materials data from the store
export function clearMaterialsData(studentId: string | number) {
  const numericId = toNumericId(studentId);
  delete materialsDataStore.value[numericId];
  // No longer persisted to localStorage/IndexedDB
}

// Function to get all materials data
export function getAllMaterialsData(): Record<number, Material[]> {
  return materialsDataStore.value;
}

// Function to clear all materials data
export function clearAllMaterialsData() {
  materialsDataStore.value = {};
  // No longer persisted to localStorage/IndexedDB
}