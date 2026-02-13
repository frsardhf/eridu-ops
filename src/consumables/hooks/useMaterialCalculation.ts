import { computed, ComputedRef } from 'vue';
import { getResourceDataByIdSync, getAllResourcesFromCache } from '../stores/resourceCacheStore';
import { useStudentData } from './useStudentData';
import { studentDataStore } from '../stores/studentStore';
import { StudentProps } from '../../types/student';
import { Material, CREDITS_ID, ELIGMAS_ID } from '../../types/upgrade';
import { getAllMaterialsData } from '../stores/materialsStore';
import { getAllGearsData } from '../stores/gearsStore';
import { isExpReport } from '../utils/materialUtils';
import dataTable from '../../data/data.json';

// Singleton state
let _totalMaterialsNeeded: ComputedRef<Material[]>;
let _materialsLeftover: ComputedRef<Material[]>;
let _allMaterialsData: ComputedRef<Record<string, Material[]>>;
let _allGearsData: ComputedRef<Record<string, Material[]>>;

// Helper function to get student credits
const getStudentCredits = (studentId: string, materials: Material[], gears: Material[]) => {
  let quantity = 0;
  
  // Check materials data
  materials.forEach(material => {
    if (material.type === 'credits') {
      quantity += material.materialQuantity;
    }
  });
  
  // Check gear data
  gears.forEach(gear => {
    if (gear.type === 'credits') {
      quantity += gear.materialQuantity;
    }
  });
  
  return quantity;
};

