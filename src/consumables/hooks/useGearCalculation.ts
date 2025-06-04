import { computed } from 'vue';
import { getDataCollection, getEquipmentDataById, getEquipments, getResources } from '../utils/studentStorage';
import { StudentProps } from '../../types/student';
import { Material } from '../../types/upgrade';
import { EquipmentMaterial, EquipmentType, EquipmentLevels } from '../../types/gear';
import { getAllMaterialsData } from '../stores/materialsStore';
import { getAllGearsData } from '../stores/equipmentsStore';
import dataTable from '../../data/data.json';

// Helper function to check if a material ID is an EXP ball
const isExpBall = (materialId: number) => {
  return [1, 2, 3, 4].includes(materialId);
};

// Helper function to get equipment XP details
const getEquipmentXpDetails = () => {
  const equipmentXpTable = dataTable.equipment_xp ?? [];
  const equipmentXpDetails: { 
    studentId: string; 
    xpNeeded: number; 
    remainingXp: number;
    name: string;
    equipmentType: EquipmentType;
  }[] = [];

  // Create a set of all student IDs from both data sources
  const allStudentIds = new Set<string>();
  Object.keys(getAllMaterialsData()).forEach(studentId => allStudentIds.add(studentId));
  Object.keys(getAllGearsData()).forEach(studentId => allStudentIds.add(studentId));
  
  // Calculate XP needed for each student's equipment
  allStudentIds.forEach(studentId => {
    const form = getDataCollection('forms')[studentId];
    if (!form?.equipmentLevels) return;

    const equipmentLevels = form.equipmentLevels as EquipmentLevels;
    
    // Calculate XP for each equipment type
    Object.entries(equipmentLevels).forEach(([type, levels]) => {
      const currentLevel = levels.current ?? 1;
      const targetLevel = levels.target ?? currentLevel;
      
      if (currentLevel >= targetLevel || !equipmentXpTable.length) return;
      
      // Calculate XP needed using cumulative values
      // equipmentXpTable[0] = XP from 1->2
      // equipmentXpTable[1] = XP from 1->3
      // equipmentXpTable[8] = XP from 1->10
      const currentXp = currentLevel === 1 ? 0 : equipmentXpTable[currentLevel - 2] ?? 0;
      const targetXp = equipmentXpTable[targetLevel - 2] ?? 0;
      const totalXpNeeded = targetXp - currentXp;
      
      if (totalXpNeeded > 0) {
        const student = getDataCollection('students')[studentId];
        equipmentXpDetails.push({
          studentId,
          xpNeeded: totalXpNeeded,
          remainingXp: totalXpNeeded,
          name: student?.Name ?? studentId,
          equipmentType: type as EquipmentType
        });
      }
    });
  });
  
  return equipmentXpDetails.sort((a, b) => b.xpNeeded - a.xpNeeded);
};

// Helper function to allocate XP balls
const allocateXpBalls = (equipmentXpDetails: any[], resources: any) => {
  // Get available XP balls from resources
  const expBallInfo = [
    { id: 4, value: resources['4']?.LevelUpFeedExp ?? 0, quantity: resources['4']?.QuantityOwned ?? 0 }, // Superior
    { id: 3, value: resources['3']?.LevelUpFeedExp ?? 0, quantity: resources['3']?.QuantityOwned ?? 0 }, // Advanced
    { id: 2, value: resources['2']?.LevelUpFeedExp ?? 0, quantity: resources['2']?.QuantityOwned ?? 0 }, // Normal
    { id: 1, value: resources['1']?.LevelUpFeedExp ?? 0, quantity: resources['1']?.QuantityOwned ?? 0 }  // Novice
  ].filter(item => item.value > 0 && item.quantity > 0);

  // Allocate available exp balls efficiently
  for (const expBall of expBallInfo) {
    if (expBall.value <= 0) continue;
    
    let availableBalls = expBall.quantity;
    if (availableBalls <= 0) continue;
    
    while (availableBalls > 0 && equipmentXpDetails.some(s => s.remainingXp > 0)) {
      equipmentXpDetails.sort((a, b) => b.remainingXp - a.remainingXp);
      const student = equipmentXpDetails[0];
      if (student.remainingXp <= 0) break;
      
      const ballsNeeded = Math.ceil(student.remainingXp / expBall.value);
      const ballsToUse = Math.min(ballsNeeded, availableBalls);
      
      if (ballsToUse <= 0) break;
      
      const xpProvided = ballsToUse * expBall.value;
      student.remainingXp = Math.max(0, student.remainingXp - xpProvided);
      availableBalls -= ballsToUse;
    }
  }
};

