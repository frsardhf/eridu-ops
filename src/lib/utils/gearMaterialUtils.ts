import { StudentProps } from '../../types/student';
import dataTable from '../../data/data.json';
import { getResourceDataByIdSync, getEquipmentDataByIdSync, getAllEquipmentFromCache } from '../stores/resourceCacheStore';
import {
  EquipmentLevels,
  GradeInfos,
  GradeLevels
} from '../../types/gear';
import {
  CREDITS_ID,
  ELIGMAS_ID,
  Material,
} from '../../types/upgrade';
import { consolidateAndSortMaterials } from '../utils/materialUtils';
import { EXCLUSIVE_GEAR_T2_CREDIT_COST } from '../constants/gameConstants';
import type { ExclusiveGearLevel } from '../../types/gear';
import { CachedResource } from '../../types/resource';

function getCreditsForEquipmentTier(current: number, target: number) {
  const equipmentCreditsTable = dataTable.equipment_credits;

  if (current === 1) {
    return equipmentCreditsTable[target-2] ?? 0;
  }

  const creditsNeeded = (equipmentCreditsTable[target-2] ?? 0) - (equipmentCreditsTable[current-2] ?? 0);
  return Math.max(0, creditsNeeded);
}

function getCreditsForGrade(current: number, target: number) {
  const gradeCreditsTable = dataTable.grade_credits;

  if (current === 1) {
    return gradeCreditsTable[target-2] ?? 0;
  }

  const creditsNeeded = (gradeCreditsTable[target-2] ?? 0) - (gradeCreditsTable[current-2] ?? 0);
  return Math.max(0, creditsNeeded);
}

export function getElephsForGrade(current: number, target: number, owned: number) {
  const gradeElephsTable = dataTable.grade_elephs;

  if (current === 1) {
    return gradeElephsTable[target-2] ?? 0;
  }

  const elephsNeeded = (gradeElephsTable[target-2] ?? 0) - (gradeElephsTable[current-2] ?? 0);
  return Math.max(0, elephsNeeded - owned);
}

function getEligmasForGrade(needed: number, price: number = 1, purchasable: number = 20) {
  let totalEligma = 0
  let remainingElephs = needed
  while (price <= 5) {
    remainingElephs -= purchasable;
    totalEligma += price * purchasable;
    if (remainingElephs <= 0) {
      if (remainingElephs < 0) {
        totalEligma += remainingElephs * price;
      }
      break;
    }
    price++
  }
  if (remainingElephs > 0) totalEligma += 5 * remainingElephs

  return totalEligma || 0;
}

export function calculateEquipmentMaterials(
  student: StudentProps,
  equipmentLevels: EquipmentLevels
): Material[] {
  const materialsNeeded: Material[] = [];

  if (!student.Id || !equipmentLevels) return materialsNeeded;

  const allEquipment = getAllEquipmentFromCache();

  // Pre-build lookup map: "Category:Tier" → equipment item for O(1) access.
  // Use first-match semantics (no overwrite) to mirror Array.find() behaviour,
  // since the cache may contain multiple entries per Category+Tier
  // (e.g. blueprint piece alongside assembled item) and only the first has a Recipe.
  const equipmentByTypeAndTier = new Map<string, CachedResource>();
  for (const eq of Object.values(allEquipment)) {
    if (eq.Category && typeof eq.Tier === 'number') {
      const key = `${eq.Category}:${eq.Tier}`;
      if (!equipmentByTypeAndTier.has(key)) {
        equipmentByTypeAndTier.set(key, eq);
      }
    }
  }

  // Map-keyed dedup: O(1) per recipe ingredient instead of O(n) .find() scan.
  // Key = materialId only (type is always 'equipments') so identical materials
  // from different equipment slots are accumulated into one entry here rather
  // than waiting for consolidateAndSortMaterials at the call site.
  const byMaterialId = new Map<number, Material>();

  Object.entries(equipmentLevels).forEach(([type, levels]) => {
    const { current, target } = levels;

    if (current >= target) return;

    for (let level = current; level < target; level++) {
      const nextTier = level + 1;
      const equipmentItem = equipmentByTypeAndTier.get(`${type}:${nextTier}`);

      const recipes = equipmentItem?.Recipe ?? null;

      if (!recipes) {
        console.warn(`No recipe found for ${type} tier ${nextTier}`);
        continue;
      }

      for (const recipe of recipes) {
        const recipeId = recipe[0];
        const quantity = recipe[1];

        if (!recipeId || !quantity) continue;

        const materialId = parseInt(recipeId.toString().substring(2));
        const existing = byMaterialId.get(materialId);

        if (existing) {
          existing.materialQuantity += quantity;
        } else {
          const materialData = getEquipmentDataByIdSync(materialId);
          if (!materialData) continue;
          const entry: Material = { material: materialData, materialQuantity: quantity, type: 'equipments' };
          byMaterialId.set(materialId, entry);
          materialsNeeded.push(entry);
        }
      }
    }
  });

  return materialsNeeded;
}

export function calculateEquipmentCredits(
  equipmentLevels: EquipmentLevels
): Material[] {
  const materialsNeeded: Material[] = [];
  const creditsData = getResourceDataByIdSync(CREDITS_ID);

  Object.values(equipmentLevels).forEach((levels) => {
    const { current, target } = levels;

    if (current >= target) return;

    const creditsQuantity = getCreditsForEquipmentTier(current, target);

    if (creditsData && creditsQuantity > 0) {
      materialsNeeded.push({
        material: creditsData,
        materialQuantity: creditsQuantity,
        type: 'credits'
      });
    }
  });

  return materialsNeeded;
}

