import { ref, computed, unref, type Ref, shallowRef } from 'vue';
import { getFormData, saveFormData } from '../utils/studentStorage';
import type { FormRecord } from '../db/database';

// Create a reactive store for student data
// Using shallowRef to avoid deep reactivity on the entire store object
export const studentDataStore = shallowRef<Record<number, FormRecord>>({});

// Version counter for triggering re-renders without deep watching
// Increment this when store data changes
export const studentDataVersion = ref(0);

// Function to update student data in the store (async)
export async function updateStudentData(studentId: string | number) {
  const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
  const data = await getFormData(studentId);
  if (data) {
    // Create a new object reference to trigger shallowRef reactivity
    studentDataStore.value = {
      ...studentDataStore.value,
      [numericId]: data as FormRecord
    };
    // Increment version to notify watchers
    studentDataVersion.value++;
  }
}

// Function to get student data from the store (sync - reads from cache only)
// Use updateStudentData() first to ensure data is loaded
export function getStudentData(studentId: string | number): FormRecord | undefined {
  const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
  return studentDataStore.value[numericId];
}

// Function to save student form data to IndexedDB and update store
export async function saveStudentFormData(studentId: string | number, formData: Partial<FormRecord>) {
  await saveFormData(studentId, formData);
  await updateStudentData(studentId);
}

// Function to clear student data from the store
export function clearStudentData(studentId: string | number) {
  const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
  const newStore = { ...studentDataStore.value };
  delete newStore[numericId];
  studentDataStore.value = newStore;
  studentDataVersion.value++;
}

/**
 * Composable for getting reactive student form data
 * Use this in components to get properly reactive data without needing deep watchers
 */
export function useStudentFormData(studentId: Ref<number> | number) {
  return computed(() => {
    // Access version to make this computed reactive to store changes
    const _ = studentDataVersion.value;
    const id = unref(studentId);
    return studentDataStore.value[id];
  });
}

/**
 * Set student data directly in the store (for synchronous updates)
 * Use this instead of direct assignment to ensure proper reactivity
 */
export function setStudentDataDirect(studentId: number, data: FormRecord) {
  studentDataStore.value = {
    ...studentDataStore.value,
    [studentId]: data
  };
  studentDataVersion.value++;
}

/**
 * Batch update multiple student records at once
 * More efficient than multiple individual updates
 */
export function batchSetStudentData(records: Record<number, FormRecord>) {
  studentDataStore.value = {
    ...studentDataStore.value,
    ...records
  };
  studentDataVersion.value++;
}
