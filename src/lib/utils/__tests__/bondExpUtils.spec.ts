import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateGiftStackExp,
  computeCafeDays,
  computeCafeExp,
  computeOtherExpTotal,
  computeStudentBondExpTotal,
  dateToIso,
  isoToDate,
} from '../bondExpUtils';
import { CAFE_TAP_EXP } from '@/lib/constants/gameConstants';
import type { GiftProps, OtherExpDataProps } from '@/types/gift';
import type { ResourceProps } from '@/types/resource';

function makeGift(id: number, exp: number): GiftProps {
  return { gift: { Id: id } as ResourceProps, exp, grade: 1 };
}

function makeOtherExp(overrides: Partial<OtherExpDataProps> = {}): OtherExpDataProps {
  return {
    cafeTapsPerDay: 0,
    cafeStartDateIso: '',
    cafeTargetDateIso: '',
    cafeDateInclusive: false,
    bonusExp: 0,
    ...overrides,
  };
}

describe('calculateGiftStackExp', () => {
  const gifts = [makeGift(1, 20), makeGift(2, 60), makeGift(3, 120)];

  it('multiplies each allocated quantity by its gift EXP and sums', () => {
    expect(calculateGiftStackExp(gifts, { '1': 2, '3': 1 })).toBe(20 * 2 + 120);
  });

  it('ignores zero, negative, and unknown-id allocations', () => {
    expect(calculateGiftStackExp(gifts, { '1': 0, '2': -3, '999': 5 })).toBe(0);
  });

  it('returns 0 for missing items or form data', () => {
    expect(calculateGiftStackExp(undefined, { '1': 2 })).toBe(0);
    expect(calculateGiftStackExp([], { '1': 2 })).toBe(0);
    expect(calculateGiftStackExp(gifts, undefined)).toBe(0);
  });

  it('falls back to the legacy nested gift.exp shape', () => {
    const legacy = {
      gift: { Id: 7, exp: 35 } as ResourceProps & { exp: number },
      grade: 1,
    } as unknown as GiftProps;
    expect(calculateGiftStackExp([legacy], { '7': 2 })).toBe(70);
  });
});

describe('isoToDate / dateToIso', () => {
  it('round-trips a calendar date', () => {
    expect(dateToIso(isoToDate('2026-06-10'))).toBe('2026-06-10');
  });

  it('returns null / empty for invalid input', () => {
    expect(isoToDate('')).toBeNull();
    expect(isoToDate('not-a-date')).toBeNull();
    expect(dateToIso(null)).toBe('');
  });
});

describe('computeCafeDays', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts whole days between start and end', () => {
    expect(computeCafeDays('2026-06-10', '2026-06-13', false)).toBe(3);
  });

  it('adds the end date itself when inclusive', () => {
    expect(computeCafeDays('2026-06-10', '2026-06-13', true)).toBe(4);
    expect(computeCafeDays('2026-06-10', '2026-06-10', true)).toBe(1);
    expect(computeCafeDays('2026-06-10', '2026-06-10', false)).toBe(0);
  });

  it('returns 0 when the end date is missing, invalid, or in the past', () => {
    expect(computeCafeDays('2026-06-10', '', true)).toBe(0);
    expect(computeCafeDays('2026-06-10', 'garbage', true)).toBe(0);
    expect(computeCafeDays('2026-06-10', '2026-06-01', true)).toBe(0);
  });

  it('treats an empty start date as today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T15:30:00'));
    expect(computeCafeDays('', '2026-06-12', false)).toBe(2);
    expect(computeCafeDays('', '2026-06-12', true)).toBe(3);
  });
});

describe('computeCafeExp', () => {
  it('multiplies taps by days by the per-tap EXP constant', () => {
    expect(computeCafeExp(3, 7)).toBe(3 * 7 * CAFE_TAP_EXP);
  });

  it('clamps negative inputs to 0', () => {
    expect(computeCafeExp(-2, 7)).toBe(0);
    expect(computeCafeExp(3, -1)).toBe(0);
  });
});

describe('computeOtherExpTotal', () => {
  it('combines cafe EXP and bonus EXP', () => {
    const other = makeOtherExp({
      cafeTapsPerDay: 2,
      cafeStartDateIso: '2026-06-10',
      cafeTargetDateIso: '2026-06-12',
      cafeDateInclusive: true,
      bonusExp: 100,
    });
    expect(computeOtherExpTotal(other)).toBe(2 * 3 * CAFE_TAP_EXP + 100);
  });

  it('clamps negative bonus EXP and handles undefined', () => {
    expect(computeOtherExpTotal(makeOtherExp({ bonusExp: -50 }))).toBe(0);
    expect(computeOtherExpTotal(undefined)).toBe(0);
  });
});

describe('computeStudentBondExpTotal', () => {
  it('composes gifts, boxes, and other EXP', () => {
    const total = computeStudentBondExpTotal({
      favoredGifts: [makeGift(1, 20)],
      giftFormData: { '1': 3 },
      giftBoxes: [makeGift(50, 120)],
      boxFormData: { '50': 2 },
      otherExp: makeOtherExp({ bonusExp: 45 }),
    });
    expect(total).toBe(60 + 240 + 45);
  });

  it('returns 0 with no sources', () => {
    expect(computeStudentBondExpTotal({})).toBe(0);
  });
});
