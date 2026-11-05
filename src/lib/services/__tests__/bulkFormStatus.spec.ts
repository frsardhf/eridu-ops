import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormRecord } from '@/lib/db/database';
import type { StudentProps } from '@/types/student';
import { buildDefaultFormData } from '../studentFormService';
import { getBulkFilterData } from '../bulkStudentFormService';

const storage = vi.hoisted(() => ({ forms: [] as FormRecord[] }));
vi.mock('@/lib/db/database', () => ({ db: { forms: { toArray: async () => storage.forms } } }));
const student = { Id: 1, StarGrade: 3, Equipment: ['Hat', 'Hairpin', 'Watch'] } as StudentProps;

beforeEach(() => {
  storage.forms = [];
});

describe('bulk form status', () => {
  it.each([
    undefined,
    { studentId: 1, isOwned: true },
    { studentId: 1, isOwned: false, planEnabled: true },
    buildDefaultFormData(student),
  ])(
    'treats missing, metadata-only, and untouched default forms as unfilled (%j)',
    async (form) => {
      storage.forms = form ? [form] : [];
      expect((await getBulkFilterData([student])).nonDefaultIds.size).toBe(0);
    },
  );

  it.each<Partial<FormRecord>>([
    { characterLevels: { current: 20, target: 20 } },
    { characterLevels: { current: 1, target: 80 } },
    { bondDetailData: { currentBond: 1, currentBondExp: 2 } },
    { giftFormData: { '1': 2 } },
    {
      otherExpData: {
        cafeTapsPerDay: 3,
        cafeStartDateIso: '',
        cafeTargetDateIso: '',
        cafeDateInclusive: false,
        bonusExp: 25,
      },
    },
    {
      otherExpData: {
        cafeTapsPerDay: 3,
        cafeStartDateIso: '',
        cafeTargetDateIso: '2027-01-01',
        cafeDateInclusive: false,
        bonusExp: 0,
      },
    },
  ])('recognizes changed progression and planning inputs as filled (%j)', async (patch) => {
    storage.forms = [{ ...buildDefaultFormData(student), ...patch }];
    expect((await getBulkFilterData([student])).nonDefaultIds.has(1)).toBe(true);
  });
});
