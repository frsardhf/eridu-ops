import { ref, computed, watch, watchEffect } from 'vue';
import { ModalProps, StudentProps } from '../../types/student';
import dataTable from '../../data/data.json';
import {
  loadFormDataToRefs,
  saveFormData,
  getEquipments
} from '../utils/studentStorage';
import { getResourceDataByIdSync, getEquipmentDataByIdSync, getAllEquipmentFromCache } from '../stores/resourceCacheStore';
import { 
  EquipmentLevels, 
  EquipmentType, 
  GradeInfos, 
  GradeLevels
} from '../../types/gear';
import {
  CREDITS_ID,
  ELIGMAS_ID,
  Material,
} from '../../types/upgrade';
import { consolidateAndSortMaterials } from '../utils/materialUtils';
import { updateStudentData, setStudentDataDirect, studentDataStore } from '../stores/studentStore';
import { updateGearsData } from '../stores/equipmentsStore';
import type { ExclusiveGearLevel } from '../../types/gear';

// Function to get maximum tier for each equipment type
async function getMaxTierForType(type: string): Promise<number> {
  const equipments = await getEquipments();
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

// Get credits required for a specific grade tier
export function getCreditsForGrade(current: number, target: number) {
  // Credits table for grade tiers
  const gradeCreditsTable = dataTable.grade_credits;
  
  // When current is 1, we need the full amount for target
  if (current === 1) {
    return gradeCreditsTable[target-2] ?? 0;
  }
  
  // For other levels, calculate the difference
  const creditsNeeded = gradeCreditsTable[target-2] - gradeCreditsTable[current-2];
  return creditsNeeded || 0;
}

// Get elephs required for a specific grade tier
export function getElephsForGrade(current: number, target: number, owned: number) {
  // Elephs table for grade tiers
  const gradeElephsTable = dataTable.grade_elephs;
  
  // When current is 1, we need the full amount for target
  if (current === 1) {
    return gradeElephsTable[target-2] ?? 0;
  }
  
  // For other levels, calculate the difference
  const elephsNeeded = gradeElephsTable[target-2] - gradeElephsTable[current-2];
  return elephsNeeded - owned || 0;
}

// Get elephs required for a specific grade tier
export function getEligmasForGrade(needed: number, price: number = 1, purchasable: number = 20) {
  // When current is 1, we need the full amount for target
  let totalEligma = 0
  let remainingElephs = needed
  while (price <= 5) {
    remainingElephs -= purchasable;
    totalEligma += price * purchasable;
    if (remainingElephs <= 0) {
      // Adjust totalEligma for the last batch if we went over
      if (remainingElephs < 0) {
        totalEligma += remainingElephs * price;
      }
      break;
    }
    price++
  }
  if (remainingElephs > 0) totalEligma += 5 * remainingElephs
  
  // For other levels, calculate the difference
  return totalEligma || 0;
}

// Exported function to calculate equipment materials needed
export function calculateEquipmentMaterialsNeeded(
  student: StudentProps | null,
  equipmentLevels: EquipmentLevels
): Material[] {
  const materialsNeeded: Material[] = [];
  
  if (!student?.Id || !equipmentLevels) return materialsNeeded;

  // Get all equipment data from cache
  const allEquipment = getAllEquipmentFromCache();

  Object.entries(equipmentLevels).forEach(([type, levels]) => {
    const { current, target } = levels;

    // Skip if no upgrade needed for this type
    if (current >= target) return;

    // Calculate materials for each level from current to target-1
    for (let level = current; level < target; level++) {
      // Find the equipment item for the next tier from the cache
      const nextTier = level + 1;
      const equipmentItem = Object.values(allEquipment).find(eq =>
        eq.Category === type && eq.Tier === nextTier
      );

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
        const materialData = getEquipmentDataByIdSync(materialId);

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
  const creditsData = getResourceDataByIdSync(CREDITS_ID);
  
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

// Calculate credits needed for equipment upgrades
export function calculateGradeCreditsNeeded(
  gradeLevels: GradeLevels
): Material[] {
  const materialsNeeded: Material[] = [];
  const creditsData = getResourceDataByIdSync(CREDITS_ID);
  
  const current = gradeLevels.current ?? 1;
  const target = gradeLevels.target ?? 1;
    
  // Skip if no upgrade needed for grade
  if (current >= target) return materialsNeeded;
  
  const creditsQuantity = getCreditsForGrade(current, target);
  
  // Only add if credits are needed
  if (creditsQuantity > 0) {
    materialsNeeded.push({
      material: creditsData,
      materialQuantity: creditsQuantity,
      type: 'credits'
    });
  }
  
  return materialsNeeded;
}

// Calculate eligmas needed for equipment upgrades
export function calculateGradeMaterialsNeeded(
  gradeLevels: GradeLevels,
  gradeInfos: GradeInfos
): Material[] {
  const materialsNeeded: Material[] = [];
  const eligmasData = getResourceDataByIdSync(ELIGMAS_ID);
  
  const current = gradeLevels.current ?? 1;
  const target = gradeLevels.target ?? 1;
  const owned = gradeInfos.owned ?? 0;
  const price = gradeInfos.price ?? 1;
  const purchasable = gradeInfos.purchasable ?? 20;
    
  // Skip if no upgrade needed for grade
  if (current >= target) return materialsNeeded;
  
  const elephsNeeded = getElephsForGrade(current, target, owned);
  const eligmasQuantity = getEligmasForGrade(elephsNeeded, price, purchasable);
  
  // Only add if eligmas are needed
  if (eligmasQuantity > 0) {
    materialsNeeded.push({
      material: eligmasData,
      materialQuantity: eligmasQuantity,
      type: 'materials'
    });
  }
  
  return materialsNeeded;
}

// Calculate materials needed for exclusive gear upgrade (T1→T2)
export function calculateExclusiveGearMaterials(
  student: StudentProps | null,
  exclusiveGearLevel: ExclusiveGearLevel | null | undefined
): Material[] {
  const materialsNeeded: Material[] = [];

  // Guard against undefined/null exclusiveGearLevel
  if (!exclusiveGearLevel) {
    return materialsNeeded;
  }

  // Check if student has gear data and upgrade is needed
  if (!student?.Gear || Object.keys(student.Gear).length === 0) {
    return materialsNeeded;
  }

  const current = exclusiveGearLevel.current ?? 0;
  const target = exclusiveGearLevel.target ?? 0;

  if (current >= target) {
    return materialsNeeded;
  }

  // Only T1→T2 upgrade costs materials (T0→T1 is free, just needs bond)
  // TierUpMaterial/TierUpMaterialAmount are nested arrays: [[tier1 materials], [tier2 materials], ...]
  // Index 0 = T1→T2 upgrade materials
  if (current < 2 && target >= 2) {
    const gearData = student.Gear as any;
    const tierUpMaterials = gearData.TierUpMaterial?.[0] || []; // First array = T1→T2 materials
    const tierUpAmounts = gearData.TierUpMaterialAmount?.[0] || []; // First array = T1→T2 amounts

    // Add the upgrade materials (typically 3: 1 gift + 2 items)
    tierUpMaterials.forEach((materialId: number, index: number) => {
      const materialData = getResourceDataByIdSync(materialId);
      if (materialData && tierUpAmounts[index]) {
        materialsNeeded.push({
          material: materialData,
          materialQuantity: tierUpAmounts[index],
          type: 'materials'
        });
      }
    });

    // Add 500k credits for T1→T2 upgrade
    const creditsData = getResourceDataByIdSync(CREDITS_ID);
    if (creditsData) {
      materialsNeeded.push({
        material: creditsData,
        materialQuantity: 500000,
        type: 'credits'
      });
    }
  }

  return materialsNeeded;
}

export function calculateAllGears(
  student: StudentProps | null,
  equipmentLevels: EquipmentLevels,
  gradeLevels: GradeLevels,
  gradeInfos: GradeInfos,
  exclusiveGearLevel: ExclusiveGearLevel
): Material[] {
  // Collect all materials
  const materials: Material[] = [];

  materials.push(...calculateGradeCreditsNeeded(gradeLevels));
  materials.push(...calculateGradeMaterialsNeeded(gradeLevels, gradeInfos));
  materials.push(...calculateEquipmentCreditsNeeded(equipmentLevels));
  materials.push(...calculateEquipmentMaterialsNeeded(student, equipmentLevels));
  materials.push(...calculateExclusiveGearMaterials(student, exclusiveGearLevel));

  // Consolidate and sort materials
  return consolidateAndSortMaterials(materials);
}

export function useStudentGear(props: {
  student: ModalProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  // Track pending save to deduplicate concurrent saves
  let pendingSave: Promise<void> | null = null;
  // Track loading state to prevent watch from triggering saves during load
  const isLoading = ref(false);

  // Track all equipment levels in one object
  const equipmentLevels = ref<EquipmentLevels>({});
  const gradeLevels = ref<GradeLevels>({});
  const gradeInfos = ref<GradeInfos>({});
  const exclusiveGearLevel = ref<ExclusiveGearLevel>({});

  // Max gear states
  const allGearsMaxed = ref(false);
  const targetGearsMaxed = ref(false);

  // Exclusive gear computed properties
  const hasExclusiveGear = computed(() => {
    return !!(props.student?.Gear && Object.keys(props.student.Gear).length > 0);
  });

  const currentBond = computed(() => {
    if (!props.student?.Id) return 0;
    const form = studentDataStore.value[props.student.Id];
    return form?.bondDetailData?.currentBond ?? 0;
  });

  const canUnlockT1 = computed(() => currentBond.value > 15);
  const canUnlockT2 = computed(() => currentBond.value > 20);

  const maxUnlockableGearTier = computed(() => {
    if (!hasExclusiveGear.value) return 0;
    if (canUnlockT2.value) return 2;
    if (canUnlockT1.value) return 1;
    return 0;
  });

  // Synchronous version of getMaxTierForType using cached data
  function getMaxTierForTypeSync(type: string): number {
    const equipments = getAllEquipmentFromCache();
    if (!equipments || Object.keys(equipments).length === 0) return 10;

    const matchingEquipments = Object.values(equipments)
      .filter((item: any) => item.Category === type)
      .sort((a: any, b: any) => b.Id - a.Id);

    const highestTierEquipment = matchingEquipments[0];
    return highestTierEquipment?.Tier || 10;
  }

  const checkAllGearsMaxed = () => {
    if (!props.student?.Equipment) return false;
    return props.student.Equipment.every((type) => {
      const maxTier = getMaxTierForTypeSync(type);
      const levels = equipmentLevels.value[type as EquipmentType];
      return levels?.current === maxTier && levels?.target === maxTier;
    });
  };

  const checkTargetGearsMaxed = () => {
    if (!props.student?.Equipment) return false;
    return props.student.Equipment.every((type) => {
      const maxTier = getMaxTierForTypeSync(type);
      const levels = equipmentLevels.value[type as EquipmentType];
      return levels?.target === maxTier;
    });
  };

  const toggleMaxAllGears = (checked: boolean) => {
    if (!props.student?.Equipment) return;

    props.student.Equipment.forEach((type) => {
      const equipmentType = type as EquipmentType;
      const maxTier = getMaxTierForTypeSync(type);

      if (checked) {
        equipmentLevels.value[equipmentType] = { current: maxTier, target: maxTier };
      } else {
        equipmentLevels.value[equipmentType] = { current: 1, target: 1 };
      }
    });

    allGearsMaxed.value = checked;
    targetGearsMaxed.value = checked;

    saveToIndexedDB();
    if (props.student) {
      updateStudentData(props.student.Id);
    }
  };

  const toggleMaxTargetGears = (checked: boolean) => {
    if (!props.student?.Equipment) return;

    props.student.Equipment.forEach((type) => {
      const equipmentType = type as EquipmentType;
      const maxTier = getMaxTierForTypeSync(type);
      const currentLevel = equipmentLevels.value[equipmentType]?.current || 1;

      if (checked) {
        equipmentLevels.value[equipmentType] = { current: currentLevel, target: maxTier };
      } else {
        equipmentLevels.value[equipmentType] = { current: currentLevel, target: currentLevel };
      }
    });

    targetGearsMaxed.value = checked;
    allGearsMaxed.value = checkAllGearsMaxed();

    saveToIndexedDB();
    if (props.student) {
      updateStudentData(props.student.Id);
    }
  };

  // Reset form data
  function resetFormData() {
    // Reset equipment levels based on student's equipment
    if (props.student?.Equipment) {
      const newLevels: EquipmentLevels = {};
      props.student.Equipment.forEach(type => {
        newLevels[type as EquipmentType] = { current: 1, target: 1 };
      });
      equipmentLevels.value = newLevels;
    } 

    const starGrade = props.student?.StarGrade ?? 1;
    gradeLevels.value = { current: starGrade, target: starGrade };
    gradeInfos.value = { owned: 0, price: 1, purchasable: 20 };
    exclusiveGearLevel.value = { current: 0, target: 0 };
  }

  // Watch for changes to isVisible to load data when modal opens
  watch(() => props.isVisible, (newValue) => {
    if (newValue && props.student) {
      setTimeout(() => {
        loadFromIndexedDB();
      }, 50);
    }
  }, { immediate: true });

  // Watch for changes to the student prop to reset form when student changes
  watch(() => props.student, (newValue) => {
    if (newValue) {
      resetFormData();
      if (props.isVisible) {
        loadFromIndexedDB();
      }
    }
  });

  // Watch for changes to form data and save to IndexedDB
  watch([equipmentLevels, gradeLevels, gradeInfos, exclusiveGearLevel], async () => {
    if (props.student && props.isVisible && !isLoading.value) {
      await saveToIndexedDB();
      updateStudentData(props.student.Id);
    }
  }, { deep: true });

  // Watch for equipment level changes to update maxed flags
  watch(equipmentLevels, () => {
    allGearsMaxed.value = checkAllGearsMaxed();
    targetGearsMaxed.value = checkTargetGearsMaxed();
  }, { deep: true });

  // Save current form data to IndexedDB
  async function saveToIndexedDB() {
    if (!props.student) return;

    // Wait for any pending save to complete
    if (pendingSave) {
      await pendingSave;
    }

    // Mark this as the current pending save
    const currentSave = (async () => {
      const dataToSave = {
        equipmentLevels: { ...equipmentLevels.value },
        gradeLevels: { ...gradeLevels.value },
        gradeInfos: { ...gradeInfos.value },
        exclusiveGearLevel: { ...exclusiveGearLevel.value }
      };

      const savedData = await saveFormData(props.student!.Id, dataToSave);
      if (savedData) {
        // Update store immediately with sanitized data for reactive overlay updates
        setStudentDataDirect(props.student!.Id, savedData);
      }
    })();

    pendingSave = currentSave;
    await currentSave;
    pendingSave = null;
  }

  // Load form data from IndexedDB
  async function loadFromIndexedDB() {
    if (!props.student) return;

    isLoading.value = true;

    try {
      const refs = {
        equipmentLevels,
        gradeLevels,
        gradeInfos,
        exclusiveGearLevel
      };

      const defaultEquipmentLevels = props.student.Equipment.reduce((acc, type) => {
        acc[type as EquipmentType] = { current: 1, target: 1 };
        return acc;
      }, {} as EquipmentLevels);

      const starGrade = props.student?.StarGrade ?? 1;

      const defaultValues = {
        equipmentLevels: defaultEquipmentLevels,
        gradeLevels: { current: starGrade, target: starGrade },
        gradeInfos: { owned: 0, price: 1, purchasable: 20 },
        exclusiveGearLevel: { current: 0, target: 0 }
      };

      // Load data - defaults are initialized by StudentModal before composables load
      // No need to save here; initializeStudentFormData handles atomic default creation
      await loadFormDataToRefs(props.student.Id, refs, defaultValues);

      if (props.student) {
        await updateStudentData(props.student.Id);
      }
    } finally {
      isLoading.value = false;
    }
  }

  // Create a computed property for all equipment materials needed for this student
  // NOTE: This computed is now pure - side effects are handled in a separate watcher below
  const equipmentMaterialsNeeded = computed<Material[]>(() => {
    if (!props.student) return [];

    return calculateAllGears(
      props.student,
      equipmentLevels.value,
      gradeLevels.value,
      gradeInfos.value,
      exclusiveGearLevel.value
    );
  });

  // Update gears store when materials change (side effects belong in watchers, not computed)
  // Always update even when empty to clear stale cached data
  watch(equipmentMaterialsNeeded, (materials) => {
    if (props.student) {
      updateGearsData(props.student.Id, materials);
    }
  }, { immediate: true });

  // Function to handle updates for equipment levels
  const handleEquipmentUpdate = async (type: EquipmentType, current: number, target: number) => {
    const maxTier = await getMaxTierForType(type);

    if (current >= 1 && current <= maxTier && target >= current && target <= maxTier) {
      // Update the specified equipment type
      if (equipmentLevels.value[type]) {
        equipmentLevels.value[type].current = current;
        equipmentLevels.value[type].target = target;

        if (props.student && props.isVisible) {
          updateStudentData(props.student.Id);
        }
      } else {
        console.error('Equipment type not found in levels:', type);
      }
    }
  };

  // Function to handle updates for equipment levels
  const handleGradeUpdate = (current: number, target: number) => {
    if (current >= 1 && current <= 9 && target >= current && target <= 9) {
      // Update the specified equipment type
      if (gradeLevels.value) {
        gradeLevels.value.current = current;
        gradeLevels.value.target = target;

        if (props.student && props.isVisible) {
          updateStudentData(props.student.Id);
        }
      }
    }
  };

  // Function to handle updates for equipment levels
  const handleGradeInfoUpdate = (owned: number, price: number, purchasable: number) => {
    // Update the specified equipment type
    if (gradeInfos.value) {
      gradeInfos.value.owned = owned;
      gradeInfos.value.price = price;
      gradeInfos.value.purchasable = purchasable;

      if (props.student && props.isVisible) {
        updateStudentData(props.student.Id);
      }
    }
  };

  // Function to handle updates for exclusive gear level
  const handleExclusiveGearUpdate = (current: number, target: number) => {
    const maxTier = maxUnlockableGearTier.value;

    // Clamp current to valid range (0 to maxUnlockable)
    current = Math.min(Math.max(0, current), maxTier);
    // Clamp target to valid range (current to 2)
    target = Math.min(Math.max(current, target), 2);

    exclusiveGearLevel.value = { current, target };

    if (props.student && props.isVisible) {
      saveToIndexedDB();
      updateStudentData(props.student.Id);
    }
  };

  function closeModal() {
    saveToIndexedDB();
    emit('close');
  }

  return {
    equipmentLevels,
    gradeLevels,
    gradeInfos,
    equipmentMaterialsNeeded,
    closeModal,
    handleEquipmentUpdate,
    handleGradeUpdate,
    handleGradeInfoUpdate,
    getElephsForGrade,
    getEligmasForGrade,
    calculateGradeMaterialsNeeded,
    allGearsMaxed,
    targetGearsMaxed,
    toggleMaxAllGears,
    toggleMaxTargetGears,
    // Exclusive gear
    exclusiveGearLevel,
    hasExclusiveGear,
    maxUnlockableGearTier,
    handleExclusiveGearUpdate
  };
}