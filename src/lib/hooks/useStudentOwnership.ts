import { db } from '@/lib/db/database';
import { studentDataStore } from '@/lib/stores/studentStore';

/**
 * Read/update student ownership (recruited/not recruited). Stored as
 * `isOwned?: boolean` on `FormRecord`: `undefined`/`true` = owned (backward-compat
 * default), `false` = not recruited. The canonical check is `isOwned !== false`.
 */
export function useStudentOwnership() {
  /**
   * Persist a new ownership value for a student and update the in-memory store.
   * Assumes the student already has a FormRecord (created by initializeStudentFormData).
   */
  async function setOwned(studentId: number, owned: boolean) {
    await db.forms.where('studentId').equals(studentId).modify({ isOwned: owned });

    // Update in-memory store so all reactive consumers (computed, templates) update
    const current = studentDataStore.value[studentId];
    if (current) {
      studentDataStore.value = {
        ...studentDataStore.value,
        [studentId]: { ...current, isOwned: owned },
      };
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
