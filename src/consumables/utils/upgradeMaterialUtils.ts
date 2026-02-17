import { StudentProps } from '../../types/student';
import {
  Material,
  SkillLevels,
  PotentialLevels,
  CREDITS_ID,
  WORKBOOK_ID,
  SECRET_TECH_NOTE_ID,
  CharacterLevels,
} from '../../types/upgrade';
import { getResourceDataByIdSync } from '../stores/resourceCacheStore';
import { consolidateAndSortMaterials } from '../utils/materialUtils';
import dataTable from '../../data/data.json';

export function calculateLevelMaterials(
  student: StudentProps,
  characterLevels: CharacterLevels
): Material[] {
  const materialsNeeded: Material[] = [];

  if (!student.Id) return materialsNeeded;
  if (characterLevels.current >= characterLevels.target) return materialsNeeded;

  const creditsData = getResourceDataByIdSync(CREDITS_ID);
  const characterXpTable = dataTable.character_xp;

  const currentXp = characterXpTable[characterLevels.current - 1] ?? 0;
  const targetXp = characterXpTable[characterLevels.target - 1] ?? 0;
  const totalXpNeeded = Math.max(0, targetXp - currentXp);

  if (totalXpNeeded <= 0) return materialsNeeded;

  // Add credits for level upgrade
  if (creditsData) {
    const characterXpCreditsTable = dataTable.character_credits ?? [];
    let creditsCost = 0;

    if (characterXpCreditsTable.length > 0) {
      const currentLevelCreditCost = characterLevels.current > 0 ?
        characterXpCreditsTable[characterLevels.current - 1] : 0;
      const targetLevelCreditCost = characterLevels.target > 0 ?
        characterXpCreditsTable[characterLevels.target - 1] : 0;

      creditsCost = targetLevelCreditCost - currentLevelCreditCost;
    }

    if (creditsCost > 0) {
      materialsNeeded.push({
        material: creditsData,
        materialQuantity: creditsCost,
        type: 'credits'
      });
    }
  }

  return materialsNeeded;
}

export function calculateSkillMaterials(
  student: StudentProps,
  skillLevels: SkillLevels
): Material[] {
  const materialsNeeded: Material[] = [];

  if (!student.Id) return materialsNeeded;

  const creditsData = getResourceDataByIdSync(CREDITS_ID);
  const exskillCreditsTable = dataTable.exskill_credits;
  const skillCreditsTable = dataTable.skill_credits;

  for (const [type, levels] of Object.entries(skillLevels)) {
    const { current, target } = levels;

    if (current >= target) continue;

    const isExSkill = type === 'Ex';
    const materialIds = isExSkill ? student.SkillExMaterial : student.SkillMaterial;
    const materialQuantities = isExSkill ? student.SkillExMaterialAmount : student.SkillMaterialAmount;
    const creditsQuantities = isExSkill ? exskillCreditsTable : skillCreditsTable;

    if (!materialIds || !materialQuantities || !creditsQuantities) continue;

    // Calculate materials for each level
    for (let level = current; level < target; level++) {

      const levelMaterialIds = materialIds[level-1];
      const levelMaterialQuantities = materialQuantities[level-1];
      const levelCreditsQuantities = creditsQuantities[level-1];

      // Special case: ADD SECRET_TECH_NOTE for level 9 to 10 for non-Ex skills
      if (level === 9 && type !== 'Ex') {
        const secretTechData = getResourceDataByIdSync(SECRET_TECH_NOTE_ID);
        materialsNeeded.push({
          material: secretTechData,
          materialQuantity: 1,
          type: 'special'
        });

        materialsNeeded.push({
          material: creditsData,
          materialQuantity: 4000000,
          type: 'credits'
        });
      }

      // Needs to be placed after special case since
      // levelMaterialIds.length === N-1, Ex max length is 5, Non Ex max length is 10
      if (!levelMaterialIds || !levelMaterialQuantities) continue;

      // Each level may need multiple materials, process each one
      for (let i = 0; i < levelMaterialIds.length; i++) {
        const materialId = levelMaterialIds[i];
        const quantity = levelMaterialQuantities[i];

        if (!materialId || !quantity) continue;

        const materialData = getResourceDataByIdSync(materialId);

        materialsNeeded.push({
          material: materialData,
          materialQuantity: quantity,
          type: 'materials'
        });
      }

      materialsNeeded.push({
        material: creditsData,
        materialQuantity: levelCreditsQuantities,
        type: 'credits'
      });
    }
  }

  return materialsNeeded;
}

