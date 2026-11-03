import { studentDataStore } from '@/lib/stores/studentStore';
import { saveFormData } from '@/lib/services/studentPersistenceService';
import { getPrimaryStudentId } from '../constants/linkedStudents';
import { isUpgradePlanActive } from '../utils/studentPlanningUtils';
import type { FormRecord } from '../db/database';

/**
 * Read/update student ownership (recruited/not recruited). Stored as
 * `isOwned?: boolean` on `FormRecord`: `undefined`/`true` = owned (backward-compat
 * default), `false` = not recruited. The canonical check is `isOwned !== false`.
 */
export function useStudentOwnership() {
  async function saveState(
    studentId: number,
    patch: Pick<FormRecord, 'isOwned' | 'planEnabled'>,
  ): Promise<boolean> {
    const id = getPrimaryStudentId(studentId);
    const saved = await saveFormData(id, patch, 'students');
    if (saved) {
      studentDataStore.value = {
        ...studentDataStore.value,
        [id]: saved,
      };
    }
    return saved !== null;
  }

  /** Persists ownership without discarding existing upgrade targets. */
  function setOwned(studentId: number, owned: boolean): Promise<boolean> {
    return saveState(studentId, { isOwned: owned });
  }

  /** Toggles participation in upgrade budgets without changing ownership or targets. */
  function setPlanEnabled(studentId: number, enabled: boolean): Promise<boolean> {
    return saveState(studentId, { planEnabled: enabled });
  }

  function isStudentPlanActive(studentId: number): boolean {
    return isUpgradePlanActive(studentDataStore.value[getPrimaryStudentId(studentId)]);
  }

  function isStudentPlanned(studentId: number): boolean {
    const form = studentDataStore.value[getPrimaryStudentId(studentId)];
    return form?.isOwned === false && form.planEnabled === true;
  }

  /**
   * Returns true if the student is owned (or has never been marked as unowned).
   * Treats missing / undefined as owned for backward compatibility.
   */
  function isStudentOwned(studentId: number): boolean {
    return studentDataStore.value[getPrimaryStudentId(studentId)]?.isOwned !== false;
  }

  return { setOwned, setPlanEnabled, isStudentOwned, isStudentPlanActive, isStudentPlanned };
}
