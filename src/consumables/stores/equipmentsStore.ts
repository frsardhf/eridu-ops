import { ref } from 'vue';
import { Material } from '../../types/upgrade';

/**
 * Equipment/Gears store - now in-memory only (not persisted)
 * Equipment materials are calculated on-demand from student form data
 * This store is just a reactive cache for performance
 */

// Create a reactive store for gears data (in-memory only)
const gearsDataStore = ref<Record<string, Material[]>>({});

// Function to update gears data in the store (in-memory only)
export function updateGearsData(studentId: string | number, gears: Material[]) {
  gearsDataStore.value[studentId] = gears;
  // No longer persisted to localStorage/IndexedDB
}

// Function to get gears data from the store
export function getGearsData(studentId: string | number): Material[] {
  return gearsDataStore.value[studentId] || [];
}

// Function to clear gears data from the store
export function clearGearsData(studentId: string | number) {
  delete gearsDataStore.value[studentId];
  // No longer persisted to localStorage/IndexedDB
}

// Function to get all gears data
export function getAllGearsData(): Record<string, Material[]> {
  return gearsDataStore.value;
}

// Function to clear all gears data
export function clearAllGearsData() {
  gearsDataStore.value = {};
  // No longer persisted to localStorage/IndexedDB
}