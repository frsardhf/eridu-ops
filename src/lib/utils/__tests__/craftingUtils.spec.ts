import { describe, expect, it } from 'vitest';
import { createCraftingFodderSession, createCraftingStagePlan } from '../craftingUtils';

describe('createCraftingStagePlan', () => {
  it('pairs disjoint stage capacities at the smaller capacity', () => {
    const plan = createCraftingStagePlan([
      { materialId: 1, craftCapacity: 10, stage1Eligible: true, stage2Eligible: false },
      { materialId: 2, craftCapacity: 4, stage1Eligible: false, stage2Eligible: true },
    ]);

    expect(plan.fullCrafts).toBe(4);
    expect(plan.stage1Capacity).toBe(10);
    expect(plan.stage2Capacity).toBe(4);
  });

  it('splits shared capacity without counting a batch twice', () => {
    const plan = createCraftingStagePlan([
      { materialId: 1, craftCapacity: 10, stage1Eligible: true, stage2Eligible: true },
    ]);

    expect(plan.fullCrafts).toBe(5);
    expect(plan.stage1Capacity).toBe(10);
    expect(plan.stage2Capacity).toBe(10);
  });

  it('combines stage-only and shared capacities', () => {
    const plan = createCraftingStagePlan([
      { materialId: 1, craftCapacity: 4, stage1Eligible: true, stage2Eligible: false },
      { materialId: 2, craftCapacity: 6, stage1Eligible: true, stage2Eligible: true },
    ]);

    expect(plan.fullCrafts).toBe(5);
    expect(plan.stage1Capacity).toBe(10);
    expect(plan.stage2Capacity).toBe(6);
  });

  it('returns no plan without both stages', () => {
    const plan = createCraftingStagePlan([
      { materialId: 1, craftCapacity: 10, stage1Eligible: true, stage2Eligible: false },
    ]);

    expect(plan).toEqual({
      fullCrafts: 0,
      stage1Capacity: 10,
      stage2Capacity: 0,
    });
  });
});

describe('createCraftingFodderSession', () => {
  it('keeps every eligible stage material in the session', () => {
    const session = createCraftingFodderSession('source', [
      {
        materialId: 1,
        craftCapacity: 10,
        excessItems: 0,
        itemsPerCraft: 4,
        stage1Eligible: true,
        stage2Eligible: false,
      },
      {
        materialId: 2,
        craftCapacity: 8,
        excessItems: 1,
        itemsPerCraft: 2,
        stage1Eligible: false,
        stage2Eligible: true,
      },
      {
        materialId: 3,
        craftCapacity: 6,
        excessItems: 0,
        itemsPerCraft: 1,
        stage1Eligible: false,
        stage2Eligible: true,
      },
    ]);

    expect(session.fullCraftCapacity).toBe(10);
    expect(Object.keys(session.entries)).toEqual(['1', '2', '3']);
    expect(
      Object.values(session.entries)
        .filter((entry) => entry.stage2Eligible)
        .map((entry) => entry.materialId),
    ).toEqual([2, 3]);
  });
});
