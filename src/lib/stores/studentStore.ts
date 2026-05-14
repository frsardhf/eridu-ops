import { ref, computed, unref, type Ref } from 'vue';
import { getFormData, saveFormData } from '../utils/studentStorage';
import type { FormRecord } from '../db/database';
import { toNumericId } from '../utils/idCoercion';

// Deep-reactive store. Reads inside computeds register fine-grained dependencies;
// writes use the spread pattern below for clarity (also reassigns the top-level ref).
export const studentDataStore = ref<Record<number, FormRecord>>({});

export async function updateStudentData(studentId: string | number) {
  const numericId = toNumericId(studentId);
  const data = await getFormData(studentId);
  if (data) {
    studentDataStore.value = {
      ...studentDataStore.value,
      [numericId]: data as FormRecord
    };
  }
}

// Sync read — call updateStudentData() first to ensure data is loaded.
export function getStudentData(studentId: string | number): FormRecord | undefined {
  const numericId = toNumericId(studentId);
  return studentDataStore.value[numericId];
}

export async function saveStudentFormData(studentId: string | number, formData: Partial<FormRecord>) {
  await saveFormData(studentId, formData);
  await updateStudentData(studentId);
}

export function clearStudentData(studentId: string | number) {
  const numericId = toNumericId(studentId);
  const newStore = { ...studentDataStore.value };
  delete newStore[numericId];
  studentDataStore.value = newStore;
}

/**
 * Reactive accessor for a single student's form data.
 */
export function useStudentFormData(studentId: Ref<number> | number) {
  return computed(() => {
    const id = unref(studentId);
    return studentDataStore.value[id];
  });
}

/**
 * Synchronous direct write — bypasses the IndexedDB load step in updateStudentData.
 */
export function setStudentDataDirect(studentId: number, data: FormRecord) {
  studentDataStore.value = {
    ...studentDataStore.value,
    [studentId]: data
  };
}

/**
 * Batch update — more efficient than calling setStudentDataDirect in a loop.
 */
export function batchSetStudentData(records: Record<number, FormRecord>) {
  studentDataStore.value = {
    ...studentDataStore.value,
    ...records
  };
}
