import { ref } from 'vue';
import { getFormData, saveFormData } from '../utils/studentStorage';

// Create a reactive store for student data
export const studentDataStore = ref<Record<string, any>>({});

// Function to update student data in the store (async)
export async function updateStudentData(studentId: string | number) {
  const data = await getFormData(studentId);
  if (data) {
    studentDataStore.value[studentId] = data;
  }
}

// Function to get student data from the store (sync - reads from cache only)
// Use updateStudentData() first to ensure data is loaded
export function getStudentData(studentId: string | number) {
  return studentDataStore.value[studentId];
}

// Function to save student form data to IndexedDB and update store
export async function saveStudentFormData(studentId: string | number, formData: any) {
  await saveFormData(studentId, formData);
  await updateStudentData(studentId);
}

// Function to clear student data from the store
export function clearStudentData(studentId: string | number) {
  delete studentDataStore.value[studentId];
} 