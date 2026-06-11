import { ref, computed, unref, type Ref } from 'vue';
import type { FormRecord } from '../db/database';
import { toNumericId } from '../utils/idCoercion';

// Deep-reactive store. Reads inside computeds register fine-grained dependencies;
// writes use the spread pattern below for clarity (also reassigns the top-level ref).
export const studentDataStore = ref<Record<number, FormRecord>>({});

// Sync read — populate the store first via setStudentDataDirect / batchSetStudentData.
export function getStudentData(studentId: string | number): FormRecord | undefined {
  const numericId = toNumericId(studentId);
  return studentDataStore.value[numericId];
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
 * Synchronous direct write — caller provides the new record (no IndexedDB read).
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