export function calculatePotentialMaterials(
  student: StudentProps,
  potentialLevels: PotentialLevels
): Material[] {
  const materialsNeeded: Material[] = [];

  if (!student.Id || !dataTable.potential) return materialsNeeded;

  const potentialMaterials = dataTable.potential;
  const creditsData = getResourceDataByIdSync(CREDITS_ID);

  function processPotentialBlock(
    type: string,
    block: number,
    current: number,
    target: number
  ): Material[] {
    const result: Material[] = [];
    if (block >= potentialMaterials.length) return result;

    const blockData = potentialMaterials[block];
    if (!blockData) return result;

    let levelsInBlock = 5;
    if (block === Math.floor(current / 5)) {
      levelsInBlock = 5 - (current % 5);
    }
    if (block === Math.floor((target - 1) / 5)) {
      const remainder = target % 5;
      if (remainder > 0) {
        levelsInBlock = remainder;
      }
    }

    const [workbookQuantity, materialQuality, materialQuantity, creditsQuantity] = blockData;

    let workbookIndex: number;
    if (type === 'maxhp') {
      workbookIndex = 0;
    } else if (type === 'attack') {
      workbookIndex = 1;
    } else {
      workbookIndex = 2;
    }
    const workbookId = WORKBOOK_ID[workbookIndex];
    const materialId = student?.PotentialMaterial ?? 0;
    const actualMaterialId = materialQuality === 1 ? materialId : materialId + 1;

    const materialData = getResourceDataByIdSync(actualMaterialId);
    const workbookData = getResourceDataByIdSync(workbookId);

    const scaledMaterialQuantity = Math.ceil(materialQuantity * levelsInBlock);
    const scaledWorkbookQuantity = Math.ceil(workbookQuantity * levelsInBlock);
    const scaledCreditsQuantity = Math.ceil(creditsQuantity * levelsInBlock);

    result.push(
      {
        material: materialData,
        materialQuantity: scaledMaterialQuantity,
        type: 'materials'
      },
      {
        material: workbookData,
        materialQuantity: scaledWorkbookQuantity,
        type: 'materials'
      },
      {
        material: creditsData,
        materialQuantity: scaledCreditsQuantity,
        type: 'credits'
      }
    );
    return result;
  }

  for (const [type, levels] of Object.entries(potentialLevels)) {
    const { current, target } = levels;
    if (current >= target) continue;

    const startBlock = Math.floor(current / 5);
    const endBlock = Math.floor((target - 1) / 5);

    for (let block = startBlock; block <= endBlock; block++) {
      const blockMaterials = processPotentialBlock(type, block, current, target);
      materialsNeeded.push(...blockMaterials);
    }
  }

  return materialsNeeded;
}

export function calculateAllMaterials(
  student: StudentProps,
  characterLevels: CharacterLevels,
  skillLevels: SkillLevels,
  potentialLevels: PotentialLevels,
): Material[] {
  // Collect all materials
  const materials: Material[] = [];
  materials.push(...calculateLevelMaterials(student, characterLevels));
  materials.push(...calculateSkillMaterials(student, skillLevels));
  materials.push(...calculatePotentialMaterials(student, potentialLevels));

  // Consolidate and sort materials
  return consolidateAndSortMaterials(materials);
}
