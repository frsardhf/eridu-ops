  import { ref, computed, watch } from 'vue';
  import { ModalProps } from '../../types/student';
  import dataTable from '../../data/data.json';
  import { 
    loadFormDataToRefs, 
    saveFormData, 
    getEquipments,
    getResourceDataById,
    getEquipmentDataById
  } from '../utils/studentStorage';
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
  import { updateStudentData } from '../stores/studentStore';
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

  // Calculate credits needed for equipment upgrades
  export function calculateGradeCreditsNeeded(
    gradeLevels: GradeLevels
  ): Material[] {
    const materialsNeeded: Material[] = [];
    const creditsData = getResourceDataById(CREDITS_ID);
    
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
    const eligmasData = getResourceDataById(ELIGMAS_ID);
    
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

  export function calculateAllGears(
    student: Record<string | number, any>,
    equipmentLevels: EquipmentLevels,
    gradeLevels: GradeLevels,
    gradeInfos: GradeInfos
  ): Material[] {
    // Collect all materials
    const materials: Material[] = [];
    
    materials.push(...calculateGradeCreditsNeeded(gradeLevels));
    materials.push(...calculateGradeMaterialsNeeded(gradeLevels, gradeInfos));
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
    const gradeLevels = ref<GradeLevels>({});
    const gradeInfos = ref<GradeInfos>({});

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

      const starGrade = props.student?.StarGrade ?? 1;
      gradeLevels.value = { current: starGrade, target: starGrade };
      gradeInfos.value = { owned: 0, price: 1, purchasable: 20};
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
    watch([equipmentLevels, gradeLevels, gradeInfos], () => {
      if (props.student && props.isVisible) {
        saveToLocalStorage();
        updateStudentData(props.student.Id);
      }
    }, { deep: true });

    // Save current form data to localStorage
    function saveToLocalStorage() {
      if (!props.student) return;
      
      const dataToSave = {
        equipmentLevels: equipmentLevels.value,
        gradeLevels: gradeLevels.value,
        gradeInfos: gradeInfos.value
      };

      saveFormData(props.student.Id, dataToSave);
    }

    // Load form data from localStorage
    function loadFromLocalStorage() {
      if (!props.student) return;

      const refs = {
        equipmentLevels,
        gradeLevels,
        gradeInfos
      }

      const defaultEquipmentLevels = props.student.Equipment.reduce((acc, type) => {
        acc[type] = { current: 1, target: 1 };
        return acc;
      }, {} as EquipmentLevels);

      const starGrade = props.student?.StarGrade ?? 1;

      const defaultValues = {
        equipmentLevels: defaultEquipmentLevels,
        gradeLevels: { current: starGrade, target: starGrade },
        gradeInfos: { owned: 0, price: 1, purchasable: 20}
      };

      const success = loadFormDataToRefs(props.student.Id, refs, defaultValues);

      if (!success || Object.keys(equipmentLevels.value).length === 0) {
        equipmentLevels.value = defaultEquipmentLevels;
        gradeLevels.value = defaultValues.gradeLevels;
        gradeInfos.value = defaultValues.gradeInfos;
        
        saveToLocalStorage();
      }
      
      if (props.student) {
        updateStudentData(props.student.Id);
      }
    }

    // Use the external calculation function for the computed property
    const equipmentMaterialsNeeded = computed<Material[]>(() => {
      if (!props.student) return [];
      
      const materials = calculateAllGears(
        props.student ?? undefined,
        equipmentLevels.value,
        gradeLevels.value,
        gradeInfos.value
      );

      updateGearsData(props.student.Id, materials);
      
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
          
          if (props.student && props.isVisible) {
            saveToLocalStorage();
            updateStudentData(props.student.Id);
          }
        } else {
          console.error('Equipment type not found in levels:', type);
        }
      }
    };

    // Function to handle updates for equipment levels
    const handleGradeUpdate = (current: number, target: number) => {
      if (current >= 1 && current <= 8 && target >= current && target <= 8) {
        // Update the specified equipment type
        if (gradeLevels.value) {
          gradeLevels.value.current = current;
          gradeLevels.value.target = target;
          
          if (props.student && props.isVisible) {
            saveToLocalStorage();
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
          saveToLocalStorage();
          updateStudentData(props.student.Id);
        }
      }
    };

    function closeModal() {
      saveToLocalStorage();
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
      calculateGradeMaterialsNeeded
    };
  }