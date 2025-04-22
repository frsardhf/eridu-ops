import { computed } from 'vue';
import { getDataCollection, getResourceDataById, getResources } from '../utils/studentStorage';
import { StudentProps } from '../../types/student';
import { Material, CREDITS_ID } from '../../types/upgrade';
import { getAllMaterialsData } from '../stores/materialsStore';
import { getAllGearsData } from '../stores/equipmentsStore';
import dataTable from '../../data/data.json';

// Helper function to calculate XP needs and report allocations
function calculateExpNeeds() {
  const resources = getResources() || {};
  const characterXpTable = dataTable.character_xp ?? [];
  
  // Create exp item info array sorted by value (highest first)
  const expItemInfo = [
    { id: 13, value: resources['13']?.ExpValue, quantity: resources['13']?.QuantityOwned }, // Superior
    { id: 12, value: resources['12']?.ExpValue, quantity: resources['12']?.QuantityOwned }, // Advanced
    { id: 11, value: resources['11']?.ExpValue, quantity: resources['11']?.QuantityOwned }, // Normal
    { id: 10, value: resources['10']?.ExpValue, quantity: resources['10']?.QuantityOwned }  // Novice
  ].filter(item => item.value > 0);
  
  // Get all students that need XP and their XP requirements
  const studentXpDetails: { studentId: string; xpNeeded: number; name: string }[] = [];

  // Create a set of all student IDs from both data sources
  const allStudentIds = new Set<string>();
  
  // Add all students from materials data
  Object.keys(getAllMaterialsData()).forEach(studentId => {
    allStudentIds.add(studentId);
  });
  
  // Add all students from gear data
  Object.keys(getAllGearsData()).forEach(studentId => {
    allStudentIds.add(studentId);
  });
  
  // Calculate XP needed for each student and build the array
  allStudentIds.forEach(studentId => {
    // Get the form data directly, which contains level info
    const form = getDataCollection('forms')[studentId];
    if (!form.characterLevels) return;

    const currentLevel = form.characterLevels.current ?? 1;
    const targetLevel = form.characterLevels.target ?? currentLevel;
    
    if (currentLevel >= targetLevel || !characterXpTable.length) return;
    
    const currentXp = characterXpTable[currentLevel - 1] ?? 0;
    const targetXp = characterXpTable[targetLevel - 1] ?? 0;
    const studentXpNeeded = Math.max(0, targetXp - currentXp);
    
    if (studentXpNeeded > 0) {
      const student = getDataCollection('students')[studentId];
      studentXpDetails.push({
        studentId,
        xpNeeded: studentXpNeeded,
        name: student?.Name ?? studentId
      });
    }
  });
  
  // Sort students by XP needed (descending) to optimize allocation
  studentXpDetails.sort((a, b) => b.xpNeeded - a.xpNeeded);
  
  // Calculate total XP needed
  const totalXpNeeded = studentXpDetails.reduce((sum, detail) => sum + detail.xpNeeded, 0);
  
  // Create a map to store allocated reports per student
  const studentReportAllocations = new Map<string, Map<number, number>>();
  
  // Initialize each student's allocation map
  studentXpDetails.forEach(detail => {
    studentReportAllocations.set(detail.studentId, new Map<number, number>());
  });
  
  // Create a map to store total allocated materials
  const allocatedMaterials = new Map<number, Material>();
  
  if (totalXpNeeded > 0 && studentXpDetails.length > 0) {
    // Clone the student XP details to track remaining XP needs during allocation
    const remainingStudentXp = [...studentXpDetails].map(detail => ({
      ...detail,
      remainingXp: detail.xpNeeded
    }));
    
    // First, allocate available reports efficiently
    for (const expItem of expItemInfo) {
      if (expItem.value <= 0) continue;
      
      let availableReports = expItem.quantity;
      if (availableReports <= 0) continue;
      
      // Keep allocating until we run out of reports or all students are satisfied
      while (availableReports > 0 && remainingStudentXp.some(s => s.remainingXp > 0)) {
        // Sort by remaining XP (descending) - allocate to highest need first
        remainingStudentXp.sort((a, b) => b.remainingXp - a.remainingXp);
        
        // Get student with highest remaining XP need
        const student = remainingStudentXp[0];
        if (student.remainingXp <= 0) break;
        
        // Calculate how many reports this student needs of this type
        const reportsNeeded = Math.ceil(student.remainingXp / expItem.value);
        const reportsToUse = Math.min(reportsNeeded, availableReports);
        
        if (reportsToUse <= 0) break;
        
        // Update the student's allocation
        const studentAllocation = studentReportAllocations.get(student.studentId)!;
        studentAllocation.set(
          expItem.id, 
          (studentAllocation.get(expItem.id) ?? 0) + reportsToUse
        );
        
        // Update the student's remaining XP
        const xpProvided = reportsToUse * expItem.value;
        student.remainingXp = Math.max(0, student.remainingXp - xpProvided);
        
        // Update available reports
        availableReports -= reportsToUse;
        
        // Update the total allocated materials
        if (allocatedMaterials.has(expItem.id)) {
          allocatedMaterials.get(expItem.id)!.materialQuantity += reportsToUse;
        } else {
          allocatedMaterials.set(expItem.id, {
            material: resources[expItem.id.toString()],
            materialQuantity: reportsToUse,
            type: 'materials'
          });
        }
      }
    }
    
    // If we still have students with remaining XP needs, allocate additional reports
    // starting with the most efficient report type
    for (const expItem of expItemInfo) {
      if (expItem.value <= 0) continue;
      
      // Process each student that still needs XP
      for (const student of remainingStudentXp) {
        if (student.remainingXp <= 0) continue;
        
        // Calculate additional reports needed of this type
        const additionalReportsNeeded = Math.ceil(student.remainingXp / expItem.value);
        student.remainingXp = Math.max(0, student.remainingXp - (additionalReportsNeeded * expItem.value));
        
        if (additionalReportsNeeded > 0) {
          // Update the student's allocation
          const studentAllocation = studentReportAllocations.get(student.studentId)!;
          studentAllocation.set(
            expItem.id, 
            (studentAllocation.get(expItem.id) ?? 0) + additionalReportsNeeded
          );
          
          // Update the student's remaining XP
          student.remainingXp -= additionalReportsNeeded * expItem.value;
          
          // Update the total allocated materials
          if (allocatedMaterials.has(expItem.id)) {
            allocatedMaterials.get(expItem.id)!.materialQuantity += additionalReportsNeeded;
          } else {
            allocatedMaterials.set(expItem.id, {
              material: resources[expItem.id.toString()],
              materialQuantity: additionalReportsNeeded,
              type: 'materials'
            });
          }
        }
        
        // Once we've allocated using this report type, stop processing other students
        // to optimize farming (use the most efficient report type)
        if (student.remainingXp <= 0) break;
      }
      
      // If all students are satisfied, stop processing other report types
      if (remainingStudentXp.every(s => s.remainingXp <= 0)) break;
    }
    
    // Adjust for over-allocation
    for (const student of remainingStudentXp) {
      if (student.remainingXp < 0) {
        // Find the smallest report type allocated to this student
        const studentAllocation = studentReportAllocations.get(student.studentId)!;
        const allocatedReportIds = Array.from(studentAllocation.keys()).sort(
          (a, b) => a - b // Sort by ID (ascending) to get lowest value report
        );
        
        if (allocatedReportIds.length > 0) {
          const smallestReportId = allocatedReportIds[0];
          const expItemValue = resources[smallestReportId.toString()]?.ExpValue ?? 0;
          
          if (expItemValue > 0) {
            const excess = Math.ceil(Math.abs(student.remainingXp) / expItemValue);
            const currentAllocation = studentAllocation.get(smallestReportId) ?? 0;
            
            // Reduce this student's allocation of the smallest report
            const newAllocation = Math.max(0, currentAllocation - excess);
            studentAllocation.set(smallestReportId, newAllocation);
            
            // Update the total allocated materials
            if (allocatedMaterials.has(smallestReportId)) {
              const material = allocatedMaterials.get(smallestReportId)!;
              material.materialQuantity = Math.max(0, material.materialQuantity - excess);
              
              // Remove if zero
              if (material.materialQuantity <= 0) {
                allocatedMaterials.delete(smallestReportId);
              }
            }
          }
        }
      }
    }
  }
  
  return {
    totalXpNeeded,
    studentXpDetails,
    studentReportAllocations,
    allocatedMaterials,
    expItemInfo
  };
}

