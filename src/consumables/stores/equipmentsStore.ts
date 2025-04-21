import { ref } from 'vue';
import { Material } from '../../types/upgrade';
import { saveGearsData, getAllGearsData as getStoredGearsData } from '../utils/studentStorage';
import { preloadAllStudentsData } from '../utils/materialUtils';

// Create a reactive store for gears data
const gearsDataStore = ref<Record<string, Material[]>>({});

// Initialize the store from localStorage
const initializeStore = () => {
  // Load the saved gears data
  const storedGears = getStoredGearsData();
  if (storedGears && Object.keys(storedGears).length) {
    gearsDataStore.value = storedGears;
  }
  
  // Preload gears for all students with target upgrades
  preloadAllStudentsData();
};

// Initialize the store on mount
if (typeof window !== 'undefined') {
  initializeStore();
}


// Function to update gears data in the store
export function updateGearsData(studentId: string | number, gears: Material[]) {
  gearsDataStore.value[studentId] = gears;
  saveGearsData(studentId, gears);
}

// Function to get gears data from the store
export function getGearsData(studentId: string | number): Material[] {
  return gearsDataStore.value[studentId] || [];
}

// Function to clear gears data from the store
export function clearGearsData(studentId: string | number) {
  delete gearsDataStore.value[studentId];
  saveGearsData(studentId, []);
}

// Function to get all gears data
export function getAllGearsData(): Record<string, Material[]> {
  return gearsDataStore.value;
}

// Function to clear all gears data
export function clearAllGearsData() {
  gearsDataStore.value = {};
  // Clear all in localStorage
  Object.keys(gearsDataStore.value).forEach(studentId => {
    saveGearsData(studentId, []);
  });
}