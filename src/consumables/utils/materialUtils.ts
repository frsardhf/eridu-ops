import { getAllFormData } from '../services/dbService';
import { useStudentData } from '../hooks/useStudentData';
import {
  Material,
  DEFAULT_SKILL_LEVELS,
  DEFAULT_POTENTIAL_LEVELS,
  DEFAULT_CHARACTER_LEVELS,
  ELIGMAS_ID
} from '../../types/upgrade';
import { CREDITS_ID } from '../constants/syntheticEntities';
import { updateMaterialsData } from '../stores/materialsStore';
import { updateGearsData } from '../stores/gearsStore';
import { calculateAllMaterials } from '../utils/upgradeMaterialUtils';
import { calculateAllGears } from '../utils/gearMaterialUtils';
import { getEquipmentDataByIdSync, getResourceDataByIdSync } from '../stores/resourceCacheStore';
import { ResourceProps } from '../../types/resource';

/**
 * Builds a consolidated material map by summing quantities for duplicate IDs
 */
export function buildMaterialMap(materials: Material[]): Map<number, Material> {
  const materialMap = new Map<number, Material>();
  materials.forEach(item => {
    const materialId = item.material?.Id;
    if (!materialId) return;
    if (materialMap.has(materialId)) {
      materialMap.get(materialId)!.materialQuantity += item.materialQuantity;
    } else {
      materialMap.set(materialId, { ...item });
    }
  });
  return materialMap;
}

/**
 * Sort comparator for materials by display priority:
 * 1) Credits (id=5), 2) Eligma (id=23), 3) Exp reports & exp balls,
 * 4) Gifts (Category='Favor'), 5) Artifacts (SubCategory='Artifact'), 6) rest by ID
 */
export function sortMaterials(a: Material, b: Material): number {
  const aId = a.material?.Id ?? 0;
  const bId = b.material?.Id ?? 0;

  if (aId === CREDITS_ID) return -1;
  if (bId === CREDITS_ID) return 1;

  if (aId === ELIGMAS_ID) return -1;
  if (bId === ELIGMAS_ID) return 1;

  const aIsExp = isExpReport(aId) || isExpBall(aId);
  const bIsExp = isExpReport(bId) || isExpBall(bId);
  if (aIsExp && !bIsExp) return -1;
  if (!aIsExp && bIsExp) return 1;

  const aIsGift = a.material?.Category === 'Favor';
  const bIsGift = b.material?.Category === 'Favor';
  if (aIsGift && !bIsGift) return -1;
  if (!aIsGift && bIsGift) return 1;

  const aIsArtifact = a.material?.SubCategory === 'Artifact';
  const bIsArtifact = b.material?.SubCategory === 'Artifact';
  if (aIsArtifact && !bIsArtifact) return -1;
  if (!aIsArtifact && bIsArtifact) return 1;

  return aId - bId;
}

/**
 * Consolidates duplicate materials and sorts them by display priority
 */
export function consolidateAndSortMaterials(materials: Material[]): Material[] {
  return Array.from(buildMaterialMap(materials).values()).sort(sortMaterials);
}

/**
 * Function to preload all student materials and gears during initialization
 * This will calculate materials and gears for all students that have form data
 */
export async function preloadAllStudentsData() {
  try {
    // Get all students form data from IndexedDB
    const allFormData = await getAllFormData();

    // Get all students data from useStudentData composable
    const { studentData, equipmentData } = useStudentData();
    const allStudentsData = studentData.value;
    const allGearsData = equipmentData.value;
    
    // Process each student's form data
    Object.entries(allFormData).forEach(([studentId, formData]) => {
      if (!formData) return;
      
      const student = allStudentsData[studentId];
      if (!student) return;
      
      // Get all levels from form data
      const skillLevels = formData.skillLevels ?? DEFAULT_SKILL_LEVELS;
      const potentialLevels = formData.potentialLevels ?? DEFAULT_POTENTIAL_LEVELS;
      const characterLevels = formData.characterLevels ?? DEFAULT_CHARACTER_LEVELS;
      const equipmentLevels = formData.equipmentLevels ?? {};
      const gradeLevels = formData.gradeLevels ?? {};
      const gradeInfos = formData.gradeInfos ?? {};
      const exclusiveGearLevel = formData.exclusiveGearLevel ?? {};      
      
      // Check if student has any upgrades
      const hasAnyUpgrades = hasTargetUpgrades(characterLevels) ||
        hasTargetUpgrades(skillLevels) || hasTargetUpgrades(potentialLevels) ||
        hasTargetUpgrades(equipmentLevels) || hasTargetUpgrades(gradeLevels) ||
        hasTargetUpgrades(exclusiveGearLevel);

      // Process student gears (if ANY upgrade type exists)
      if (hasAnyUpgrades) {
        // Calculate materials for this student
        const materials = calculateAllMaterials(
          student,
          characterLevels,
          skillLevels,
          potentialLevels
        );

        // Add to store
        if (materials.length > 0) {
          updateMaterialsData(studentId, materials);
        }

        // Calculate gears for this student
        const gears = calculateAllGears(
          student,
          equipmentLevels,
          gradeLevels,
          gradeInfos,
          exclusiveGearLevel
        );

        // Add to store
        if (gears.length > 0) {
          updateGearsData(studentId, gears);
        }
      }
    });
  } catch (error) {
    console.error('Error preloading students data:', error);
  }
}

