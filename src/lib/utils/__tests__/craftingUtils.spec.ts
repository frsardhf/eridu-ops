import { describe, expect, it } from 'vitest';
import { createCraftingStagePlan } from '../craftingUtils';

function allocated(plan: ReturnType<typeof createCraftingStagePlan>, stage: 'stage1' | 'stage2') {
  const key = stage === 'stage1' ? 'stage1Crafts' : 'stage2Crafts';
  return Object.values(plan.allocations).reduce((sum, item) => sum + item[key], 0);
}

describe('createCraftingStagePlan', () => {
  it('pairs disjoint stage capacities at the smaller capacity', () => {
    const plan = createCraftingStagePlan([
      { materialId: 1, craftCapacity: 10, stage1Eligible: true, stage2Eligible: false },
      { materialId: 2, craftCapacity: 4, stage1Eligible: false, stage2Eligible: true },
    ]);

    expect(plan.fullCrafts).toBe(4);
    expect(plan.stage1Capacity).toBe(10);
    expect(plan.stage2Capacity).toBe(4);
    expect(allocated(plan, 'stage1')).toBe(4);
    expect(allocated(plan, 'stage2')).toBe(4);
  });

  it('splits shared capacity without assigning a batch twice', () => {
    const plan = createCraftingStagePlan([
      { materialId: 1, craftCapacity: 10, stage1Eligible: true, stage2Eligible: true },
    ]);

    expect(plan.fullCrafts).toBe(5);
    expect(plan.stage1Capacity).toBe(10);
    expect(plan.stage2Capacity).toBe(10);
    expect(plan.allocations[1]).toEqual({ stage1Crafts: 5, stage2Crafts: 5 });
  });

  it('uses stage-only materials before shared materials', () => {
    const plan = createCraftingStagePlan([
      { materialId: 1, craftCapacity: 4, stage1Eligible: true, stage2Eligible: false },
      { materialId: 2, craftCapacity: 6, stage1Eligible: true, stage2Eligible: true },
    ]);

    expect(plan.fullCrafts).toBe(5);
    expect(plan.allocations[1]).toEqual({ stage1Crafts: 4, stage2Crafts: 0 });
    expect(plan.allocations[2]).toEqual({ stage1Crafts: 1, stage2Crafts: 5 });
  });

  it('returns no plan without both stages', () => {
    const plan = createCraftingStagePlan([
      { materialId: 1, craftCapacity: 10, stage1Eligible: true, stage2Eligible: false },
    ]);

    expect(plan).toEqual({
      fullCrafts: 0,
      stage1Capacity: 10,
      stage2Capacity: 0,
      allocations: {},
    });
  });
});
