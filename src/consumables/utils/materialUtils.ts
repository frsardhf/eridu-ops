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
          gradeLevels
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
 * Function to format material quantity for display
 * This function formats the quantity of materials for display in the UI
 * It handles large numbers by using 'k' for thousands and 'M' for millions
 */
export function formatLargeNumber(quantity: number): string {
  if (!quantity || quantity <= 0) return '';
  
  // Format large numbers with 'k' suffix
  if (quantity >= 1000000) {
    return `×${Math.floor(quantity / 1000000)}M`;
  } else if (quantity >= 10000) {
    return `×${Math.floor(quantity / 1000)}K`;
  } 
  
  return `×${quantity}`;
};