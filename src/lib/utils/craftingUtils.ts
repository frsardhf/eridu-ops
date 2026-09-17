import type { CraftingFodderSession } from '../../types/crafting';

export interface CraftingStageCapacity {
  materialId: number;
  craftCapacity: number;
  stage1Eligible: boolean;
  stage2Eligible: boolean;
}

export interface CraftingStagePlan {
  fullCrafts: number;
  stage1Capacity: number;
  stage2Capacity: number;
}

export interface CraftingSessionMaterial extends CraftingStageCapacity {
  excessItems: number;
  itemsPerCraft: number;
}

function sumCapacity(
  capacities: CraftingStageCapacity[],
  predicate: (item: CraftingStageCapacity) => boolean,
) {
  return capacities.reduce((sum, item) => sum + (predicate(item) ? item.craftCapacity : 0), 0);
}

export function createCraftingStagePlan(capacities: CraftingStageCapacity[]): CraftingStagePlan {
  const working = capacities.filter(
    (item) => item.craftCapacity > 0 && (item.stage1Eligible || item.stage2Eligible),
  );

  const stage1Capacity = sumCapacity(working, (item) => item.stage1Eligible);
  const stage2Capacity = sumCapacity(working, (item) => item.stage2Eligible);
  const totalCapacity = working.reduce((sum, item) => sum + item.craftCapacity, 0);
  const fullCrafts = Math.min(stage1Capacity, stage2Capacity, Math.floor(totalCapacity / 2));

  return { fullCrafts, stage1Capacity, stage2Capacity };
}

/** Creates a stable session containing every material eligible for either stage. */
export function createCraftingFodderSession(
  sourceSignature: string,
  materials: CraftingSessionMaterial[],
  completedMaterialIds: ReadonlySet<number> = new Set(),
): CraftingFodderSession {
  const plan = createCraftingStagePlan(materials);
  const entries = Object.fromEntries(
    materials.map((material) => {
      const isLegacyComplete = completedMaterialIds.has(material.materialId);
      return [
        material.materialId,
        {
          materialId: material.materialId,
          craftCapacity: material.craftCapacity,
          excessItems: material.excessItems,
          itemsPerCraft: material.itemsPerCraft,
          stage1Eligible: material.stage1Eligible,
          stage2Eligible: material.stage2Eligible,
          stage1Crafts: isLegacyComplete && material.stage1Eligible ? material.craftCapacity : 0,
          stage2Crafts:
            isLegacyComplete && !material.stage1Eligible && material.stage2Eligible
              ? material.craftCapacity
              : 0,
        },
      ];
    }),
  );

  return {
    version: 4,
    sourceSignature,
    fullCraftCapacity: plan.fullCrafts,
    stage1Capacity: plan.stage1Capacity,
    stage2Capacity: plan.stage2Capacity,
    entries,
  };
}
