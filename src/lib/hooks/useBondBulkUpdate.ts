import { applyBondUpdates } from '../services/bulkStudentFormService';
import { batchSetStudentData, studentDataStore } from '../stores/studentStore';

/**
 * Hook facade for BondUpdateModal — aggregates service and store imports
 * so the component stays within the components → hooks boundary.
 */
export function useBondBulkUpdate() {
  async function applyBulkBondUpdates(
    updates: { studentId: number; bond: number }[]
  ): Promise<void> {
    const updated = await applyBondUpdates(updates);
    batchSetStudentData(updated);
  }

  function currentBondOf(studentId: number): number {
    return studentDataStore.value[studentId]?.bondDetailData?.currentBond ?? 1;
  }

  return { applyBulkBondUpdates, currentBondOf };
}
