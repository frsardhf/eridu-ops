import { describe, expect, it, vi } from 'vitest';
import type { FormRecord, PlanHistoryRecord } from '@/lib/db/database';
import { restorePlanHistoryChange } from '../planHistoryService';

const storage = vi.hoisted(() => ({
  current: { studentId: 1 } as FormRecord,
  event: undefined as PlanHistoryRecord | undefined,
  put: vi.fn(),
}));
vi.mock('@/lib/db/database', () => ({
  db: {
    transaction: async (_mode: string, _table: unknown, write: () => Promise<void>) => write(),
    forms: { get: async () => storage.current, put: storage.put },
    plan_history: {
      get: async () => storage.event,
      orderBy: () => ({ last: async () => undefined }),
      add: vi.fn(),
      count: async () => 1,
    },
  },
}));

describe('restoring future upgrade plans', () => {
  it.each([true, false, undefined])(
    'restores the saved planning preference (%s)',
    async (enabled) => {
      storage.put.mockClear();
      const previous: FormRecord = {
        studentId: 1,
        isOwned: false,
        characterLevels: { current: 1, target: 80 },
        ...(enabled === undefined ? {} : { planEnabled: enabled }),
      };
      storage.current = { studentId: 1, isOwned: true, planEnabled: !enabled };
      storage.event = {
        id: 10,
        createdAt: 1,
        source: 'students',
        changes: [{ studentId: 1, before: previous, after: storage.current }],
      };
      expect(await restorePlanHistoryChange(10, 1)).toEqual(previous);
      expect(storage.put).toHaveBeenCalledWith(previous);
    },
  );
});