/**
 * Helper function to check if a student has any target upgrades
 */
function hasTargetUpgrades(
  levels: { current?: number; target?: number } |
  { [key: string]: { current?: number; target?: number } }
): boolean {
  // Handle single level object (like CharacterLevels or ExclusiveGearLevel)
  if ('current' in levels && 'target' in levels) {
    const current = (levels as { current?: number; target?: number }).current ?? 0;
    const target = (levels as { current?: number; target?: number }).target ?? 0;
    return target > current;
  }
  // Handle record of levels (like SkillLevels, PotentialLevels, EquipmentLevels)
  return Object.values(levels).some(level => {
    if (level && typeof level === 'object' && 'current' in level && 'target' in level) {
      return (level.target ?? 0) > (level.current ?? 0);
    }
    return false;
  });
} 

/**
 * Base function to format large numbers
 * @param quantity The number to format
 * @param prefix Optional prefix to add before the number
 * @returns Formatted number string
 */
function formatNumber(quantity: number, prefix: string = ''): string {
  if (!quantity || quantity <= 0) return '';
  
  // Format large numbers with 'k' suffix
  if (quantity >= 1000000) {
    return `${prefix}${Math.floor(quantity / 1000000)}M`;
  } else if (quantity >= 10000) {
    return `${prefix}${Math.floor(quantity / 1000)}K`;
  } 
  
  return `${prefix}${quantity}`;
}

/**
 * Function to format material quantity for display with '×' prefix
 * Used for material quantities in the UI
 */
export function formatLargeNumber(quantity: number): string {
  return formatNumber(quantity, '×');
}

/**
 * Function to format material quantity for display without prefix
 * Used for credit amounts and other numeric displays
 */
export function formatLargeNumberAmount(quantity: number): string {
  return `${quantity.toLocaleString()}`;
}

/**
 * Helper function to check if a material ID is an EXP report
 */
export function isExpReport(materialId: number): boolean {
  return [10, 11, 12, 13].includes(materialId);
}

/**
 * Helper function to check if a material ID is an EXP ball
 */
export function isExpBall(materialId: number): boolean {
  return [1, 2, 3, 4].includes(materialId);
}

/**
 * Helper function to get material name
 */
export function getMaterialName(item: any, isEquipmentTab: boolean): string {
  if (isExpReport(item.material?.Id)) return 'Activity Report';
  if (isExpBall(item.material?.Id)) return 'Enhancement Stone';
  return item.material?.Name ?? 'Unknown Resource';
}

/**
 * Check if a material uses item icons (not equipment blueprint icons)
 * - Credits (5) and Eligma (23) use item icons
 * - Gifts (Category === 'Favor') use item icons
 * - Artifact items (SubCategory === 'Artifact') use item icons
 * - Equipment blueprints use equipment icons with _piece suffix
 */
export function isItemIconMaterial(
  material: Partial<ResourceProps> | undefined
): boolean {

  if (!material?.Id) return false;
  // Credits and Eligma always use item icons
  if ([5, 23].includes(material.Id)) return true;
  // Gifts use item icons
  if (material.Category === 'Favor') return true;
  // Artifact items (exclusive gear materials) use item icons
  if (material.SubCategory === 'Artifact') return true;
  return false;
}

/**
 * Helper function to get material icon source
 */
export function getMaterialIconSrc(
  item: any,
  isEquipmentTab?: boolean,
  currentExpIcon?: number,
  currentExpBall?: number
): string {
  if (!item.material?.Icon) return '';

  const isExp = isExpReport(item.material?.Id);
  const isBall = isExpBall(item.material?.Id);

  if (isExp && currentExpIcon) {
    const expResource = getResourceDataByIdSync(currentExpIcon);
    return `https://schaledb.com/images/item/icon/${expResource?.Icon}.webp`;
  }

  if (isBall && currentExpBall) {
    const expBallResource = getEquipmentDataByIdSync(currentExpBall);
    return `https://schaledb.com/images/equipment/icon/${expBallResource?.Icon}.webp`;
  }

  // For equipment tab, check if it's a material that uses item icons
  const useItemIcon = !isEquipmentTab || isItemIconMaterial(item.material);
  const baseUrl = useItemIcon ? 'item' : 'equipment';
  const suffix = !useItemIcon ? '_piece' : '';
  return `https://schaledb.com/images/${baseUrl}/icon/${item.material.Icon}${suffix}.webp`;
}