// Helper function to calculate XP needs and ball allocations
function calculateExpNeeds() {
  const resources = getEquipments() || {};
  const equipmentXpDetails = getEquipmentXpDetails();
  
  // Calculate total XP needed
  const totalXpNeeded = equipmentXpDetails.reduce((sum, detail) => sum + detail.xpNeeded, 0);
  
  // Allocate available XP balls
  allocateXpBalls(equipmentXpDetails, resources);
  
  // Calculate remaining XP needed after using available balls
  const remainingXpNeeded = equipmentXpDetails.reduce((sum, student) => sum + student.remainingXp, 0);
  
  return {
    totalXpNeeded,
    remainingXpNeeded,
    equipmentXpDetails
  };
}

export function useGearCalculation() {
  const allGearsData = computed(() => getAllGearsData());
  
  // Add cache for XP calculation results
  let xpCalculationCache: {
    totalXpNeeded: number;
    remainingXpNeeded: number;
    equipmentXpDetails: any[];
  } | null = null;

  // Calculate total materials needed across all students
  const totalEquipmentsNeeded = computed(() => {
    const materialMap = new Map<number, Material>();

    Object.entries(allGearsData.value).forEach(([studentId, materials]) => {
      (materials as Material[]).forEach(material => {
        const materialId = material.material?.Id;
        if (!materialId || materialId === 5) return; // Skip credits (ID: 5)

        if (materialMap.has(materialId)) {
          const existing = materialMap.get(materialId)!;
          existing.materialQuantity += material.materialQuantity;
        } else {
          materialMap.set(materialId, { ...material });
        }
      });
    });

    // Get XP calculation results (using cache if available)
    if (!xpCalculationCache) {
      xpCalculationCache = calculateExpNeeds();
    }
    const { totalXpNeeded } = xpCalculationCache;
    
    // Add XP as a special material type
    materialMap.set(1, { // Using Novice exp ball ID as the XP material ID
      material: getEquipmentDataById(1),
      materialQuantity: totalXpNeeded,
      type: 'xp'
    });
    
    return Array.from(materialMap.values());
  });

  // Calculate materials leftover
  const equipmentsLeftover = computed(() => {
    const resources = getResources() || {};
    const leftover: Material[] = [];

    totalEquipmentsNeeded.value.forEach(needed => {
      const materialId = needed.material?.Id;
      if (!materialId) return;

      // For XP balls, use remaining XP instead of total XP
      if (isExpBall(materialId)) {
        if (!xpCalculationCache) {
          xpCalculationCache = calculateExpNeeds();
        }
        const { remainingXpNeeded } = xpCalculationCache;
        leftover.push({
          material: needed.material,
          materialQuantity: -remainingXpNeeded, // Negative to indicate missing
          type: 'xp'
        });
        return;
      }

      const resource = resources[materialId.toString()];
      if (!resource) return;

      const owned = resource.QuantityOwned ?? 0;
      const remaining = owned - needed.materialQuantity;

      leftover.push({
        material: resource,
        materialQuantity: remaining,
        type: needed.type
      });
    });

    return leftover;
  });

  // Get materials for a specific student
  const getStudentMaterials = (studentId: string | number): Material[] => {
    return allGearsData.value[studentId] || [];
  };

  // Get students using a specific material
  const getEquipmentUsageByStudents = (materialId: number, viewMode: 'needed' | 'missing' | 'equipment-needed' | 'equipment-missing' = 'needed') => {
    const usage: { student: StudentProps; quantity: number; equipmentTypes: EquipmentType[] }[] = [];
    const studentsCollection = getDataCollection('students') || {};
    
    if (isExpBall(materialId)) {
      // Use cached XP details if available
      if (!xpCalculationCache) {
        xpCalculationCache = calculateExpNeeds();
      }
      const { equipmentXpDetails } = xpCalculationCache;
      
      // Group XP details by student
      const studentXpMap = new Map<string, { 
        student: StudentProps; 
        totalXp: number; 
        remainingXp: number;
        equipmentTypes: EquipmentType[] 
      }>();
      
      equipmentXpDetails.forEach(detail => {
        const student = studentsCollection[detail.studentId];
        if (!student) return;
        
        const form = getDataCollection('forms')[detail.studentId];
        if (!form?.equipmentLevels) return;

        const equipmentLevels = form.equipmentLevels as EquipmentLevels;
        const equipmentLevel = equipmentLevels[detail.equipmentType];
        
        if (!equipmentLevel) return;
        
        const currentLevel = equipmentLevel.current ?? 1;
        const targetLevel = equipmentLevel.target ?? currentLevel;
        
        if (currentLevel < targetLevel) {
          // Match the exp report implementation exactly
          const quantity = viewMode === 'needed' || viewMode === 'equipment-needed' ? detail.xpNeeded : detail.remainingXp;
          
          if (quantity > 0) {
            const existing = studentXpMap.get(detail.studentId);
            if (existing) {
              existing.totalXp += detail.xpNeeded;
              existing.remainingXp += detail.remainingXp;
              existing.equipmentTypes.push(detail.equipmentType);
            } else {
              studentXpMap.set(detail.studentId, {
                student,
                totalXp: detail.xpNeeded,
                remainingXp: detail.remainingXp,
                equipmentTypes: [detail.equipmentType]
              });
            }
          }
        }
      });
      
      // Convert map to array
      studentXpMap.forEach((value) => {
        // Match the exp report implementation exactly
        const quantity = viewMode === 'needed' || viewMode === 'equipment-needed' ? value.totalXp : value.remainingXp;
        
        if (quantity > 0) {
          usage.push({
            student: value.student,
            quantity,
            equipmentTypes: value.equipmentTypes
          });
        }
      });
    } else if (materialId !== 5) { // Skip credits (ID: 5)
      // Handle regular materials
      const materialNeeds = new Map<string, { quantity: number; equipmentTypes: EquipmentType[] }>();
      const equipments = getEquipments() || {};
      const ownedQuantity = equipments[materialId.toString()]?.QuantityOwned ?? 0;
      
      // First pass: collect all needed quantities
      Object.entries(allGearsData.value).forEach(([studentId, materials]) => {
        const student = studentsCollection[studentId];
        if (!student) return;
        
        let quantity = 0;
        const equipmentTypes: EquipmentType[] = [];
        
        (materials as EquipmentMaterial[]).forEach(material => {
          if (material.material?.Id === materialId) {
            quantity += material.materialQuantity;
            equipmentTypes.push(material.equipmentType);
          }
        });
        
        if (quantity > 0) {
          materialNeeds.set(studentId, { quantity, equipmentTypes });
        }
      });
      
      // Calculate total needed quantity
      const totalNeededQuantity = Array.from(materialNeeds.values())
        .reduce((sum, { quantity }) => sum + quantity, 0);
      
      // Sort students by material needs (highest to lowest)
      const sortedStudents = Array.from(materialNeeds.entries())
        .sort(([, a], [, b]) => a.quantity - b.quantity);
      
      // Calculate remaining quantity for each student
      let remainingQuantity = Math.max(0, totalNeededQuantity - ownedQuantity);
      const studentRemainingQuantities = new Map<string, number>();
      
      // Distribute remaining quantity to students with highest needs first
      for (const [studentId, { quantity: neededQuantity }] of sortedStudents) {
        if (remainingQuantity <= 0) {
          studentRemainingQuantities.set(studentId, 0);
          continue;
        }
        
        const studentRemaining = Math.min(neededQuantity, remainingQuantity);
        studentRemainingQuantities.set(studentId, studentRemaining);
        remainingQuantity -= studentRemaining;
      }
      
      // Add all students with materials to the usage array
      materialNeeds.forEach(({ quantity, equipmentTypes }, studentId) => {
        const student = studentsCollection[studentId];
        if (student) {
          const isMissingView = viewMode === 'missing' || viewMode === 'equipment-missing';
          const displayQuantity = isMissingView ? studentRemainingQuantities.get(studentId) ?? 0 : quantity;
          
          if (displayQuantity > 0) {
            usage.push({ 
              student, 
              quantity: displayQuantity,
              equipmentTypes
            });
          }
        }
      });
    }
    
    return usage;
  };

  return {
    totalEquipmentsNeeded,
    equipmentsLeftover,
    getStudentMaterials,
    getEquipmentUsageByStudents,
    calculateExpNeeds,
    isExpBall
  };
}