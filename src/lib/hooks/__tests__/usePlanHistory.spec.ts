// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { getPlanHistoryChangeDetails, type PlanHistoryChange } from '../usePlanHistory';
import { DEFAULT_OTHER_EXP } from '../../../types/gift';

describe('getPlanHistoryChangeDetails', () => {
  it('ignores hydrated defaults when equipment changes', () => {
    const change: PlanHistoryChange = {
      studentId: 1,
      before: {
        studentId: 1,
        equipmentLevels: {
          Hat: { current: 9, target: 9 },
          Gloves: { current: 9, target: 9 },
          Shoes: { current: 9, target: 9 },
        },
      },
      after: {
        studentId: 1,
        equipmentLevels: {
          Hat: { current: 10, target: 10 },
          Gloves: { current: 10, target: 10 },
          Shoes: { current: 10, target: 10 },
        },
        exclusiveGearLevel: { current: 0, target: 0 },
        otherExpData: DEFAULT_OTHER_EXP,
      },
    };

    expect(getPlanHistoryChangeDetails(change).map(({ field }) => field)).toEqual(['equipment']);
  });

  it('still reports a real other EXP change from a missing stored default', () => {
    const change: PlanHistoryChange = {
      studentId: 1,
      before: { studentId: 1 },
      after: {
        studentId: 1,
        otherExpData: { ...DEFAULT_OTHER_EXP, bonusExp: 15 },
      },
    };

    expect(getPlanHistoryChangeDetails(change).map(({ field }) => field)).toEqual(['otherExp']);
  });

  it('describes matching equipment current and target changes as one transition per slot', () => {
    const change: PlanHistoryChange = {
      studentId: 1,
      before: {
        studentId: 1,
        equipmentLevels: {
          Hat: { current: 9, target: 9 },
          Gloves: { current: 9, target: 9 },
          Shoes: { current: 9, target: 9 },
        },
      },
      after: {
        studentId: 1,
        equipmentLevels: {
          Hat: { current: 10, target: 10 },
          Gloves: { current: 10, target: 10 },
          Shoes: { current: 10, target: 10 },
        },
      },
    };

    expect(getPlanHistoryChangeDetails(change)).toEqual([
      {
        field: 'equipment',
        changes: ['Hat: T9 → T10', 'Gloves: T9 → T10', 'Shoes: T9 → T10'],
      },
    ]);
  });

  it('distinguishes current and target when only one side of a level pair changes', () => {
    const change: PlanHistoryChange = {
      studentId: 1,
      before: { studentId: 1, characterLevels: { current: 80, target: 80 } },
      after: { studentId: 1, characterLevels: { current: 80, target: 90 } },
    };

    expect(getPlanHistoryChangeDetails(change)).toEqual([
      { field: 'level', changes: ['Target: 80 → 90'] },
    ]);
  });
});
