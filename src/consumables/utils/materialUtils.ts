import { 
  getAllFormData, 
  getDataCollection,
  getResourceDataById,
  getEquipmentDataById
} from './studentStorage';
import { 
  Material,
  DEFAULT_SKILL_LEVELS, 
  DEFAULT_POTENTIAL_LEVELS,
  DEFAULT_CHARACTER_LEVELS
} from '../../types/upgrade';
import { updateMaterialsData } from '../stores/materialsStore';
import { updateGearsData } from '../stores/equipmentsStore';
import { calculateAllMaterials } from '../hooks/useStudentUpgrade';
import { calculateAllGears } from '../hooks/useStudentGear';

/**
 * Utility function to consolidate and sort materials
 * Combines duplicate materials and sorts them by priority (credits first, then exp reports, then by ID)
 */
export function consolidateAndSortMaterials(materials: Material[]): Material[] {
  // Consolidate materials by ID
  const materialMap = new Map<number, Material>();
  
  materials.forEach(item => {
    const materialId = item.material?.Id;
    if (!materialId) return;
    
    if (materialMap.has(materialId)) {
      // Update quantity for existing material
      const existing = materialMap.get(materialId)!;
      existing.materialQuantity += item.materialQuantity;
    } else {
      // Create a new entry with a copy of the item
      materialMap.set(materialId, { ...item });
    }
  });
  
  // Convert map to array and sort by ID
  return Array.from(materialMap.values())
    .sort((a, b) => {
      const aId = a.material?.Id ?? 0;
      const bId = b.material?.Id ?? 0;
      
      // Always put credits (ID: 5) first
      if (aId === 5) return -1;
      if (bId === 5) return 1;
      
      // Put exp reports next (IDs: 10, 11, 12, 13)
      const isExpReport = (id: number) => [10, 11, 12, 13].includes(id);
      const isExpReportA = isExpReport(aId);
      const isExpReportB = isExpReport(bId);
      
      if (isExpReportA && !isExpReportB) return -1;
      if (!isExpReportA && isExpReportB) return 1;
      
      // For all other materials, sort by ID
      return aId - bId;
    });
}

/**
 * Function to preload all student materials and gears during initialization
 * This will calculate materials and gears for all students that have form data
 */
export function preloadAllStudentsData() {
  try {
    // Get all students form data
    const allFormData = getAllFormData();
    
    // Get all students data
    const allStudentsData = getDataCollection('students');
    const allGearsData = getDataCollection('equipments');
    
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
      
      // Process student materials
      if (hasTargetUpgrades(characterLevels) || 
          hasTargetUpgrades(skillLevels) || 
          hasTargetUpgrades(potentialLevels)) {
        
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
      }
      
      // Process student gears
      if (hasTargetUpgrades(equipmentLevels)) {
        // Calculate gears for this student
        const gears = calculateAllGears(
          allGearsData,
          equipmentLevels,
          gradeLevels,
          gradeInfos
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
function hasTargetUpgrades(levels: Record<string, { current: number, target: number }>) {
  return Object.values(levels).some(level => level.target > level.current);
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
 * Adjusts tooltip position to ensure it stays within viewport
 * @param event Mouse event that triggered the tooltip
 * @param tooltipElement The tooltip element or null if not yet rendered
 * @param offsetX Horizontal offset from cursor (default: 20)
 * @param offsetY Vertical offset from cursor (default: 20)
 * @returns The adjusted position {x, y}
 */
export function adjustTooltipPosition(
  event: MouseEvent, 
  tooltipElement: HTMLElement | null = null,
  offsetX: number = 20,
  offsetY: number = 20
): { x: number, y: number } {
  // Initial position based on event
  const initialPosition = {
    x: event.clientX + offsetX,
    y: event.clientY + offsetY
  };
  
  // If no tooltip element provided, return initial position
  if (!tooltipElement) {
    return initialPosition;
  }
  
  const rect = tooltipElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let adjustedX = initialPosition.x;
  let adjustedY = initialPosition.y;
  
  // Check if off-screen right
  if (rect.right > viewportWidth - 20) {
    adjustedX = Math.max(20, event.clientX - rect.width - offsetX);
  }
  
  // Check if off-screen bottom
  if (rect.bottom > viewportHeight - 20) {
    adjustedY = Math.max(20, event.clientY - rect.height - offsetY);
  }
  
  return {
    x: adjustedX,
    y: adjustedY
  };
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
 * Helper function to get material icon source
 */
export function getMaterialIconSrc(
  item: any, 
  isEquipmentTab: boolean, 
  currentExpIcon: number, 
  currentExpBall: number
): string {
  if (!item.material?.Icon) return '';
  
  const isExp = isExpReport(item.material?.Id);
  const isBall = isExpBall(item.material?.Id);
  
  if (isExp) {
    const expResource = getResourceDataById(currentExpIcon);
    return `https://schaledb.com/images/item/icon/${expResource?.Icon}.webp`;
  }
  
  if (isBall) {
    const expBallResource = getEquipmentDataById(currentExpBall);
    return `https://schaledb.com/images/equipment/icon/${expBallResource?.Icon}.webp`;
  }
  
  const baseUrl = isEquipmentTab ? 'equipment' : 'item';
  const suffix = isEquipmentTab && item.material?.Id !== 5 ? '_piece' : '';
  return `https://schaledb.com/images/${baseUrl}/icon/${item.material.Icon}${suffix}.webp`;
}