import { ref, computed, watch } from 'vue';
import { StudentProps } from '../types/student';
import xpData from '../data/data.json';

export function useStudentModalUpgrade(props: {
  student: StudentProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  // State
  // const giftFormData = ref<Record<string, number>>({});
  // const boxFormData = ref<Record<string, number>>({});
  const currentCharacterLevel = ref(1);
  const targetCharacterLevel = ref(1);
  const currentLimitBreakLevel = ref<Record<string, number>>({});
  const characterXpTable = xpData.character_xp;

  // Reset form data
  function resetFormData() {
    currentCharacterLevel.value = 1;
    targetCharacterLevel.value = 1;
    currentLimitBreakLevel.value = {};
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
  watch([currentCharacterLevel, targetCharacterLevel, currentLimitBreakLevel], () => {
    if (props.student && props.isVisible) {
      saveToLocalStorage();
    }
  }, { deep: true });

  // Save current form data to localStorage
  function saveToLocalStorage() {
    if (!props.student) return;
    
    const storageKey = `student-${props.student.Id}-data`;

    let existingData = localStorage.getItem(storageKey);
    let parsedData: Record<string, any> = existingData ? JSON.parse(existingData) : {};

    const dataToSave = {
      ...parsedData,
      currentCharacterLevel: currentCharacterLevel.value,
      currentLimitBreakLevel: currentLimitBreakLevel.value,
      targetCharacterLevel: targetCharacterLevel.value,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  // Load form data from localStorage
  function loadFromLocalStorage() {
    if (!props.student) return;
    
    const storageKey = `student-${props.student.Id}-data`;
    try {
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Apply saved data
        // giftFormData.value = parsedData.giftFormData || {};
        // boxFormData.value = parsedData.boxFormData || {};
        currentCharacterLevel.value = parsedData.currentCharacterLevel || 1;
        targetCharacterLevel.value = parsedData.targetCharacterLevel || 1;
        currentLimitBreakLevel.value = parsedData.currentLimitBreakLevel || {};
      }
    } catch (error) {
      resetFormData();
    }
  }

  // Compute total XP needed
  const totalCumulativeExp = computed(() => {
    const currentXp = characterXpTable[currentCharacterLevel.value - 1] || 0;
    const targetXp = characterXpTable[targetCharacterLevel.value - 1] || 0;
    return Math.max(0, targetXp - currentXp);
  });

  // Compute remaining XP to the next level
  const remainingXp = computed(() => {
    return totalCumulativeExp.value;
  });

  // // Calculate individual item EXP
  // const calculateItemExp = (item: { exp: number }, quantity: number) => 
  //   isNaN(quantity) || quantity <= 0 ? 0 : item.exp * quantity;

  // // Generic function to calculate EXP from gifts or boxes
  // const calculateExpFromItems = (
  //   items: Record<string, any> | undefined,
  //   formData: Record<string, number>
  // ) => {
  //   if (!items) return 0;

  //   return Object.entries(formData).reduce((total, [id, quantity]) => {
  //     const parsedQuantity = Number(quantity);
  //     return total + calculateItemExp(items[id], parsedQuantity);
  //   }, 0);
  // };

  // // Compute total cumulative EXP across from owned resources
  // const calculateCumulativeExp = () => {
  //   // calculateExpFromItems(props.student?.Materials, currentResources.value);
  //   // TODO: Add calculation for owned resources, will implement get resources from local storage
  //   return characterXpTable[-1];
  // };

  // const totalCumulativeExp = computed(calculateCumulativeExp);

  // // Compute new character level based on current level and target level
  // const newCharacterLevel = computed(() => {
  //   const currentXp = characterXpTable[currentCharacterLevel.value - 1] || 0;
  //   const targetXp = characterXpTable[targetCharacterLevel.value - 1] || 0;

  //   // Find the highest character level where required XP is <= newXp
  //   let newLevel = currentCharacterLevel.value;
  //   while (newLevel < characterXpTable.length && characterXpTable[newLevel - 1] <= targetXp) {
  //     newLevel++;
  //   }

  //   return Math.min(newLevel, 90); // Cap at level 90
  // });

  // // Compute remaining XP to the next level
  // const remainingXp = computed(() => {
  //   if (newCharacterLevel.value >= 100) return 0;

  //   const currentXp = characterXpTable[currentCharacterLevel.value - 1] || 0;
  //   const targetXp = characterXpTable[newCharacterLevel.value - 1] || 0;
  //   const xpNeeded = targetXp - currentXp;

  //   return Math.max(0, xpNeeded);
  // });

  function getFontSizeClass(name: string) {
    return name.length <= 15 ? 'text-xl' : 'text-normal';
  }

  const removeLeadingZeros = (event: Event) => {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/^0+(?=\d)/, '');
  };

  const handleLimitBreakInput = (id: number, event: Event) => {
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    currentLimitBreakLevel.value[id] = parseInt(input.value) || 0;
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

  function closeModal() {
    // Save the current state (including conversion state) before closing
    saveToLocalStorage();
    emit('close');
  }

  return {
    // State
    // giftFormData,
    // boxFormData,
    currentCharacterLevel,
    targetCharacterLevel,
    currentLimitBreakLevel,
    
    // Computed
    totalCumulativeExp,
    // newCharacterLevel,
    remainingXp,
    
    // Methods
    closeModal,
    resetFormData,
    saveToLocalStorage,
    loadFromLocalStorage,
    getFontSizeClass,
    handleLimitBreakInput,
    // handleBoxInput,
    handleCharacterLevelInput,
    handleTargetCharacterLevelInput,
  };
}