export function useMaterialCalculation() {
  const { studentData } = useStudentData();

  // Helper function to get student XP details
  const getStudentXpDetails = () => {
    const characterXpTable = dataTable.character_xp ?? [];
    const studentXpDetails: {
      studentId: string;
      xpNeeded: number;
      remainingXp: number;
      name: string
    }[] = [];

    // Create a set of all student IDs from both data sources
    const allStudentIds = new Set<string>();
    Object.keys(getAllMaterialsData()).forEach(studentId => allStudentIds.add(studentId));
    Object.keys(getAllGearsData()).forEach(studentId => allStudentIds.add(studentId));

    // Calculate XP needed for each student
    allStudentIds.forEach(studentId => {
      const form = studentDataStore.value[parseInt(studentId)];
      if (!form || !form.characterLevels) return;

      const currentLevel = form.characterLevels.current ?? 1;
      const targetLevel = form.characterLevels.target ?? currentLevel;

      if (currentLevel >= targetLevel || !characterXpTable.length) return;

      const currentXp = characterXpTable[currentLevel - 1] ?? 0;
      const targetXp = characterXpTable[targetLevel - 1] ?? 0;
      const studentXpNeeded = Math.max(0, targetXp - currentXp);

      if (studentXpNeeded > 0) {
        const student = studentData.value[studentId];
        studentXpDetails.push({
          studentId,
          xpNeeded: studentXpNeeded,
          remainingXp: studentXpNeeded,
          name: student?.Name ?? studentId
        });
      }
    });

    return studentXpDetails.sort((a, b) => b.xpNeeded - a.xpNeeded);
  };

  // Helper function to calculate XP needs and report allocations
  const calculateExpNeeds = () => {
    const resources = getAllResourcesFromCache();
    const studentXpDetails = getStudentXpDetails();

    // Calculate total XP needed
    const totalXpNeeded = studentXpDetails.reduce((sum, detail) => sum + detail.xpNeeded, 0);

    // Calculate owned XP (sum of all XP report quantities * their values)
    const ownedXp =
      (resources['10']?.QuantityOwned ?? 0) * (resources['10']?.ExpValue ?? 0) +
      (resources['11']?.QuantityOwned ?? 0) * (resources['11']?.ExpValue ?? 0) +
      (resources['12']?.QuantityOwned ?? 0) * (resources['12']?.ExpValue ?? 0) +
      (resources['13']?.QuantityOwned ?? 0) * (resources['13']?.ExpValue ?? 0);

    return {
      totalXpNeeded,
      ownedXp,
      studentXpDetails
    };
  };

  // Initialize computed properties on first call only
  if (!_allMaterialsData) {
    _allMaterialsData = computed(() => getAllMaterialsData());
    _allGearsData = computed(() => getAllGearsData());
  }

  const allMaterialsData = _allMaterialsData;
  const allGearsData = _allGearsData;

  // Calculate total materials needed across all students
  if (!_totalMaterialsNeeded) {
    _totalMaterialsNeeded = computed(() => {
    const materialMap = new Map<number, Material>();
    const creditsMaterial = getResourceDataByIdSync(CREDITS_ID);
    const eligmasMaterial = getResourceDataByIdSync(ELIGMAS_ID);
    let creditsQuantity = 0;
    let eligmasQuantity = 0;

    Object.entries(allMaterialsData.value).forEach(([studentId, materials]) => {
      (materials as Material[]).forEach(material => {
        const materialId = material.material?.Id;
        if (!materialId) return;

        if (material.type === 'credits') {
          creditsQuantity += material.materialQuantity;
          return;
        }

        if (materialMap.has(materialId)) {
          const existing = materialMap.get(materialId)!;
          existing.materialQuantity += material.materialQuantity;
        } else {
          materialMap.set(materialId, { ...material });
        }
      });
    });

    // Combine credits and eligma from gears to materials
    // Also include exclusive gear's normal materials (non-gift items)
    Object.entries(allGearsData.value).forEach(([studentId, materials]) => {
      (materials as Material[]).forEach(material => {
        const materialId = material.material?.Id;
        const subcategory = material.material?.SubCategory;
        if (material.type === 'credits') {
          creditsQuantity += material.materialQuantity;
        } else if (materialId === ELIGMAS_ID) {
          eligmasQuantity += material.materialQuantity;
        } else if (subcategory === 'Artifact' && materialId) {
          if (materialMap.has(materialId)) {
            const existing = materialMap.get(materialId)!;
            existing.materialQuantity += material.materialQuantity;
          } else {
            materialMap.set(materialId, { ...material });
          }
        }
      });
    });
    
    materialMap.set(CREDITS_ID, { 
      material: creditsMaterial, 
      materialQuantity: creditsQuantity, 
      type: 'credits'}
    );

    materialMap.set(ELIGMAS_ID, { 
      material: eligmasMaterial, 
      materialQuantity: eligmasQuantity, 
      type: 'materials'}
    );

    // Add XP materials from helper function
    const { totalXpNeeded } = calculateExpNeeds();

    // Add XP as a special material type
    materialMap.set(10, { // Using Novice report ID as the XP material ID
      material: getResourceDataByIdSync(10),
      materialQuantity: totalXpNeeded,
      type: 'xp'
    });
    
    return Array.from(materialMap.values());
    });
  }

  const totalMaterialsNeeded = _totalMaterialsNeeded;

  // Calculate materials leftover
  if (!_materialsLeftover) {
    _materialsLeftover = computed(() => {
    const resources = getAllResourcesFromCache();
    const leftover: Material[] = [];

    totalMaterialsNeeded.value.forEach(needed => {
      const materialId = needed.material?.Id;
      if (!materialId) return;

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

  const materialsLeftover = _materialsLeftover;

  // Get materials for a specific student
  const getStudentMaterials = (studentId: string | number): Material[] => {
    return allMaterialsData.value[studentId] || [];
  };

  // Get students using a specific material
  const getMaterialUsageByStudents = (materialId: number, viewMode: 'needed' | 'missing' | 'equipment-needed' | 'equipment-missing' = 'needed') => {
    const usage: { student: StudentProps; quantity: number }[] = [];
    const isCredits = materialId === CREDITS_ID;
    const studentsCollection = studentData.value || {};
    
    if (isExpReport(materialId)) {
      // Handle EXP reports
      const { studentXpDetails } = calculateExpNeeds();
      
      studentXpDetails.forEach(detail => {
        const student = studentsCollection[detail.studentId];
        if (!student) return;
        
        const form = studentDataStore.value[parseInt(detail.studentId)];
        if (!form || !form.characterLevels) return;

        const currentLevel = form.characterLevels.current ?? 1;
        const targetLevel = form.characterLevels.target ?? currentLevel;
        
        if (currentLevel < targetLevel) {
          const quantity = viewMode === 'needed' ? detail.xpNeeded : detail.remainingXp;
          if (quantity > 0) {
            usage.push({ student, quantity });
          }
        }
      });
    } else if (isCredits) {
      // Handle credits
      const studentCredits = new Map<string, number>();
      const resources = getAllResourcesFromCache();
      const ownedCredits = resources[CREDITS_ID]?.QuantityOwned ?? 0;
      
      // First pass: collect all needed credits
      Object.entries(allMaterialsData.value).forEach(([studentId, materials]) => {
        const quantity = getStudentCredits(studentId, materials as Material[], allGearsData.value[studentId] || []);
        if (quantity > 0) {
          studentCredits.set(studentId, quantity);
        }
      });
      
      // Check gear data for students who only have gear upgrades
      Object.entries(allGearsData.value).forEach(([studentId, gears]) => {
        // Skip if we already processed this student's credits from materials
        if (studentCredits.has(studentId)) return;
        
        const quantity = getStudentCredits(studentId, [], gears as Material[]);
        if (quantity > 0) {
          studentCredits.set(studentId, quantity);
        }
      });
      
      // Calculate total needed credits
      const totalNeededCredits = Array.from(studentCredits.values()).reduce((sum, qty) => sum + qty, 0);
      
      // Sort students by credit needs (highest to lowest)
      const sortedStudents = Array.from(studentCredits.entries())
        .sort(([, a], [, b]) => a - b);
      
      // Calculate remaining credits for each student
      let remainingCredits = Math.max(0, totalNeededCredits - ownedCredits);
      const studentRemainingCredits = new Map<string, number>();
      
      // Distribute remaining credits to students with highest needs first
      for (const [studentId, neededCredits] of sortedStudents) {
        if (remainingCredits <= 0) {
          studentRemainingCredits.set(studentId, 0);
          continue;
        }
        
        const studentRemaining = Math.min(neededCredits, remainingCredits);
        studentRemainingCredits.set(studentId, studentRemaining);
        remainingCredits -= studentRemaining;
      }
      
      // Add all students with credits to the usage array
      studentCredits.forEach((quantity, studentId) => {
        const student = studentsCollection[studentId];
        if (student) {
          const isMissingView = viewMode === 'missing' || viewMode === 'equipment-missing';
          const displayQuantity = isMissingView ? studentRemainingCredits.get(studentId) ?? 0 : quantity;
          
          if (displayQuantity > 0) {
            usage.push({ student, quantity: displayQuantity });
          }
        }
      });
    } else {
      // Handle regular materials
      const materialNeeds = new Map<string, number>();
      const resources = getAllResourcesFromCache();
      const ownedQuantity = resources[materialId]?.QuantityOwned ?? 0;
      
      // First pass: collect all needed quantities
      Object.entries(allMaterialsData.value).forEach(([studentId, materials]) => {
        const student = studentsCollection[studentId];
        if (!student) return;
        
        let quantity = 0;
        (materials as Material[]).forEach(material => {
          if (material.material?.Id === materialId) {
            quantity += material.materialQuantity;
          }
        });
        
        if (quantity > 0) {
          materialNeeds.set(studentId, quantity);
        }
      });

      // Check gear data for students who only have gear upgrades
      Object.entries(allGearsData.value).forEach(([studentId, gears]) => {
        // Collect eligmas needed
        const student = studentsCollection[studentId];
        if (!student) return;

        let quantity = 0;
        (gears as Material[]).forEach(gear => {
          if (gear.material?.Id === materialId) {
            quantity += gear.materialQuantity;
          }
        });
        
        if (quantity > 0) {
          materialNeeds.set(studentId, quantity);
        }
      });
      
      // Calculate total needed quantity
      const totalNeededQuantity = Array.from(materialNeeds.values()).reduce((sum, qty) => sum + qty, 0);
      
      // Sort students by material needs (highest to lowest)
      const sortedStudents = Array.from(materialNeeds.entries())
        .sort(([, a], [, b]) => a - b);
      
      // Calculate remaining quantity for each student
      let remainingQuantity = Math.max(0, totalNeededQuantity - ownedQuantity);
      const studentRemainingQuantities = new Map<string, number>();
      
      // Distribute remaining quantity to students with highest needs first
      for (const [studentId, neededQuantity] of sortedStudents) {
        if (remainingQuantity <= 0) {
          studentRemainingQuantities.set(studentId, 0);
          continue;
        }
        
        const studentRemaining = Math.min(neededQuantity, remainingQuantity);
        studentRemainingQuantities.set(studentId, studentRemaining);
        remainingQuantity -= studentRemaining;
      }
      
      // Add all students with materials to the usage array
      materialNeeds.forEach((quantity, studentId) => {
        const student = studentsCollection[studentId];
        if (student) {
          const isMissingView = viewMode === 'missing' || viewMode === 'equipment-missing';
          const displayQuantity = isMissingView ? studentRemainingQuantities.get(studentId) ?? 0 : quantity;
          
          if (displayQuantity > 0) {
            usage.push({ student, quantity: displayQuantity });
          }
        }
      });
    }
    
    return usage;
  };

  return {
    totalMaterialsNeeded,
    materialsLeftover,
    getStudentMaterials,
    getMaterialUsageByStudents,
    calculateExpNeeds
  };
}