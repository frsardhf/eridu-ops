import { ref } from 'vue';
import { Material } from '../../types/upgrade';

/**
 * Materials store - now in-memory only (not persisted)
 * Materials are calculated on-demand from student form data
 * This store is just a reactive cache for performance
 */

// Create a reactive store for materials data (in-memory only)
const materialsDataStore = ref<Record<string, Material[]>>({});

// Function to update materials data in the store (in-memory only)
export function updateMaterialsData(studentId: string | number, materials: Material[]) {
  materialsDataStore.value[studentId] = materials;
  // No longer persisted to localStorage/IndexedDB
}

// Function to get materials data from the store
export function getMaterialsData(studentId: string | number): Material[] {
  return materialsDataStore.value[studentId] || [];
}

// Function to clear materials data from the store
export function clearMaterialsData(studentId: string | number) {
  delete materialsDataStore.value[studentId];
  // No longer persisted to localStorage/IndexedDB
}

// Function to get all materials data
export function getAllMaterialsData(): Record<string, Material[]> {
  return materialsDataStore.value;
}

// Function to clear all materials data
export function clearAllMaterialsData() {
  materialsDataStore.value = {};
  // No longer persisted to localStorage/IndexedDB
}