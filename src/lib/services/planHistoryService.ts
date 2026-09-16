import {
  db,
  type FormRecord,
  type PlanHistoryChange,
  type PlanHistoryRecord,
  type PlanHistorySource,
} from '../db/database';

const PLAN_HISTORY_LIMIT = 30;
const PLAN_HISTORY_MERGE_WINDOW_MS = 5_000;

function isSameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => isSameValue(value, right[index]));
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  if (leftKeys.length !== rightKeys.length) return false;

  return leftKeys.every(
    (key, index) => key === rightKeys[index] && isSameValue(leftRecord[key], rightRecord[key]),
  );
}

/** Records one committed plan event and keeps only the newest global entries. */
export async function recordPlanHistoryEvent(
  source: PlanHistorySource,
  candidates: PlanHistoryChange[],
): Promise<void> {
  const changes = candidates
    .filter((change) => !isSameValue(change.before, change.after))
    .map((change) => structuredClone(change));
  if (changes.length === 0) return;

  try {
    await db.transaction('rw', db.plan_history, async () => {
      const createdAt = Date.now();
      const latest = await db.plan_history.orderBy('createdAt').last();
      const latestChange = latest?.changes[0];
      const nextChange = changes[0];
      const canMerge =
        (source === 'students' || source === 'bonds') &&
        latest?.id !== undefined &&
        latest.source === source &&
        latest.changes.length === 1 &&
        changes.length === 1 &&
        latestChange !== undefined &&
        nextChange !== undefined &&
        latestChange.studentId === nextChange.studentId &&
        createdAt - latest.createdAt <= PLAN_HISTORY_MERGE_WINDOW_MS &&
        isSameValue(latestChange.after, nextChange.before);

      if (canMerge && latest?.id !== undefined && latestChange && nextChange) {
        const mergedChange = {
          studentId: nextChange.studentId,
          before: latestChange.before,
          after: nextChange.after,
        };
        if (isSameValue(mergedChange.before, mergedChange.after)) {
          await db.plan_history.delete(latest.id);
        } else {
          await db.plan_history.put({
            ...latest,
            createdAt,
            changes: [mergedChange],
          });
        }
        return;
      }

      await db.plan_history.add({ createdAt, source, changes });
      const excess = (await db.plan_history.count()) - PLAN_HISTORY_LIMIT;
      if (excess <= 0) return;

      const oldestKeys = await db.plan_history.orderBy('createdAt').limit(excess).primaryKeys();
      await db.plan_history.bulkDelete(oldestKeys);
    });
  } catch (error) {
    console.error('Failed to record plan history:', error);
  }
}

/** Returns retained plan events with the most recent edit first. */
export async function getPlanHistory(): Promise<PlanHistoryRecord[]> {
  return db.plan_history.orderBy('createdAt').reverse().toArray();
}

/** Restores the state preceding one edit and records the restore as a new event. */
export async function restorePlanHistoryChange(
  eventId: number,
  studentId: number,
): Promise<FormRecord | null> {
  const event = await db.plan_history.get(eventId);
  const historicalChange = event?.changes.find((change) => change.studentId === studentId);
  if (!historicalChange) return null;

  const current = (await db.forms.get(studentId)) ?? { studentId };
  const restored = structuredClone(historicalChange.before);
  if (isSameValue(current, restored)) return restored;

  await db.forms.put(restored);
  await recordPlanHistoryEvent('restore', [{ studentId, before: current, after: restored }]);
  return restored;
}

/** Removes recovery entries after a full data import replaces all forms. */
export async function clearPlanHistory(): Promise<boolean> {
  try {
    await db.plan_history.clear();
    return true;
  } catch (error) {
    console.error('Failed to clear plan history:', error);
    return false;
  }
}

export { PLAN_HISTORY_LIMIT };
