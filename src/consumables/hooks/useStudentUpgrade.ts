import { ref, computed, watch } from 'vue';
import { StudentProps } from '../../types/student';
import dataTable from '../../data/data.json';
import { 
  getResourceDataById, 
  loadFormDataToRefs, 
  saveFormData 
} from '../utils/studentStorage';
import {
  PotentialType,
  PotentialMaterial,
  PotentialLevels,
  SkillType,
  SkillMaterial,
  SkillLevels,
  WORKBOOK_ID,
  SECRET_TECH_NOTE_ID
} from '../../types/upgrade';

export function useStudentUpgrade(props: {
  student: StudentProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  // State
  const currentCharacterLevel = ref(1);
  const targetCharacterLevel = ref(1);
  
  // Track all potential levels in one object
  const potentialLevels = ref<PotentialLevels>({
    attack: {
      current: 0,
      target: 0
    },
    maxhp: {
      current: 0,
      target: 0
    },
    healpower: {
      current: 0,
      target: 0
    }
  });

  const skillLevels = ref<SkillLevels>({
    Ex: {
      current: 1,
      target: 1
    },
    Public: {
      current: 1,
      target: 1
    },
    Passive: {
      current: 1,
      target: 1
    },
    ExtraPassive: {
      current: 1,
      target: 1
    }
  });
  
  const characterXpTable = dataTable.character_xp;
  const potentialMaterials = dataTable.potential;

  // Reset form data
  function resetFormData() {
    currentCharacterLevel.value = 1;
    targetCharacterLevel.value = 1;
    
    // Reset all potential levels
    potentialLevels.value = {
      attack: { current: 0, target: 0 },
      maxhp: { current: 0, target: 0 },
      healpower: { current: 0, target: 0 }
    };

    skillLevels.value = {
      Ex: { current: 1, target: 1 },
      Public: { current: 1, target: 1 },
      Passive: { current: 1, target: 1 },
      ExtraPassive: { current: 1, target: 1 }
    };
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
  watch([currentCharacterLevel, targetCharacterLevel, potentialLevels, skillLevels], () => {
    if (props.student && props.isVisible) {
      saveToLocalStorage();
    }
  }, { deep: true });

  // Save current form data to localStorage
  function saveToLocalStorage() {
    if (!props.student) return;
    
    const dataToSave = {
      currentCharacterLevel: currentCharacterLevel.value,
      targetCharacterLevel: targetCharacterLevel.value,
      potentialLevels: potentialLevels.value,
      skillLevels: skillLevels.value
    };

    saveFormData(props.student.Id, dataToSave);
  }

  // Load form data from localStorage
  function loadFromLocalStorage() {
    if (!props.student) return;

    // Define the refs and their default values
    const refs = {
      currentCharacterLevel,
      targetCharacterLevel,
      potentialLevels,
      skillLevels
    };
    
    const defaultValues = {
      currentCharacterLevel: 1,
      targetCharacterLevel: 1,
      potentialLevels: {
        attack: { current: 0, target: 0 },
        maxhp: { current: 0, target: 0 },
        healpower: { current: 0, target: 0 }
      },
      skillLevels: {
        Ex: { current: 1, target: 1 },
        Public: { current: 1, target: 1 },
        Passive: { current: 1, target: 1 },
        ExtraPassive: { current: 1, target: 1 }
      }
    };
    
    loadFormDataToRefs(props.student.Id, refs, defaultValues);
  }

  // Compute total XP needed for character level
  const totalCumulativeExp = computed(() => {
    const currentXp = characterXpTable[currentCharacterLevel.value - 1] || 0;
    const targetXp = characterXpTable[targetCharacterLevel.value - 1] || 0;
    return Math.max(0, targetXp - currentXp);
  });

  // Compute remaining XP to the next level
  const remainingXp = computed(() => {
    return totalCumulativeExp.value;
  });

  const skillMaterialsNeeded = computed<SkillMaterial[]>(() => {
    const materialsNeeded: SkillMaterial[] = [];
   
    Object.entries(skillLevels.value).forEach(([type, levels]) => {
      const { current, target } = levels;
      
      // Skip if no upgrade needed for this type
      if (current >= target) {
        return;
      }

      // Get the correct material IDs and quantities based on skill type
      let materialIds: number[][] | null = null;
      let materialQuantities: number[][] | null = null;

      // Determine which material data to use based on skill type
      if (type === 'Ex') {
        materialIds = props.student?.SkillExMaterial ?? null;
        materialQuantities = props.student?.SkillExMaterialAmount ?? null;
      } else {
        materialIds = props.student?.SkillMaterial ?? null;
        materialQuantities = props.student?.SkillMaterialAmount ?? null;
      }

      // If no material data is available, skip this skill type
      if (!materialIds || !materialQuantities) {
        return;
      }

      // Calculate materials for each level from current to target
      for (let level = current; level < target; level++) {
        // Special case: Add SECRET_TECH_NOTE for level 9 to 10 for non-Ex skills
        if (level === 9 && type !== 'Ex') {
          const secretTechData = getResourceDataById(SECRET_TECH_NOTE_ID);
          if (secretTechData) {
            materialsNeeded.push({
              material: secretTechData,
              materialQuantity: 1,
              level,
              potentialType: type as SkillType
            });
          }
        }
        
        // Get the materials for this skill level
        const levelMaterialIds = materialIds[level-1];
        const levelMaterialQuantities = materialQuantities[level-1];
        
        // Skip if there's no material data for this level
        if (!levelMaterialIds || !levelMaterialQuantities) {
          continue;
        }
        
        // Each level may need multiple materials, process each one
        for (let i = 0; i < levelMaterialIds.length; i++) {
          const materialId = levelMaterialIds[i];
          const quantity = levelMaterialQuantities[i];
          
          if (!materialId || !quantity) continue;
          
          // Get material data from ID
          const materialData = getResourceDataById(materialId);
          
          materialsNeeded.push({
            material: materialData,
            materialQuantity: quantity,
            level,
            potentialType: type as SkillType
          });
        }
      }
    });
    
    return materialsNeeded;
  });

  // Calculate materials needed for potential upgrade
  const potentialMaterialsNeeded = computed<PotentialMaterial[]>(() => {
    if (!potentialMaterials) {
      return [];
    }
    
    const materialsNeeded: PotentialMaterial[] = [];
    
    // Calculate materials for each potential type
    Object.entries(potentialLevels.value).forEach(([type, levels]) => {
      const { current, target } = levels;
      
      // Skip if no upgrade needed for this type
      if (current >= target) {
        return;
      }
      
      const startBlock = Math.floor(current / 5);
      const endBlock = Math.floor((target - 1) / 5);
      
      for (let block = startBlock; block <= endBlock; block++) {
        if (block >= potentialMaterials.length) break;
        
        const blockData = potentialMaterials[block];
        if (!blockData) continue;
        
        // Calculate levels within this block
        let levelsInBlock = 5;
        
        // Handle first block (may not need all 5 levels)
        if (block === startBlock) {
          const levelStart = current % 5;
          levelsInBlock = 5 - levelStart;
        }
        
        // Handle last block (may not need all 5 levels)
        if (block === endBlock) {
          const remainder = target % 5;
          if (remainder > 0) {
            levelsInBlock = remainder;
          }
        }
        
        // Calculate materials for this block based on how many levels we need
        let materialId: number | undefined;
        let [workbookQuantity, materialQuality, materialQuantity] = blockData;
        
        // Use different workbook IDs based on potential type
        let workbookId = WORKBOOK_ID[1]; // Default to attack (1)
        if (type === 'maxhp') workbookId = WORKBOOK_ID[0];
        if (type === 'healpower') workbookId = WORKBOOK_ID[2];
        
        if (materialQuality === 1) {
          materialId = props.student?.PotentialMaterial ?? 0;
        } else {
          materialId = (props.student?.PotentialMaterial ?? 0) + 1;
        }
 
        materialQuantity = Math.ceil(materialQuantity * levelsInBlock);
        workbookQuantity = Math.ceil(workbookQuantity * levelsInBlock);

        const materialData = getResourceDataById(materialId);
        const workbookData = getResourceDataById(workbookId);

        materialsNeeded.push({
          material: materialData,
          workbook: workbookData,
          workbookQuantity,
          materialQuantity,
          levelsInBlock,
          blockStart: block * 5,
          blockEnd: block * 5 + levelsInBlock,
          potentialType: type as PotentialType
        });
      }
    });
    
    return materialsNeeded;
  });

  const removeLeadingZeros = (event: Event) => {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/^0+(?=\d)/, '');
  };

  const handleCharacterLevelInput = (event: Event) => {
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    if (!isNaN(value) && value >= 1 && value <= 90) {
      currentCharacterLevel.value = value;
    }
  };

  const handleTargetCharacterLevelInput = (event: Event) => {
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    if (!isNaN(value) && value >= 1 && value <= 90) {
      targetCharacterLevel.value = value;
    }
  };

  const handleCurrentPotentialInput = (value: number) => {
    if (value >= 0 && value <= 25) {
      potentialLevels.value.attack.current = value;
      
      // Ensure target is always >= current
      if (potentialLevels.value.attack.target < value) {
        potentialLevels.value.attack.target = value;
      }
    }
  };

  const handleTargetPotentialInput = (value: number) => {
    if (value >= 0 && value <= 25) {
      potentialLevels.value.attack.target = value;
      
      // Ensure current is always <= target
      if (potentialLevels.value.attack.current > value) {
        potentialLevels.value.attack.current = value;
      }
    }
  };
  
  // Function to handle updates from all potential types
  const handlePotentialUpdate = (type: PotentialType, current: number, target: number) => {
    if (current >= 0 && current <= 25 && target >= 0 && target <= 25) {
      // Update the specified potential type
      potentialLevels.value[type].current = current;
      potentialLevels.value[type].target = target;
      
      // Ensure current <= target
      if (potentialLevels.value[type].current > potentialLevels.value[type].target) {
        potentialLevels.value[type].target = potentialLevels.value[type].current;
      }
    }
  };

  // Function to handle updates for skill levels
  const handleSkillUpdate = (type: SkillType, current: number, target: number) => {
    if (current >= 1 && target >= current) {
      // Update the specified skill type
      if (skillLevels.value[type]) {
        skillLevels.value[type].current = current;
        skillLevels.value[type].target = target;
        
        // Explicitly trigger localStorage save
        if (props.student && props.isVisible) {
          saveToLocalStorage();
        }
      }
    }
  };

  function closeModal() {
    // Save the current state before closing
    saveToLocalStorage();
    emit('close');
  }

  return {
    // State
    currentCharacterLevel,
    targetCharacterLevel,
    currentPotentialLevel: computed(() => potentialLevels.value.attack.current),
    targetPotentialLevel: computed(() => potentialLevels.value.attack.target),
    potentialLevels,
    skillLevels,
    potentialMaterials,
    
    // Computed
    totalCumulativeExp,
    remainingXp,
    potentialMaterialsNeeded,
    skillMaterialsNeeded,

    // Methods
    closeModal,
    resetFormData,
    saveToLocalStorage,
    loadFromLocalStorage,
    handleCharacterLevelInput,
    handleTargetCharacterLevelInput,
    handleCurrentPotentialInput,
    handleTargetPotentialInput,
    handlePotentialUpdate,
    handleSkillUpdate
  };
}