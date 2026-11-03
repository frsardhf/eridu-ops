import type { FormRecord } from '../db/database';

/** Includes recruited students and explicitly enabled future upgrade plans. */
export function isUpgradePlanActive(
  form: Pick<FormRecord, 'isOwned' | 'planEnabled'> | undefined,
): boolean {
  return form?.isOwned !== false || form.planEnabled === true;
}