export function calculateGradeCredits(
  gradeLevels: GradeLevels
): Material[] {
  const materialsNeeded: Material[] = [];
  const creditsData = getResourceDataByIdSync(CREDITS_ID);

  const current = gradeLevels.current ?? 1;
  const target = gradeLevels.target ?? 1;

  if (current >= target) return materialsNeeded;

  const creditsQuantity = getCreditsForGrade(current, target);

  if (creditsData && creditsQuantity > 0) {
    materialsNeeded.push({
      material: creditsData,
      materialQuantity: creditsQuantity,
      type: 'credits'
    });
  }

  return materialsNeeded;
}

export function calculateGradeMaterials(
  gradeLevels: GradeLevels,
  gradeInfos: GradeInfos
): Material[] {
  const materialsNeeded: Material[] = [];
  const eligmasData = getResourceDataByIdSync(ELIGMAS_ID);

  const current = gradeLevels.current ?? 1;
  const target = gradeLevels.target ?? 1;
  const owned = gradeInfos.owned ?? 0;
  const price = gradeInfos.price ?? 1;
  const purchasable = gradeInfos.purchasable ?? 20;

  if (current >= target) return materialsNeeded;

  const elephsNeeded = getElephsForGrade(current, target, owned);
  const eligmasQuantity = getEligmasForGrade(elephsNeeded, price, purchasable);

  if (eligmasData && eligmasQuantity > 0) {
    materialsNeeded.push({
      material: eligmasData,
      materialQuantity: eligmasQuantity,
      type: 'materials'
    });
  }

  return materialsNeeded;
}

// Calculate materials needed for exclusive gear upgrade (T1→T2)
export function calculateExclusiveGearMaterials(
  student: StudentProps,
  exclusiveGearLevel: ExclusiveGearLevel
): Material[] {
  const materialsNeeded: Material[] = [];

  if (!student.Gear || Object.keys(student.Gear).length === 0) {
    return materialsNeeded;
  }

  const current = exclusiveGearLevel.current ?? 0;
  const target = exclusiveGearLevel.target ?? 0;

  if (current >= target) {
    return materialsNeeded;
  }

  // Only T1→T2 upgrade costs materials (T0→T1 is free, just needs bond)
  if (current < 2 && target >= 2) {
    const tierUpMaterials = student.Gear.TierUpMaterial?.[0] ?? [];
    const tierUpAmounts = student.Gear.TierUpMaterialAmount?.[0] ?? [];

    tierUpMaterials.forEach((materialId: number, index: number) => {
      const materialData = getResourceDataByIdSync(materialId);
      if (materialData && tierUpAmounts[index]) {
        materialsNeeded.push({
          material: materialData,
          materialQuantity: tierUpAmounts[index],
          type: 'materials'
        });
      }
    });

    const creditsData = getResourceDataByIdSync(CREDITS_ID);
    if (creditsData) {
      materialsNeeded.push({
        material: creditsData,
        materialQuantity: EXCLUSIVE_GEAR_T2_CREDIT_COST,
        type: 'credits'
      });
    }
  }

  return materialsNeeded;
}

export function calculateAllGears(
  student: StudentProps,
  equipmentLevels: EquipmentLevels,
  gradeLevels: GradeLevels,
  gradeInfos: GradeInfos,
  exclusiveGearLevel: ExclusiveGearLevel
): Material[] {
  const materials: Material[] = [];

  materials.push(...calculateGradeCredits(gradeLevels));
  materials.push(...calculateGradeMaterials(gradeLevels, gradeInfos));
  materials.push(...calculateEquipmentCredits(equipmentLevels));
  materials.push(...calculateEquipmentMaterials(student, equipmentLevels));
  materials.push(...calculateExclusiveGearMaterials(student, exclusiveGearLevel));

  return consolidateAndSortMaterials(materials);
}

/**
 * XP cost to grow one equipment slot from `current` to `target` tier.
 * Uses the cumulative equipment_xp table from data.json.
 */
export function computeEquipmentSlotXpCost(current: number, target: number): number {
  if (current >= target) return 0;
  const t = dataTable.equipment_xp;
  const curXp = current <= 1 ? 0 : (t[current - 2] ?? 0);
  return Math.max(0, (t[target - 2] ?? 0) - curXp);
}

/** Total XP cost across all pending equipment slots. */
export function computeEquipmentXpCost(equipmentLevels: EquipmentLevels): number {
  return Object.values(equipmentLevels)
    .reduce((sum, lv) => sum + (lv ? computeEquipmentSlotXpCost(lv.current, lv.target) : 0), 0);
}

/**
 * XP Ball items (IDs 4 → 1) sorted descending by LevelUpFeedExp,
 * each carrying its current owned count — ready for deductXpItems.
 * @param getOwned  Returns how many of a given item ID the player owns.
 */
export function getEquipXpItems(
  getOwned: (id: number) => number,
  eqCache?: ReturnType<typeof getAllEquipmentFromCache>,
): Array<{ id: number; xpValue: number; owned: number }> {
  const eq = eqCache ?? getAllEquipmentFromCache();
  return ([4, 3, 2, 1] as const).map(id => ({
    id,
    xpValue: eq[id]?.LevelUpFeedExp ?? 0,
    owned: getOwned(id),
  }));
}

const _maxTierByType = new Map<string, number>();

export function getMaxTierForTypeSync(type: string): number {
  if (_maxTierByType.has(type)) return _maxTierByType.get(type)!;

  const equipments = getAllEquipmentFromCache();
  let max = 0;
  for (const item of Object.values(equipments)) {
    if (item.Category === type && typeof item.Tier === 'number' && item.Tier > max) {
      max = item.Tier;
    }
  }
  _maxTierByType.set(type, max);
  return max;
}
