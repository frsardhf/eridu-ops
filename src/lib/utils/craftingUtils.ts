export interface CraftingStageCapacity {
  materialId: number;
  craftCapacity: number;
  stage1Eligible: boolean;
  stage2Eligible: boolean;
}

export interface CraftingStageAllocation {
  stage1Crafts: number;
  stage2Crafts: number;
}

export interface CraftingStagePlan {
  fullCrafts: number;
  stage1Capacity: number;
  stage2Capacity: number;
  allocations: Record<number, CraftingStageAllocation>;
}

interface WorkingCapacity extends CraftingStageCapacity {
  available: number;
}

function sumCapacity(capacities: WorkingCapacity[], predicate: (item: WorkingCapacity) => boolean) {
  return capacities.reduce((sum, item) => sum + (predicate(item) ? item.craftCapacity : 0), 0);
}

function allocate(
  capacities: WorkingCapacity[],
  stage: keyof CraftingStageAllocation,
  requested: number,
  allocations: Record<number, CraftingStageAllocation>,
): number {
  let remaining = requested;

  for (const item of capacities) {
    if (remaining === 0) break;

    const assigned = Math.min(item.available, remaining);
    if (assigned === 0) continue;

    const allocation = allocations[item.materialId] ?? {
      stage1Crafts: 0,
      stage2Crafts: 0,
    };
    allocation[stage] += assigned;
    allocations[item.materialId] = allocation;
    item.available -= assigned;
    remaining -= assigned;
  }

  return remaining;
}

export function createCraftingStagePlan(capacities: CraftingStageCapacity[]): CraftingStagePlan {
  const working: WorkingCapacity[] = capacities
    .filter((item) => item.craftCapacity > 0 && (item.stage1Eligible || item.stage2Eligible))
    .map((item) => ({ ...item, available: item.craftCapacity }));

  const stage1Capacity = sumCapacity(working, (item) => item.stage1Eligible);
  const stage2Capacity = sumCapacity(working, (item) => item.stage2Eligible);
  const totalCapacity = working.reduce((sum, item) => sum + item.craftCapacity, 0);
  const fullCrafts = Math.min(stage1Capacity, stage2Capacity, Math.floor(totalCapacity / 2));

  const stage1Only = working.filter((item) => item.stage1Eligible && !item.stage2Eligible);
  const stage2Only = working.filter((item) => item.stage2Eligible && !item.stage1Eligible);
  const shared = working.filter((item) => item.stage1Eligible && item.stage2Eligible);
  const allocations: Record<number, CraftingStageAllocation> = {};

  const stage1SharedNeed = allocate(stage1Only, 'stage1Crafts', fullCrafts, allocations);
  const stage2SharedNeed = allocate(stage2Only, 'stage2Crafts', fullCrafts, allocations);
  allocate(shared, 'stage2Crafts', stage2SharedNeed, allocations);
  allocate(shared, 'stage1Crafts', stage1SharedNeed, allocations);

  return { fullCrafts, stage1Capacity, stage2Capacity, allocations };
}
