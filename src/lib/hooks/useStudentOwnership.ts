import { studentDataStore } from '@/lib/stores/studentStore';
import { saveFormData } from '@/lib/services/studentPersistenceService';

/**
 * Read/update student ownership (recruited/not recruited). Stored as
 * `isOwned?: boolean` on `FormRecord`: `undefined`/`true` = owned (backward-compat
 * default), `false` = not recruited. The canonical check is `isOwned !== false`.
 */
export function useStudentOwnership() {
  /** Persists ownership with plan history and updates the in-memory store. */
  async function setOwned(studentId: number, owned: boolean) {
    const saved = await saveFormData(studentId, { isOwned: owned }, 'students');
    if (saved) {
      studentDataStore.value = {
        ...studentDataStore.value,
        [studentId]: saved,
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
