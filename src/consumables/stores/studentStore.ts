import { ref } from 'vue';
import { getFormData } from '../utils/studentStorage';

// Create a reactive store for student data
const studentDataStore = ref<Record<string, any>>({});

// Function to update student data in the store
export function updateStudentData(studentId: string | number) {
  const data = getFormData(studentId);
  if (data) {
    studentDataStore.value[studentId] = data;
  }
}

// Function to get student data from the store
export function getStudentData(studentId: string | number) {
  if (!studentDataStore.value[studentId]) {
    updateStudentData(studentId);
  }
  return studentDataStore.value[studentId];
}

// Function to clear student data from the store
export function clearStudentData(studentId: string | number) {
  delete studentDataStore.value[studentId];
} 