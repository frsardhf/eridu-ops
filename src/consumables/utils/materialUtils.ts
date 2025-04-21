import { 
  getAllFormData, 
  getDataCollection 
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
 * Function to preload all student materials during initialization
 * This will calculate materials for all students that have form data
 */
export function preloadAllStudentsMaterials() {
  try {
    // Get all students form data
    const allFormData = getAllFormData();
    
    // Get all students data
    const allStudentsData = getDataCollection('students');
    
    // Process each student's form data
    Object.entries(allFormData).forEach(([studentId, formData]) => {
      if (!formData) return;
      
      const student = allStudentsData[studentId];
      if (!student) return;
      
      // Get skill levels, potential levels, and character levels from form data
      const skillLevels = formData.skillLevels ?? DEFAULT_SKILL_LEVELS;
      const potentialLevels = formData.potentialLevels ?? DEFAULT_POTENTIAL_LEVELS;
      const characterLevels = formData.characterLevels ?? DEFAULT_CHARACTER_LEVELS;
      
      // Skip if no upgrades are targeted
      if (!hasTargetUpgrades(characterLevels) && 
          !hasTargetUpgrades(skillLevels) && 
          !hasTargetUpgrades(potentialLevels)) {
        return;
      }
      
      // Calculate materials for this student using the exported function
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
    });
  } catch (error) {
    console.error('Error preloading materials data:', error);
  }
}

/**
 * Function to preload all student gears during initialization
 * This will calculate gears for all students that have form data
 */
export function preloadAllStudentsGears() {
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
      
      // Get skill levels, potential levels, and character levels from form data
      const equipmentLevels = formData.equipmentLevels ?? {};
      
      // Skip if no upgrades are targeted
      if (!hasTargetUpgrades(equipmentLevels)) {
        return;
      }
      
      // Calculate materials for this student using the exported function
      const materials = calculateAllGears(
        allGearsData,
        equipmentLevels
      );
      
      // Add to store
      if (materials.length > 0) {
        updateGearsData(studentId, materials);
      }
    });
  } catch (error) {
    console.error('Error preloading materials data:', error);
  }
}

/**
 * Helper function to check if a student has any target upgrades
 */
function hasTargetUpgrades(levels: Record<string, { current: number, target: number }>) {
  return Object.values(levels).some(level => level.target > level.current);
} 


/**
 * Function to format material quantity for display
 * This function formats the quantity of materials for display in the UI
 * It handles large numbers by using 'k' for thousands and 'M' for millions
 */
export function formatQuantity(quantity: number): string {
  if (!quantity || quantity <= 0) return '';
  
  // Format large numbers with 'k' suffix
  if (quantity >= 1000000) {
    return `×${Math.floor(quantity / 1000000)}M`;
  } else if (quantity >= 10000) {
    return `×${Math.floor(quantity / 1000)}K`;
  } 
  
  return `×${quantity}`;
};