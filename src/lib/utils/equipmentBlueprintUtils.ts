import dataTable from '@/data/data.json';
import type { ResourceProps } from '@/types/resource';
import { GENERAL_EQUIPMENT_BLUEPRINT_ID_BY_CATEGORY } from '@/types/resource';
import type { Material } from '@/types/upgrade';

const GENERAL_EQUIPMENT_CATEGORY_BY_BLUEPRINT_ID = new Map(
  Object.entries(GENERAL_EQUIPMENT_BLUEPRINT_ID_BY_CATEGORY).map(([category, id]) => [
    id,
    category,
  ]),
);

export interface EquipmentBlueprintAllocation {
  normalUsedById: Map<number, number>;
  generalUsedById: Map<number, number>;
  remainingById: Map<number, number>;
}

export function getGeneralBlueprintCost(tier: number): number | null {
  return dataTable.general_blueprint_cost[tier - 1] ?? null;
}

export function getGeneralBlueprintId(category: string): number | null {
  return GENERAL_EQUIPMENT_BLUEPRINT_ID_BY_CATEGORY[category] ?? null;
}

export function getGeneralBlueprintCategory(id: number): string | null {
  return GENERAL_EQUIPMENT_CATEGORY_BY_BLUEPRINT_ID.get(id) ?? null;
}

/**
 * Allocates owned equipment blueprints against concrete blueprint needs.
 * Concrete blueprints are always consumed first. Any remaining deficit is
 * covered by the matching category's general blueprint at that tier's rate.
 */
export function allocateEquipmentBlueprints(
  materials: Material[],
  resources: Record<string | number, ResourceProps>,
): EquipmentBlueprintAllocation {
  const needsById = new Map<number, Material>();
  for (const material of materials) {
    if (material.type !== 'equipments' || material.materialQuantity <= 0) continue;
    const id = material.material.Id;
    const existing = needsById.get(id);
    if (existing) existing.materialQuantity += material.materialQuantity;
    else needsById.set(id, { ...material });
  }

  const normalUsedById = new Map<number, number>();
  const generalUsedById = new Map<number, number>();
  const remainingById = new Map<number, number>();
  const deficitsByCategory = new Map<string, { id: number; tier: number; deficit: number }[]>();

  for (const [id, need] of needsById) {
    const owned = resources[id]?.QuantityOwned ?? 0;
    const normalUsed = Math.min(owned, need.materialQuantity);
    const deficit = need.materialQuantity - normalUsed;
    normalUsedById.set(id, normalUsed);
    remainingById.set(id, owned - need.materialQuantity);

    const category = need.material.Category;
    const tier = need.material.Tier ?? 0;
    if (deficit <= 0 || !getGeneralBlueprintId(category) || !getGeneralBlueprintCost(tier))
      continue;
    const categoryDeficits = deficitsByCategory.get(category) ?? [];
    categoryDeficits.push({ id, tier, deficit });
    deficitsByCategory.set(category, categoryDeficits);
  }

  for (const [category, deficits] of deficitsByCategory) {
    const generalId = getGeneralBlueprintId(category);
    if (!generalId) continue;
    let available = resources[generalId]?.QuantityOwned ?? 0;
    const initiallyAvailable = available;

    // Lower tiers first maximizes the number of concrete pieces covered.
    deficits.sort((a, b) => a.tier - b.tier || a.id - b.id);
    for (const deficit of deficits) {
      const cost = getGeneralBlueprintCost(deficit.tier);
      if (!cost || available < cost) continue;
      const covered = Math.min(deficit.deficit, Math.floor(available / cost));
      available -= covered * cost;
      remainingById.set(deficit.id, (remainingById.get(deficit.id) ?? 0) + covered);
    }

    const used = initiallyAvailable - available;
    if (used > 0) generalUsedById.set(generalId, used);
  }

  return { normalUsedById, generalUsedById, remainingById };
}