// Helper function to check if a material ID is an EXP report
const isExpReport = (materialId: number) => {
  return [10, 11, 12, 13].includes(materialId);
};

export function useResourceCalculation() {
  const allMaterialsData = computed(() => {
    return getAllMaterialsData();
  });

  const allGearsData = computed(() => {
    return getAllGearsData();
  });

  // Calculate total materials needed across all students
  const totalMaterialsNeeded = computed(() => {
    const materialMap = new Map<number, Material>();
    let creditsMaterial = getResourceDataById(CREDITS_ID);
    let creditsQuantity = 0;

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
        }
      });
    });
    
    materialMap.set(CREDITS_ID, { 
      material: creditsMaterial, 
      materialQuantity: creditsQuantity, 
      type: 'credits'}
    );

    // Add EXP materials from helper function
    const { allocatedMaterials } = calculateExpNeeds();
    
    // Merge the EXP materials into our material map
    allocatedMaterials.forEach((material, id) => {
      materialMap.set(id, material);
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
  const getMaterialUsageByStudents = (materialId: number) => {
    const usage: { student: StudentProps; quantity: number }[] = [];
    const isCredits = materialId === CREDITS_ID;
    
    // Handle EXP reports differently
    if (isExpReport(materialId)) {
      // Get all students from the collection
      const studentsCollection = getDataCollection('students') || {};
      
      // Get the optimal allocation of reports per student
      const { studentReportAllocations } = calculateExpNeeds();
      
      // Add each student that needs this report type
      studentReportAllocations.forEach((reportAllocations, studentId) => {
        const student = studentsCollection[studentId];
        if (!student) return;
        
        const reportsNeeded = reportAllocations.get(materialId) ?? 0;
        if (reportsNeeded > 0) {
          usage.push({
            student,
            quantity: reportsNeeded
          });
        }
      });
    } else {
      // Create a set of all student IDs from both data sources
      const allStudentIds = new Set<string>();
      
      // Add all students from materials data
      Object.keys(allMaterialsData.value).forEach(studentId => {
        allStudentIds.add(studentId);
      });
      
      // Add all students from gear data
      Object.keys(allGearsData.value).forEach(studentId => {
        allStudentIds.add(studentId);
      });
      
      // Now process each student
      allStudentIds.forEach(studentId => {
        const student = getDataCollection('students')[studentId] as StudentProps;
        if (!student) return;
        let quantity = 0;
        
        // Count from materials if this student has materials data
        if (allMaterialsData.value[studentId]) {
          allMaterialsData.value[studentId].forEach(material => {
            if ((isCredits && material.type === 'credits') ||
                (!isCredits && material.material?.Id === materialId)) {
              quantity += material.materialQuantity;
            }
          });
        }
        
        // Count from gear/equipment if this is credits and student has gear data
        if (isCredits && allGearsData.value[studentId]) {
          allGearsData.value[studentId].forEach(gear => {
            if (gear.type === 'credits') {
              quantity += gear.materialQuantity;
            }
          });
        }
        
        // Only add students who actually use this material
        if (quantity > 0) {
          usage.push({ student, quantity });
        }
      });
    }
    
    return usage;
  };

  return {
    totalMaterialsNeeded,
    materialsLeftover,
    getStudentMaterials,
    getMaterialUsageByStudents
  };
}