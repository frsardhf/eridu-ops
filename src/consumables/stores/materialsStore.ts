import { ref } from 'vue';
import { Material } from '../../types/upgrade';

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
  const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
  materialsDataStore.value[numericId] = materials;
  // No longer persisted to localStorage/IndexedDB
}

// Function to get materials data from the store
export function getMaterialsData(studentId: string | number): Material[] {
  const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
  return materialsDataStore.value[numericId] || [];
}

// Function to clear materials data from the store
export function clearMaterialsData(studentId: string | number) {
  const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
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