import { computed } from 'vue';
import { getResourceDataById, getResources } from '../utils/studentStorage';
import { useStudentData } from './useStudentData';
import { studentDataStore } from '../stores/studentStore';
import { StudentProps } from '../../types/student';
import { Material, CREDITS_ID, ELIGMAS_ID } from '../../types/upgrade';
import { getAllMaterialsData } from '../stores/materialsStore';
import { getAllGearsData } from '../stores/equipmentsStore';
import { isExpReport } from '../utils/materialUtils';
import dataTable from '../../data/data.json';

// Helper function to get student XP details
const getStudentXpDetails = () => {
  const { studentData } = useStudentData();
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
    const form = studentDataStore.value[studentId];
    if (!form) return;

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
function calculateExpNeeds() {
  const resources = getResources() || {};
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
}

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

export function useResourceCalculation() {
  const { studentData } = useStudentData();
  const allMaterialsData = computed(() => getAllMaterialsData());
  const allGearsData = computed(() => getAllGearsData());

  // Calculate total materials needed across all students
  const totalMaterialsNeeded = computed(() => {
    const materialMap = new Map<number, Material>();
    const creditsMaterial = getResourceDataById(CREDITS_ID);
    const eligmasMaterial = getResourceDataById(ELIGMAS_ID);
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

    // Combine credits from gears to materials
    Object.entries(allGearsData.value).forEach(([studentId, materials]) => {
      (materials as Material[]).forEach(material => {
        if (material.type === 'credits') {
          creditsQuantity += material.materialQuantity;
        } else if (material.type === 'materials') {
          eligmasQuantity += material.materialQuantity;
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
      material: getResourceDataById(10),
      materialQuantity: totalXpNeeded,
      type: 'xp'
    });
    
    return Array.from(materialMap.values());
  });

  // Calculate materials leftover
  const materialsLeftover = computed(() => {
    const resources = getResources() || {};
    const leftover: Material[] = [];

    totalMaterialsNeeded.value.forEach(needed => {
      const materialId = needed.material?.Id;
      if (!materialId) return;

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
        
        const form = studentDataStore.value[detail.studentId];
        if (!form) return;

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
      const resources = getResources() || {};
      const ownedCredits = resources[CREDITS_ID.toString()]?.QuantityOwned ?? 0;
      
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
      const resources = getResources() || {};
      const ownedQuantity = resources[materialId.toString()]?.QuantityOwned ?? 0;
      
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