import { ref, onMounted } from 'vue';
import { Material } from '../../types/upgrade';
import { saveMaterialsData, getAllMaterialsData as getStoredMaterialsData } from '../utils/studentStorage';

// Create a reactive store for materials data
const materialsDataStore = ref<Record<string, Material[]>>({});

// Initialize the store from localStorage
const initializeStore = () => {
  const storedMaterials = getStoredMaterialsData();
  if (storedMaterials && Object.keys(storedMaterials).length) {
    materialsDataStore.value = storedMaterials;
  }
};

// Initialize the store on mount
if (typeof window !== 'undefined') {
  initializeStore();
}

// Function to update materials data in the store
export function updateMaterialsData(studentId: string | number, materials: Material[]) {
  materialsDataStore.value[studentId] = materials;
  
  // Save to localStorage
  saveMaterialsData(studentId, materials);
}

// Function to get materials data from the store
export function getMaterialsData(studentId: string | number): Material[] {
  return materialsDataStore.value[studentId] || [];
}

// Function to clear materials data from the store
export function clearMaterialsData(studentId: string | number) {
  delete materialsDataStore.value[studentId];
  
  // Save to localStorage (empty array to represent cleared data)
  saveMaterialsData(studentId, []);
}

// Function to get all materials data
export function getAllMaterialsData(): Record<string, Material[]> {
  return materialsDataStore.value;
}

// Function to clear all materials data
export function clearAllMaterialsData() {
  materialsDataStore.value = {};
  
  // Save empty object to localStorage
  Object.keys(materialsDataStore.value).forEach(studentId => {
    saveMaterialsData(studentId, []);
  });
}