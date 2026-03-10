import { db } from '@/consumables/db/database';
import { studentDataStore, studentDataVersion } from '@/consumables/stores/studentStore';

/**
 * Hook for reading and updating student ownership (recruited/not recruited) status.
 *
 * Storage: `isOwned?: boolean` on `FormRecord` in IndexedDB.
 * - `undefined` or `true`  → owned (backward-compatible default)
 * - `false`               → not recruited
 *
 * The check `form?.isOwned !== false` is the canonical "is this student owned?"
 * expression used throughout the codebase.
 */
export function useStudentOwnership() {
  /**
   * Persist a new ownership value for a student and update the in-memory store.
   * Assumes the student already has a FormRecord (created by initializeStudentFormData).
   */
  async function setOwned(studentId: number, owned: boolean) {
    // Write to IndexedDB
    await db.forms.where('studentId').equals(studentId).modify({ isOwned: owned });

    // Update in-memory store so all reactive consumers (computed, templates) update
    const current = studentDataStore.value[studentId];
    if (current) {
      studentDataStore.value = {
        ...studentDataStore.value,
        [studentId]: { ...current, isOwned: owned }
      };
      studentDataVersion.value++;
    }
  }

  /**
   * Returns true if the student is owned (or has never been marked as unowned).
   * Treats missing / undefined as owned for backward compatibility.
   */
  function isStudentOwned(studentId: number): boolean {
    return studentDataStore.value[studentId]?.isOwned !== false;
  }

  return { setOwned, isStudentOwned };
}
