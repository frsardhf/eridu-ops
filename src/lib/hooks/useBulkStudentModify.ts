import {
  applyBulkStudentFormPatch,
  bulkSetStudentOwnership,
  classifyStudentAvailability,
  getBulkFilterData,
  type BulkFormPatch,
  type AvailabilityFilter,
} from '../services/bulkStudentFormService';
import { batchSetStudentData } from '../stores/studentStore';
import { preloadAllStudentsData } from '../utils/materialUtils';
import type { FormRecord } from '../db/database';
import type { StudentProps } from '@/types/student';

// Re-export types and pure utilities so BulkModifyStudentsModal only imports from hooks
export { classifyStudentAvailability, getBulkFilterData };
export type { BulkFormPatch, AvailabilityFilter };
export type { FormRecord } from '../db/database';

/**
 * Hook facade for BulkModifyStudentsModal: aggregates service and store
 * imports so the component stays within the components -> hooks boundary.
 */
export function useBulkStudentModify() {
  async function bulkSetOwnership(
    ids: number[],
    owned: boolean,
    currentForms: Record<number, FormRecord>,
  ): Promise<Record<number, FormRecord>> {
    const updates = await bulkSetStudentOwnership(ids, owned, currentForms);
    batchSetStudentData(updates);
    return updates;
  }

  async function submitBulkPatch(
    students: StudentProps[],
    selectedIds: number[],
    patch: BulkFormPatch,
  ): Promise<Record<number, FormRecord>> {
    const updatedRecords = await applyBulkStudentFormPatch(students, selectedIds, patch);
    if (Object.keys(updatedRecords).length > 0) {
      batchSetStudentData(updatedRecords);

      const updatedStudents: Record<string, StudentProps> = {};
      for (const student of students) {
        if (student.Id in updatedRecords) updatedStudents[student.Id] = student;
      }
      preloadAllStudentsData(updatedStudents, updatedRecords);
    }
    return updatedRecords;
  }

  return { bulkSetOwnership, submitBulkPatch };
}
