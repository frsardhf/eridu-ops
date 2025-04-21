import { computed, ref, onMounted } from 'vue';
import { getDataCollection, getResourceDataById, getResources } from '../utils/studentStorage';
import { StudentProps } from '../../types/student';
import { Material, CREDITS_ID } from '../../types/upgrade';
import { getAllMaterialsData } from '../stores/materialsStore';
import { getAllGearsData } from '../stores/equipmentsStore';
import dataTable from '../../data/data.json';
import { useStudentGear } from './useStudentGear';

// Helper function to calculate XP needs and report allocations
function calculateExpNeeds() {
  // Placeholder for actual logic
  
  return undefined;
}

// Helper function to check if a material ID is an EXP report
const isExpReport = (materialId: number) => {
  return [10, 11, 12, 13].includes(materialId);
};

export function useGearCalculation() {
  const allGearsData = computed(() => {
    return getAllGearsData();
  });

  // Calculate total materials needed across all students
  const totalEquipmentsNeeded = computed(() => {
    const materialMap = new Map<number, Material>();
    
    Object.entries(allGearsData.value).forEach(([studentId, materials]) => {
      (materials as Material[]).forEach(material => {
        const materialId = material.material?.Id;
        if (!materialId) return;
        
        if (materialId === CREDITS_ID) return; // Skip credits

        if (materialMap.has(materialId)) {
          const existing = materialMap.get(materialId)!;
          existing.materialQuantity += material.materialQuantity;
        } else {
          materialMap.set(materialId, { ...material });
        }
      });
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
  const getEquipmentUsageByStudents = (materialId: number) => {
    const usage: { student: StudentProps; quantity: number }[] = [];
    
    // Handle EXP reports differently
    if (isExpReport(materialId)) {
      // Get all students from the collection
      // const studentsCollection = getDataCollection('students') || {};
      
      // Get the optimal allocation of reports per student
      // const exp = calculateExpNeeds();

      // Add each student that needs this report type
      // studentReportAllocations.forEach((reportAllocations, studentId) => {
      //   const student = studentsCollection[studentId];
      //   if (!student) return;
        
      //   const reportsNeeded = reportAllocations.get(materialId) || 0;
      //   if (reportsNeeded > 0) {
      //     usage.push({
      //       student,
      //       quantity: reportsNeeded
      //     });
      //   }
      // });
    } else {
      // Handle regular materials as before
      Object.entries(allGearsData.value).forEach(([studentId, materials]) => {
        const student = getDataCollection('students')[studentId] as StudentProps;
        if (!student) return;

        const material = (materials as Material[]).find(m => m.material?.Id === materialId);
        if (material) {
          usage.push({
            student,
            quantity: material.materialQuantity
          });
        }
      });
    }

    return usage;
  };

  return {
    totalEquipmentsNeeded,
    equipmentsLeftover,
    getStudentMaterials,
    getEquipmentUsageByStudents
  };
}