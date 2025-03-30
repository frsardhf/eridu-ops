import { ref, computed, watch } from 'vue';
import { StudentProps } from '../../types/student';
import dataTable from '../../data/data.json';
import { getResourceDataById, loadFormDataToRefs, saveFormData } from '../utils/studentStorage';

// Define potential types
type PotentialType = 'attack' | 'maxhp' | 'healpower';

interface PotentialMaterial {
  material: Record<string, any> | null;
  workbook: Record<string, any> | null;
  workbookQuantity: number;
  materialQuantity: number;
  levelsInBlock: number;
  blockStart: number;
  blockEnd: number;
  potentialType: PotentialType;
}

// Track all potential levels in one object
interface PotentialLevels {
  attack: {
    current: number;
    target: number;
  };
  maxhp: {
    current: number;
    target: number;
  };
  healpower: {
    current: number;
    target: number;
  };
}

const WORKBOOK_ID = [2000, 2001, 2002];

export function useStudentUpgrade(props: {
  student: StudentProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  // State
  const currentCharacterLevel = ref(1);
  const targetCharacterLevel = ref(1);
  const currentPotentialLevel = ref(0);
  const targetPotentialLevel = ref(0);
  
  // New state for all potential types
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
  
  const characterXpTable = dataTable.character_xp;
  const potentialMaterials = dataTable.potential;

  // Reset form data
  function resetFormData() {
    currentCharacterLevel.value = 1;
    targetCharacterLevel.value = 1;
    currentPotentialLevel.value = 0;
    targetPotentialLevel.value = 0;
    
    // Reset all potential levels
    potentialLevels.value = {
      attack: { current: 0, target: 0 },
      maxhp: { current: 0, target: 0 },
      healpower: { current: 0, target: 0 }
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
  watch([currentCharacterLevel, targetCharacterLevel, currentPotentialLevel, targetPotentialLevel, potentialLevels], () => {
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
      currentPotentialLevel: currentPotentialLevel.value,
      targetPotentialLevel: targetPotentialLevel.value,
      potentialLevels: potentialLevels.value
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
      currentPotentialLevel,
      targetPotentialLevel,
      potentialLevels
    };
    
    const defaultValues = {
      currentCharacterLevel: 1,
      targetCharacterLevel: 1,
      currentPotentialLevel: 0,
      targetPotentialLevel: 0,
      potentialLevels: {
        attack: { current: 0, target: 0 },
        maxhp: { current: 0, target: 0 },
        healpower: { current: 0, target: 0 }
      }
    };
    
    loadFormDataToRefs(props.student.Id, refs, defaultValues);
    
    // Make sure attack potential stays in sync with the main values
    potentialLevels.value.attack.current = currentPotentialLevel.value;
    potentialLevels.value.attack.target = targetPotentialLevel.value;
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

  // Calculate materials needed for potential upgrade
  // Modify potentialMaterialsNeeded to calculate materials for all potential types
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
        let [workbookQuantity, materialQuality, materialQuantity, materialPerLevel] = blockData;
        
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
          workbook: workbookData, // Add the workbook data
          workbookQuantity,
          materialQuantity,
          levelsInBlock,
          blockStart: block * 5,
          blockEnd: block * 5 + levelsInBlock,
          potentialType: type as PotentialType // Add potential type to the materials
        });
      }
    });
    
    return materialsNeeded;
  });

  function getFontSizeClass(name: string) {
    return name.length <= 15 ? 'text-xl' : 'text-normal';
  }

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
      currentPotentialLevel.value = value;
      // Sync with attack potential
      potentialLevels.value.attack.current = value;
      // Ensure target is always >= current
      if (targetPotentialLevel.value < value) {
        targetPotentialLevel.value = value;
        potentialLevels.value.attack.target = value;
      }
    }
  };

  const handleTargetPotentialInput = (value: number) => {
    if (value >= 0 && value <= 25) {
      targetPotentialLevel.value = value;
      // Sync with attack potential
      potentialLevels.value.attack.target = value;
      // Ensure current is always <= target
      if (currentPotentialLevel.value > value) {
        currentPotentialLevel.value = value;
        potentialLevels.value.attack.current = value;
      }
    }
  };
  
  // New function to handle updates from all potential types
  const handlePotentialUpdate = (type: PotentialType, current: number, target: number) => {
    if (current >= 0 && current <= 25 && target >= 0 && target <= 25) {
      // Update the specified potential type
      potentialLevels.value[type].current = current;
      potentialLevels.value[type].target = target;
      
      // For attack type, also update the main values that other components might use
      if (type === 'attack') {
        currentPotentialLevel.value = current;
        targetPotentialLevel.value = target;
      }
      
      // Ensure current <= target
      if (potentialLevels.value[type].current > potentialLevels.value[type].target) {
        potentialLevels.value[type].target = potentialLevels.value[type].current;
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
    currentPotentialLevel,
    targetPotentialLevel,
    potentialLevels,
    potentialMaterials,
    
    // Computed
    totalCumulativeExp,
    remainingXp,
    potentialMaterialsNeeded,
    
    // Methods
    closeModal,
    resetFormData,
    saveToLocalStorage,
    loadFromLocalStorage,
    getFontSizeClass,
    handleCharacterLevelInput,
    handleTargetCharacterLevelInput,
    handleCurrentPotentialInput,
    handleTargetPotentialInput,
    handlePotentialUpdate
  };
}