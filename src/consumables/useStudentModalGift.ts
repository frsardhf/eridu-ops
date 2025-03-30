import { ref, computed, watch } from 'vue';
import { StudentProps } from '../types/student';
import { GiftDataProps } from '../types/gift';
import bondData from '../../src/data/data.json';

export function useStudentModalGift(props: {
  student: StudentProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  // State
  const giftFormData = ref<Record<string, number>>({});
  const boxFormData = ref<Record<string, number>>({});
  const currentBond = ref(1);
  const convertBox = ref(false);
  const originalYellowStoneQuantity = ref(0);
  const originalSrGiftQuantity = ref(0);
  const originalSelectorBoxQuantity = ref(0);
  const bondXpTable = bondData.bond_xp;

  // Reset form data
  function resetFormData() {
    giftFormData.value = {};
    boxFormData.value = {};
    currentBond.value = 1;
    convertBox.value = false;
    originalYellowStoneQuantity.value = 0;
    originalSrGiftQuantity.value = 0;
    originalSelectorBoxQuantity.value = 0;
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
  watch([giftFormData, boxFormData, currentBond, convertBox], () => {
    if (props.student && props.isVisible) {
      saveToLocalStorage();
    }
  }, { deep: true });

  // Save current form data to localStorage
  function saveToLocalStorage() {
    if (!props.student) return;
    const storageKey = `student-${props.student.Id}-data`;
    const dataToSave = {
      studentId: props.student.Id,
      giftFormData: giftFormData.value,
      boxFormData: boxFormData.value,
      currentBond: currentBond.value,
      convertBox: convertBox.value,
      originalYellowStoneQuantity: originalYellowStoneQuantity.value,
      originalSrGiftQuantity: originalSrGiftQuantity.value,
      originalSelectorBoxQuantity: originalSelectorBoxQuantity.value
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
        giftFormData.value = parsedData.giftFormData || {};
        boxFormData.value = parsedData.boxFormData || {};
        currentBond.value = parsedData.currentBond || 1;

        // Restore original quantities
        originalYellowStoneQuantity.value = parsedData.originalYellowStoneQuantity || 0;
        originalSrGiftQuantity.value = parsedData.originalSrGiftQuantity || 0;
        originalSelectorBoxQuantity.value = parsedData.originalSelectorBoxQuantity || 0;
        
        // Handle conversion state
        const wasConverted = parsedData.convertBox || false;
        if (wasConverted !== convertBox.value) {
          convertBox.value = wasConverted;
        }
      }
    } catch (error) {
      resetFormData();
    }
  }

  // Calculate individual item EXP
  const calculateItemExp = (item: { exp: number }, quantity: number) => 
    isNaN(quantity) || quantity <= 0 ? 0 : item.exp * quantity;

  // Generic function to calculate EXP from gifts or boxes
  const calculateExpFromItems = (
    items: Record<string, any> | undefined,
    formData: Record<string, number>
  ) => {
    if (!items) return 0;

    return Object.entries(formData).reduce((total, [id, quantity]) => {
      const parsedQuantity = Number(quantity);
      return total + calculateItemExp(items[id], parsedQuantity);
    }, 0);
  };

  // Compute total cumulative EXP across gifts and boxes
  const calculateCumulativeExp = () => 
    calculateExpFromItems(props.student?.Gifts, giftFormData.value) +
    calculateExpFromItems(props.student?.Boxes, boxFormData.value);

  const totalCumulativeExp = computed(calculateCumulativeExp);

  // Compute new bond level based on current bond and cumulative EXP
  const newBondLevel = computed(() => {
    const currentXp = bondXpTable[currentBond.value - 1] || 0;
    const newXp = currentXp + totalCumulativeExp.value;

    // Find the highest bond level where required XP is <= newXp
    let newLevel = currentBond.value;
    while (newLevel < bondXpTable.length && bondXpTable[newLevel - 1] <= newXp) {
      newLevel++;
    }

    return Math.min(newLevel, 100); // Cap at level 100
  });

  // Compute remaining XP to the next level
  const remainingXp = computed(() => {
    if (newBondLevel.value >= 100) return 0;

    const currentXp = bondXpTable[currentBond.value - 1] || 0;
    const nextLevelXp = bondXpTable[newBondLevel.value - 1] || 0;
    const xpNeeded = nextLevelXp - currentXp - totalCumulativeExp.value;

    return Math.max(0, xpNeeded);
  });

  function getFontSizeClass(name: string) {
    return name.length <= 15 ? 'text-xl' : 'text-normal';
  }

  const removeLeadingZeros = (event: Event) => {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/^0+(?=\d)/, '');
  };

  const handleGiftInput = (giftId: number, event: Event) => {
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    giftFormData.value[giftId] = parseInt(input.value) || 0;
  };

  const handleBoxInput = (boxId: number, event: Event) => {
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    boxFormData.value[boxId] = parseInt(input.value) || 0;

    // Update original quantities when not in convert mode
    if (!convertBox.value) {
      if (boxId === 0) {
        originalYellowStoneQuantity.value = parseInt(input.value) || 0;
      } else if (boxId === 1) {
        originalSrGiftQuantity.value = parseInt(input.value) || 0;
      } else if (boxId === 2) {
        originalSelectorBoxQuantity.value = parseInt(input.value) || 0;
      }
    }
  };

  const handleBondInput = (event: Event) => {
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    if (!isNaN(value) && value >= 1 && value <= 100) {
      currentBond.value = value;
    }
  };

  const convertBoxes = () => {
    // Toggle the convertBox value first
    convertBox.value = !convertBox.value;

    if (!props.student?.Boxes || props.student.Boxes.length === 0) {
      return;
    }
    
    // Apply conversion logic for quantities
    const yellowStoneQuantity = originalYellowStoneQuantity.value;
    const srGiftMaterialQuantity = originalSrGiftQuantity.value;
    const selectorBoxQuantity = originalSelectorBoxQuantity.value;

    if (convertBox.value) {
      // Save original values only when first checked
      if (originalYellowStoneQuantity.value === 0 || 
        originalSrGiftQuantity.value === 0) {
        originalYellowStoneQuantity.value = 
          parseInt(boxFormData.value[0] as unknown as string) || 0;
        originalSrGiftQuantity.value = 
          parseInt(boxFormData.value[1] as unknown as string) || 0;
        originalSelectorBoxQuantity.value = 
          parseInt(boxFormData.value[2] as unknown as string) || 0;
      }
      
      // Calculate how many boxes can be converted based on available materials
      // Each conversion requires 2 materials and 1 stone
      const maxConvertibleByMaterials = Math.floor(srGiftMaterialQuantity / 2);
      const maxConvertibleByStones = yellowStoneQuantity;
      // Use the minimum of what materials and stones allow
      const convertedQuantity = Math.min(maxConvertibleByMaterials, 
        maxConvertibleByStones);
      
      // Set the quantities in boxFormData
      // Leftover stones
      boxFormData.value[0] = yellowStoneQuantity - convertedQuantity; 
      // Remaining materials
      boxFormData.value[1] = srGiftMaterialQuantity - (convertedQuantity * 2);
      // Number of selector boxes 
      boxFormData.value[2] = selectorBoxQuantity + convertedQuantity; 
    } else {
      // Restore original values when unchecked
      boxFormData.value[0] = originalYellowStoneQuantity.value;
      boxFormData.value[1] = originalSrGiftQuantity.value;
      boxFormData.value[2] = originalSelectorBoxQuantity.value;
    }
  };

  const shouldShowGiftGrade = computed(() => {
    return (index: number): boolean => {
      return (
        // Index 0: Keystone, Index 1: SR Gifts, 
        // Index 2: Selector SR Gifts, Index 3: Selector Keystone
        (!convertBox.value && index !== 0) || 
        (convertBox.value && index === 1 && boxFormData.value[1] > 0) ||
        (convertBox.value && index === 2 && boxFormData.value[2] > 0) ||
        (convertBox.value && index === 3 && boxFormData.value[3] > 0)
      );
    };
  });

  function closeModal() {
    // Save the current state (including conversion state) before closing
    saveToLocalStorage();
    emit('close');
  }

  return {
    // State
    giftFormData,
    boxFormData,
    currentBond,
    convertBox,
    originalYellowStoneQuantity,
    originalSrGiftQuantity,
    originalSelectorBoxQuantity,
    
    // Computed
    totalCumulativeExp,
    newBondLevel,
    remainingXp,
    shouldShowGiftGrade,
    
    // Methods
    closeModal,
    resetFormData,
    saveToLocalStorage,
    loadFromLocalStorage,
    getFontSizeClass,
    handleGiftInput,
    handleBoxInput,
    handleBondInput,
    convertBoxes
  };
}