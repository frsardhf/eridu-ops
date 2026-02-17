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
import type { ExclusiveGearLevel } from '../../types/gear';
import { CachedResource } from '../../types/resource';

// Get credits required for a specific equipment tier
function getCreditsForEquipmentTier(current: number, target: number) {
  const equipmentCreditsTable = dataTable.equipment_credits;

  if (current === 1) {
    return equipmentCreditsTable[target-2] ?? 0;
  }

  const creditsNeeded = equipmentCreditsTable[target-2] - equipmentCreditsTable[current-2];
  return creditsNeeded || 0;
}

// Get credits required for a specific grade tier
function getCreditsForGrade(current: number, target: number) {
  const gradeCreditsTable = dataTable.grade_credits;

  if (current === 1) {
    return gradeCreditsTable[target-2] ?? 0;
  }

  const creditsNeeded = gradeCreditsTable[target-2] - gradeCreditsTable[current-2];
  return creditsNeeded || 0;
}

// Get elephs required for a specific grade tier
export function getElephsForGrade(current: number, target: number, owned: number) {
  const gradeElephsTable = dataTable.grade_elephs;

  if (current === 1) {
    return gradeElephsTable[target-2] ?? 0;
  }

  const elephsNeeded = gradeElephsTable[target-2] - gradeElephsTable[current-2];
  return elephsNeeded - owned || 0;
}

// Get eligmas required for a specific grade tier
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

// Calculate equipment materials from recipes
function calculateEquipmentMaterials(
  student: StudentProps,
  equipmentLevels: EquipmentLevels
): Material[] {
  const materialsNeeded: Material[] = [];

  if (!student.Id || !equipmentLevels) return materialsNeeded;

  const allEquipment = getAllEquipmentFromCache();

  Object.entries(equipmentLevels).forEach(([type, levels]) => {
    const { current, target } = levels;

    if (current >= target) return;

    for (let level = current; level < target; level++) {
      const nextTier = level + 1;
      const equipmentItem = Object.values(allEquipment).find(eq =>
        eq.Category === type && eq.Tier === nextTier
      );

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
        const materialData = getEquipmentDataByIdSync(materialId);

        const existingMaterial = materialsNeeded.find(m =>
          m.material?.Id === materialId && m.type === type
        );

        if (existingMaterial) {
          existingMaterial.materialQuantity += quantity;
        } else {
          materialsNeeded.push({
            material: materialData,
            materialQuantity: quantity,
            type: 'equipments'
          });
        }
      }
    }
  });

  return materialsNeeded;
}

// Calculate credits needed for equipment upgrades
function calculateEquipmentCredits(
  equipmentLevels: EquipmentLevels
): Material[] {
  const materialsNeeded: Material[] = [];
  const creditsData = getResourceDataByIdSync(CREDITS_ID);

  Object.entries(equipmentLevels).forEach(([type, levels]) => {
    const { current, target } = levels;

    if (current >= target) return;

    const creditsQuantity = getCreditsForEquipmentTier(current, target);

    if (creditsQuantity > 0) {
      materialsNeeded.push({
        material: creditsData,
        materialQuantity: creditsQuantity,
        type: 'credits'
      });
    }
  });

  return materialsNeeded;
}

// Calculate credits for grade upgrades
function calculateGradeCredits(
  gradeLevels: GradeLevels
): Material[] {
  const materialsNeeded: Material[] = [];
  const creditsData = getResourceDataByIdSync(CREDITS_ID);

  const current = gradeLevels.current ?? 1;
  const target = gradeLevels.target ?? 1;

  if (current >= target) return materialsNeeded;

  const creditsQuantity = getCreditsForGrade(current, target);

  if (creditsQuantity > 0) {
    materialsNeeded.push({
      material: creditsData,
      materialQuantity: creditsQuantity,
      type: 'credits'
    });
  }

  return materialsNeeded;
}

// Calculate materials for grade upgrades
function calculateGradeMaterials(
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

  if (eligmasQuantity > 0) {
    materialsNeeded.push({
      material: eligmasData,
      materialQuantity: eligmasQuantity,
      type: 'materials'
    });
  }

  return materialsNeeded;
}

// Calculate materials needed for exclusive gear upgrade (T1→T2)
function calculateExclusiveGearMaterials(
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
    const gearData = student.Gear as any;
    const tierUpMaterials = gearData.TierUpMaterial?.[0] || [];
    const tierUpAmounts = gearData.TierUpMaterialAmount?.[0] || [];

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
        materialQuantity: 500000,
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

export function getMaxTierForTypeSync(type: string): number {
  const equipments = getAllEquipmentFromCache();
  const matchingEquipments = Object.values(equipments)
    .filter((item: any) => item.Category === type)
    .filter(
      (item): item is CachedResource & { Tier: number } =>
        typeof item.Tier === 'number'
    )
    .sort((a: any, b: any) => b.Id - a.Id);

  const highestTierEquipment = matchingEquipments[0];
  return highestTierEquipment.Tier;
}
