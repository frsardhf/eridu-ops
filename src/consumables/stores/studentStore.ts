import { ref, computed, unref, type Ref, shallowRef } from 'vue';
import { getFormData, saveFormData } from '../utils/studentStorage';
import type { FormRecord } from '../db/database';
import { toNumericId } from '../utils/idCoercion';

// shallowRef avoids deep reactivity on the wrapped object; mutations must
// produce a new reference (see the spread pattern below).
export const studentDataStore = shallowRef<Record<number, FormRecord>>({});

// Manual epoch counter — watchers depend on this because shallowRef doesn't
// deep-track property writes on the wrapped object.
export const studentDataVersion = ref(0);

export async function updateStudentData(studentId: string | number) {
  const numericId = toNumericId(studentId);
  const data = await getFormData(studentId);
  if (data) {
    studentDataStore.value = {
      ...studentDataStore.value,
      [numericId]: data as FormRecord
    };
    studentDataVersion.value++;
  }
}

// Sync read — call updateStudentData() first to ensure data is loaded.
export function getStudentData(studentId: string | number): FormRecord | undefined {
  const numericId = toNumericId(studentId);
  return studentDataStore.value[numericId];
}

// Function to save student form data to IndexedDB and update store
export async function saveStudentFormData(studentId: string | number, formData: Partial<FormRecord>) {
  await saveFormData(studentId, formData);
  await updateStudentData(studentId);
}

// Function to clear student data from the store
export function clearStudentData(studentId: string | number) {
  const numericId = toNumericId(studentId);
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
