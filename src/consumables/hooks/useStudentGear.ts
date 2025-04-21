import { ref, computed, watch } from 'vue';
import { ModalProps, StudentProps } from '../../types/student';
import dataTable from '../../data/data.json';
import { 
  loadFormDataToRefs, 
  saveFormData, 
  getEquipments,
  getResourceDataById,
  getEquipmentDataById
 } from '../utils/studentStorage';
import { 
  EquipmentItem,
  EquipmentLevels, 
  EquipmentType 
} from '../../types/equipment';
import {
  CREDITS_ID,
  Material,
} from '../../types/upgrade';
import { consolidateAndSortMaterials } from '../utils/materialUtils';
import { updateMaterialsData } from '../stores/materialsStore';
import { updateStudentData } from '../stores/studentStore';
import { ResourceProps } from '../../types/resource';
import { updateGearsData } from '../stores/equipmentsStore';

// Function to get maximum tier for each equipment type
function getMaxTierForType(type: string): number {
  const equipments = getEquipments();
  if (!equipments) return 10; // Default to 10 if data not found

  // Find the equipment that matches the type
  const equipment = Object.values(equipments).find(
    (item: any) => item.Category === type
  );

  return equipment?.Tier ?? 10; // Return the tier if found, otherwise default to 10
}

// Get credits required for a specific equipment tier
export function getCreditsForEquipmentTier(current: number, target: number) {
  // Credits table for equipment tiers
  const equipmentCreditsTable = dataTable.equipment_credits;
  
  // When current is 1, we need the full amount for target
  if (current === 1) {
    return equipmentCreditsTable[target-2] ?? 0;
  }
  
  // For other levels, calculate the difference
  const creditsNeeded = equipmentCreditsTable[target-2] - equipmentCreditsTable[current-2];
  return creditsNeeded || 0;
}

// Exported function to calculate equipment materials needed
export function calculateEquipmentMaterialsNeeded(
  studentEquipments: Record<string | number, any>,
  equipmentLevels: EquipmentLevels
): Material[] {
  const materialsNeeded: Material[] = [];
  if (!studentEquipments || !equipmentLevels) return materialsNeeded;

  Object.entries(equipmentLevels).forEach(([type, levels]) => {
    const { current, target } = levels;
    
    // Skip if no upgrade needed for this type
    if (current >= target) return;

    // Calculate materials for each level from current to target-1
    for (let level = current; level < target; level++) {
      // Find the equipment item for the next tier
      const nextTier = level + 1;
      const equipmentItem = studentEquipments ? 
        Object.values(studentEquipments).find(eq => 
          eq.Category === type && eq.Tier === nextTier
        ) : null;

      // Get the recipe from the equipment item
      const recipes = equipmentItem?.Recipe ?? null;

      // If no recipe data is available, skip this level
      if (!recipes) {
        console.warn(`No recipe found for ${type} tier ${nextTier}`);
        continue;
      }

      // Process each recipe item
      for (const recipe of recipes) {
        const recipeId = recipe[0];
        const quantity = recipe[1];
        
        if (!recipeId || !quantity) continue;
        
        // Convert equipment ID to material ID by removing first two digits
        const materialId = parseInt(recipeId.toString().substring(2));
        
        // Get material data from ID
        const materialData = getEquipmentDataById(materialId);
        
        // Check if this material type already exists
        const existingMaterial = materialsNeeded.find(m => 
          m.material?.Id === materialId && m.type === type
        );
        
        if (existingMaterial) {
          // Update quantity for existing material
          existingMaterial.materialQuantity += quantity;
        } else {
          // Add new material entry
          materialsNeeded.push({
            material: materialData,
            materialQuantity: quantity,
            type: 'equipments'
          });
        }
      }
    }
  });

  return materialsNeeded;
}

// Calculate credits needed for equipment upgrades
export function calculateEquipmentCreditsNeeded(
  equipmentLevels: EquipmentLevels
): Material[] {
  const materialsNeeded: Material[] = [];
  const creditsData = getResourceDataById(CREDITS_ID);
  
  Object.entries(equipmentLevels).forEach(([type, levels]) => {
    const { current, target } = levels;
    
    // Skip if no upgrade needed for this type
    if (current >= target) return;
    
    const creditsQuantity = getCreditsForEquipmentTier(current, target);
    
    // Only add if credits are needed
    if (creditsQuantity > 0) {
      materialsNeeded.push({
        material: creditsData,
        materialQuantity: creditsQuantity,
        type: 'credits'
      });
    }
  });
  
  return materialsNeeded;
}

