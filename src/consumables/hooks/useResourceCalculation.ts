import { computed, ref, onMounted } from 'vue';
import { getDataCollection, getResources } from '../utils/studentStorage';
import { StudentProps } from '../../types/student';
import { Material } from '../../types/upgrade';
import { getAllMaterialsData } from '../stores/resourceStore';

export function useResourceCalculation() {
  // Get all materials data from the store
  const allMaterialsData = computed(() => {
    return getAllMaterialsData();
  });

  // Calculate total materials needed across all students
  const totalMaterialsNeeded = computed(() => {
    const materialMap = new Map<number, Material>();
    
    // Aggregate materials from all students
    Object.entries(allMaterialsData.value).forEach(([studentId, materials]) => {
      materials.forEach(material => {
        const materialId = material.material?.Id;
        if (!materialId) return;

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
  const materialsLeftover = computed(() => {
    const resources = getResources() || {};
    const leftover: Material[] = [];

    totalMaterialsNeeded.value.forEach(needed => {
      const materialId = needed.material?.Id;
      if (!materialId) return;

      const resource = resources[materialId.toString()];
      if (!resource) return;

      const owned = resource.QuantityOwned || 0;
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
    
    Object.entries(allMaterialsData.value).forEach(([studentId, materials]) => {
      const student = getDataCollection('students')[studentId] as StudentProps;
      if (!student) return;

      const material = materials.find(m => m.material?.Id === materialId);
      if (material) {
        usage.push({
          student,
          quantity: material.materialQuantity
        });
      }
    });

    return usage;
  };

  return {
    totalMaterialsNeeded,
    materialsLeftover,
    getStudentMaterials,
    getMaterialUsageByStudents
  };
} 