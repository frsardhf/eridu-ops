import { ref } from 'vue';
import { Material } from '../../types/upgrade';
import { saveMaterialsData, getAllMaterialsData as getStoredMaterialsData } from '../utils/studentStorage';
import { preloadAllStudentsData } from '../utils/materialUtils';

// Create a reactive store for materials data
const materialsDataStore = ref<Record<string, Material[]>>({});

// Function to update materials data in the store
export function updateMaterialsData(studentId: string | number, materials: Material[]) {
  materialsDataStore.value[studentId] = materials;
  saveMaterialsData(studentId, materials);
}

// Function to get materials data from the store
export function getMaterialsData(studentId: string | number): Material[] {
  return materialsDataStore.value[studentId] || [];
}

// Function to clear materials data from the store
export function clearMaterialsData(studentId: string | number) {
  delete materialsDataStore.value[studentId];
  saveMaterialsData(studentId, []);
}

// Function to get all materials data
export function getAllMaterialsData(): Record<string, Material[]> {
  return materialsDataStore.value;
}

// Function to clear all materials data
export function clearAllMaterialsData() {
  materialsDataStore.value = {};
  // Clear all in localStorage
  Object.keys(materialsDataStore.value).forEach(studentId => {
    saveMaterialsData(studentId, []);
  });
}