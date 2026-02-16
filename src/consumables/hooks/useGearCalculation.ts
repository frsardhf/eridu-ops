import { computed, ComputedRef } from 'vue';
import { getEquipmentDataByIdSync, getAllEquipmentFromCache } from '../stores/resourceCacheStore';
import { useStudentData } from './useStudentData';
import { studentDataStore } from '../stores/studentStore';
import { StudentProps } from '../../types/student';
import { Material } from '../../types/upgrade';
import { EquipmentType, EquipmentLevels } from '../../types/gear';
import { getAllMaterialsData } from '../stores/materialsStore';
import { getAllGearsData } from '../stores/gearsStore';
import { isExpBall } from '../utils/materialUtils';
import dataTable from '../../data/data.json';

// Singleton state
let _allGearsData: ComputedRef<Record<string, Material[]>>;
let _totalEquipmentsNeeded: ComputedRef<Material[]>;
let _equipmentsLeftover: ComputedRef<Material[]>;

export function useGearCalculation() {
  const { studentData } = useStudentData();

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
      const form = studentDataStore.value[parseInt(studentId)];
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
          const student = studentData.value[studentId];
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

  // Helper function to calculate XP needs and ball allocations
  const calculateExpNeeds = () => {
    const resources = getAllEquipmentFromCache();
    const equipmentXpDetails = getEquipmentXpDetails();

    // Calculate total XP needed
    const totalXpNeeded = equipmentXpDetails.reduce((sum, detail) => sum + detail.xpNeeded, 0);

    // Calculate owned XP (sum of all XP ball quantities * their values)
    const ownedXp =
      (resources['1']?.QuantityOwned ?? 0) * (resources['1']?.LevelUpFeedExp ?? 0) +
      (resources['2']?.QuantityOwned ?? 0) * (resources['2']?.LevelUpFeedExp ?? 0) +
      (resources['3']?.QuantityOwned ?? 0) * (resources['3']?.LevelUpFeedExp ?? 0) +
      (resources['4']?.QuantityOwned ?? 0) * (resources['4']?.LevelUpFeedExp ?? 0);

    return {
      totalXpNeeded,
      ownedXp,
      equipmentXpDetails
    };
  };

  // Initialize computed on first call only
  if (!_allGearsData) {
    _allGearsData = computed(() => getAllGearsData());
  }

  const allGearsData = _allGearsData;

  // Calculate total materials needed across all students
  if (!_totalEquipmentsNeeded) {
    _totalEquipmentsNeeded = computed(() => {
    const materialMap = new Map<number, Material>();

    Object.entries(allGearsData.value).forEach(([studentId, materials]) => {
      (materials as Material[]).forEach(material => {
        const materialId = material.material?.Id;
        // Skip credits (5) and eligma (23) - they go to Items tab
        // Skip exclusive gear materials (type materials) - they go to Items/Gifts tabs
        if (!materialId || [5, 23].includes(materialId)) return;
        if (material.type === 'materials') return;

        if (materialMap.has(materialId)) {
          const existing = materialMap.get(materialId)!;
          existing.materialQuantity += material.materialQuantity;
        } else {
          materialMap.set(materialId, { ...material });
        }
      });
    });

    // Get XP calculation results
    const { totalXpNeeded } = calculateExpNeeds();

    // Add XP as a special material type
    materialMap.set(1, { // Using Novice exp ball ID as the XP material ID
      material: getEquipmentDataByIdSync(1),
      materialQuantity: totalXpNeeded,
      type: 'xp'
    });

    return Array.from(materialMap.values());
    });
  }

  const totalEquipmentsNeeded = _totalEquipmentsNeeded;

  // Calculate materials leftover
  if (!_equipmentsLeftover) {
    _equipmentsLeftover = computed(() => {
    const resources = getAllEquipmentFromCache();
    const leftover: Material[] = [];

    totalEquipmentsNeeded.value.forEach(needed => {
      const materialId = needed.material?.Id;
      if (!materialId) return;

      // For XP balls, use remaining XP instead of total XP
      if (isExpBall(materialId)) {
        const resource = resources[materialId];
        if (!resource) return;

        const owned = resource.QuantityOwned ?? 0;
        const remaining = owned - needed.materialQuantity;

        leftover.push({
          material: needed.material,
          materialQuantity: remaining, // Negative to indicate missing
          type: 'xp'
        });
        return;
      }

      const resource = resources[materialId];
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
  }

  const equipmentsLeftover = _equipmentsLeftover;

  // Get materials for a specific student
  const getStudentMaterials = (studentId: string | number): Material[] => {
    return allGearsData.value[studentId] || [];
  };

  // Get students using a specific material
  const getEquipmentUsageByStudents = (materialId: number, viewMode: 'needed' | 'missing' | 'equipment-needed' | 'equipment-missing' = 'needed') => {
    const usage: { student: StudentProps; quantity: number; equipmentTypes: EquipmentType[] }[] = [];
    const studentsCollection = studentData.value || {};

    if (isExpBall(materialId)) {
      const { equipmentXpDetails, totalXpNeeded, ownedXp } = calculateExpNeeds();
      
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
        
        const form = studentDataStore.value[parseInt(detail.studentId)];
        if (!form?.equipmentLevels) return;

        const equipmentLevels = form.equipmentLevels as EquipmentLevels;
        const equipmentLevel = equipmentLevels[detail.equipmentType as EquipmentType];
        
        if (!equipmentLevel) return;
        
        const currentLevel = equipmentLevel.current ?? 1;
        const targetLevel = equipmentLevel.target ?? currentLevel;
        
        if (currentLevel < targetLevel) {
          // Match the exp report implementation exactly
          const isNeededView = viewMode === 'needed' || viewMode === 'equipment-needed';
          const hasDeficit = ownedXp < totalXpNeeded;
          const quantity = (isNeededView || hasDeficit) ? detail.xpNeeded : 0;
          
          if (quantity > 0) {
            const existing = studentXpMap.get(detail.studentId);
            if (existing) {
              existing.totalXp += detail.xpNeeded;
              existing.remainingXp += detail.xpNeeded;
              existing.equipmentTypes.push(detail.equipmentType);
            } else {
              studentXpMap.set(detail.studentId, {
                student,
                totalXp: detail.xpNeeded,
                remainingXp: detail.xpNeeded,
                equipmentTypes: [detail.equipmentType]
              });
            }
          }
        }
      });
      
      // Convert map to array
      studentXpMap.forEach((value) => {
        // Match the exp report implementation exactly
        const isNeededView = viewMode === 'needed' || viewMode === 'equipment-needed';
        const hasDeficit = ownedXp < totalXpNeeded;
        let quantity = 0;
        if (isNeededView) {
          quantity = value.totalXp;
        } else if (hasDeficit) {
          quantity = value.remainingXp;
        }
        
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
      const equipments = getAllEquipmentFromCache();
      const ownedQuantity = equipments[materialId]?.QuantityOwned ?? 0;
      
      // First pass: collect all needed quantities
      Object.entries(allGearsData.value).forEach(([studentId, materials]) => {
        const student = studentsCollection[studentId];
        if (!student) return;
        
        let quantity = 0;
        const equipmentTypes: EquipmentType[] = [];
        
        (materials as Material[]).forEach(material => {
          if (material.material?.Id === materialId) {
            quantity += material.materialQuantity;
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
    isExpBall,
  };
}