export function calculateAllGears(
  student: Record<string | number, any>,
  equipmentLevels: EquipmentLevels
): Material[] {
  // Collect all materials
  const materials: Material[] = [];
  
  materials.push(...calculateEquipmentCreditsNeeded(equipmentLevels));
  materials.push(...calculateEquipmentMaterialsNeeded(student?.Equipments, equipmentLevels));
  if (!student?.Equipments) {
    materials.push(...calculateEquipmentMaterialsNeeded(student, equipmentLevels));
  }
  
  // Consolidate and sort materials
  return consolidateAndSortMaterials(materials);
}

export function useStudentGear(props: { 
  student: ModalProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  // Track all equipment levels in one object
  const equipmentLevels = ref<EquipmentLevels>({});

  // Reset form data
  function resetFormData() {
    // Reset equipment levels based on student's equipment
    if (props.student?.Equipment) {
      const newLevels: EquipmentLevels = {};
      props.student.Equipment.forEach(type => {
        newLevels[type] = { current: 1, target: 1 };
      });
      equipmentLevels.value = newLevels;
    }
  }

  // Watch for changes to isVisible to load data when modal opens
  watch(() => props.isVisible, (newValue) => {
    if (newValue && props.student) {
      setTimeout(() => {
        loadFromLocalStorage();
      }, 50);
    }
  }, { immediate: true });

  // Watch for changes to the student prop to reset form when student changes
  watch(() => props.student, (newValue) => {
    if (newValue) {
      resetFormData();
      if (props.isVisible) {
        loadFromLocalStorage();
      }
    }
  });

  // Watch for changes to form data and save to localStorage
  watch([equipmentLevels], () => {
    if (props.student && props.isVisible) {
      saveToLocalStorage();
      updateStudentData(props.student.Id);
    }
  }, { deep: true });

  // Save current form data to localStorage
  function saveToLocalStorage() {
    if (!props.student) return;
    
    const dataToSave = {
      equipmentLevels: equipmentLevels.value
    };

    saveFormData(props.student.Id, dataToSave);
  }

  // Load form data from localStorage
  function loadFromLocalStorage() {
    if (!props.student) return;

    // Define default values based on student's equipment
    const defaultValues = {
      equipmentLevels: props.student.Equipment.reduce((acc, type) => {
        acc[type] = { current: 1, target: 1 };
        return acc;
      }, {} as EquipmentLevels)
    };
    
    // Load data from localStorage
    loadFormDataToRefs(props.student.Id, { equipmentLevels }, defaultValues);
    
    // Ensure all student's equipment types exist in the loaded data
    const loadedLevels = equipmentLevels.value;
    const mergedLevels = { ...defaultValues.equipmentLevels };
    
    // Merge loaded data with defaults
    Object.keys(mergedLevels).forEach(type => {
      if (loadedLevels[type]) {
        mergedLevels[type] = {
          current: loadedLevels[type].current ?? 1,
          target: loadedLevels[type].target ?? 1
        };
      }
    });
    
    // Update the ref with merged data
    equipmentLevels.value = mergedLevels;
  }

  // Use the external calculation function for the computed property
  const equipmentMaterialsNeeded = computed<Material[]>(() => {
    if (!props.student) return [];
    
    const materials = calculateAllGears(
      props.student ?? undefined,
      equipmentLevels.value
    );

    const credits = materials.filter(m => m.type === 'credits')
    updateGearsData(props.student.Id, credits);
    
    return materials;
  });

  // Function to handle updates for equipment levels
  const handleEquipmentUpdate = (type: EquipmentType, current: number, target: number) => {
    const maxTier = getMaxTierForType(type);
    
    if (current >= 1 && current <= maxTier && target >= current && target <= maxTier) {
      // Update the specified equipment type
      if (equipmentLevels.value[type]) {
        equipmentLevels.value[type].current = current;
        equipmentLevels.value[type].target = target;
        
        // Explicitly trigger localStorage save
        if (props.student && props.isVisible) {
          saveToLocalStorage();
        }
      } else {
        console.error('Equipment type not found in levels:', type);
      }
    }
  };

  function closeModal() {
    saveToLocalStorage();
    emit('close');
  }

  return {
    equipmentLevels,
    equipmentMaterialsNeeded,
    closeModal,
    handleEquipmentUpdate
  };
}