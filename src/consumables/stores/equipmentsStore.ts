import { ref } from 'vue';
import { Material } from '../../types/upgrade';

/**
 * Equipment/Gears store - now in-memory only (not persisted)
 * Equipment materials are calculated on-demand from student form data
 * This store is just a reactive cache for performance
 */

// Create a reactive store for gears data (in-memory only)
// Uses number keys for consistency with database IDs
const gearsDataStore = ref<Record<number, Material[]>>({});

// Function to update gears data in the store (in-memory only)
export function updateGearsData(studentId: string | number, gears: Material[]) {
  const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
  gearsDataStore.value[numericId] = gears;
  // No longer persisted to localStorage/IndexedDB
}

// Function to get gears data from the store
export function getGearsData(studentId: string | number): Material[] {
  const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
  return gearsDataStore.value[numericId] || [];
}

// Function to clear gears data from the store
export function clearGearsData(studentId: string | number) {
  const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
  delete gearsDataStore.value[numericId];
  // No longer persisted to localStorage/IndexedDB
}

// Function to get all gears data
export function getAllGearsData(): Record<number, Material[]> {
  return gearsDataStore.value;
}

// Function to clear all gears data
export function clearAllGearsData() {
  gearsDataStore.value = {};
  // No longer persisted to localStorage/IndexedDB
}