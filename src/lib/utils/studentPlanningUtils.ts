import type { FormRecord } from '../db/database';

/** Future planning is independent of regional availability and material deficits. */
export function isFutureStudentPlan(
  form: Pick<FormRecord, 'isOwned' | 'planEnabled'> | undefined,
): boolean {
  return form?.isOwned === false && form.planEnabled === true;
}

/** Includes recruited students and explicitly enabled future upgrade plans. */
export function isUpgradePlanActive(
  form: Pick<FormRecord, 'isOwned' | 'planEnabled'> | undefined,
): boolean {
  return form?.isOwned !== false || form.planEnabled === true;
}
