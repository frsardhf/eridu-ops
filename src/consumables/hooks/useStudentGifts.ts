import { ref, computed, watch } from 'vue';
import { StudentProps } from '../../types/student';
import { loadFormDataToRefs, saveFormData } from '../utils/studentStorage';
import bondData from '../../data/data.json';

export function useStudentGifts(props: {
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

  function saveToLocalStorage() {
    if (!props.student) return;

    const dataToSave = {
      giftFormData: giftFormData.value,
      boxFormData: boxFormData.value,
      currentBond: currentBond.value,
      convertBox: convertBox.value,
      originalYellowStoneQuantity: originalYellowStoneQuantity.value,
      originalSrGiftQuantity: originalSrGiftQuantity.value,
      originalSelectorBoxQuantity: originalSelectorBoxQuantity.value
    }

    saveFormData(props.student.Id, dataToSave);
  }

  function loadFromLocalStorage() {
    if (!props.student) return;
    
    // Define the refs and their default values
    const refs = {
      giftFormData,
      boxFormData,
      currentBond,
      convertBox,
      originalYellowStoneQuantity,
      originalSrGiftQuantity,
      originalSelectorBoxQuantity
    };
    
    const defaultValues = {
      giftFormData: {},
      boxFormData: {},
      currentBond: 1,
      convertBox: false,
      originalYellowStoneQuantity: 0,
      originalSrGiftQuantity: 0,
      originalSelectorBoxQuantity: 0
    };

    const success = loadFormDataToRefs(props.student.Id, refs, defaultValues);
    
    if (!success) {
      resetFormData();
    }
  }

  // Calculate individual item EXP
  const calculateItemExp = (expValue: number, quantity: number): number => {
    if (isNaN(quantity) || quantity <= 0) return 0;
    return expValue * quantity;
  };

  // Extract exp value from an item regardless of its structure
  const getItemExpValue = (item: any): number => {
    if (!item) return 0;
    
    // Direct exp property
    if (typeof item.exp === 'number') {
      return item.exp;
    }
    
    // Nested in gift object
    if (item.gift && typeof item.gift.exp === 'number') {
      return item.gift.exp;
    }
    
    return 0;
  };

  // Calculate EXP for a single item type (gifts or boxes)
  const calculateItemTypeExp = (
    items: Record<string, any> | undefined,
    formData: Record<string, number>,
    itemType: string // For logging
  ): number => {
    if (!items || !formData) return 0;
    
    let typeTotal = 0;
    
    // Process each item with quantity in the form data
    Object.entries(formData).forEach(([itemId, quantity]) => {
      if (quantity <= 0) return;
      
      // Get the item by ID
      const item = items[itemId];
      if (!item) return;
      
      // Get exp value
      const expValue = getItemExpValue(item);
      if (expValue <= 0) return;
      
      // Calculate and add exp
      const itemExp = calculateItemExp(expValue, quantity);
      typeTotal += itemExp;
      
      // console.log(`${itemType} ID ${itemId}: ${quantity} x ${expValue} = ${itemExp} EXP`);
    });
    
    return typeTotal;
  };

  // Compute total cumulative EXP across gifts and boxes
  const calculateCumulativeExp = (): number => {
    if (!props.student) return 0;
    
    // Calculate exp for gifts
    const giftsExp = calculateItemTypeExp(
      props.student.Gifts,
      giftFormData.value,
      'Gift'
    );
    
    // Calculate exp for boxes
    const boxesExp = calculateItemTypeExp(
      props.student.Boxes,
      boxFormData.value,
      'Box'
    );
    
    const totalExp = giftsExp + boxesExp;
    // console.log(`Total EXP: Gifts (${giftsExp}) + Boxes (${boxesExp}) = ${totalExp}`);
    
    return totalExp;
  };

  const totalCumulativeExp = computed(calculateCumulativeExp);

  // Compute new bond level based on current bond and cumulative EXP
  const newBondLevel = computed(() => {
    // Return early if we're already at max level
    if (currentBond.value >= 100) return 100;
    
    // No gifts added, stay at current level
    if (totalCumulativeExp.value <= 0) return currentBond.value;
    
    // Calculate total XP including current level's cumulative XP and gift XP
    const currentLevelCumulativeXp = bondXpTable[currentBond.value - 1] || 0;
    const totalXp = currentLevelCumulativeXp + totalCumulativeExp.value;
    
    // Find the highest level we can reach with this total XP
    let newLevel = currentBond.value;
    for (let i = currentBond.value; i < 100; i++) {
      if (totalXp >= bondXpTable[i]) {
        newLevel = i + 1;
      } else {
        break;
      }
    }
    
    return newLevel;
  });

  // Compute remaining XP to the next level
  const remainingXp = computed(() => {
    // Return 0 if already at max level
    if (newBondLevel.value >= 100) return 0;
    
    // Calculate total XP including current level's cumulative XP and gift XP
    const currentLevelCumulativeXp = bondXpTable[currentBond.value - 1] || 0;
    const totalXp = currentLevelCumulativeXp + totalCumulativeExp.value;
    
    // Get the XP needed for the next level
    const nextLevelXp = bondXpTable[newBondLevel.value];
    
    // Calculate remaining XP needed
    const remainingExp = nextLevelXp - totalXp;
    
    return Math.max(0, remainingExp);
  });

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
      // Find the box by ID
      const box = props.student?.Boxes[boxId];
      if (box) {
        // Store original values based on the gift ID
        if (box.gift.Id === 82) { // Yellow stone
          originalYellowStoneQuantity.value = parseInt(input.value) || 0;
        } else if (box.gift.Id === 100000) { // SR gift material
          originalSrGiftQuantity.value = parseInt(input.value) || 0;
        } else if (box.gift.Id === 100008) { // Selector box
          originalSelectorBoxQuantity.value = parseInt(input.value) || 0;
        }
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

    if (!props.student?.Boxes || Object.keys(props.student.Boxes).length === 0) {
      return;
    }
    
    // Define IDs for our special items
    const YELLOW_STONE_ID = 82;
    const SR_GIFT_MATERIAL_ID = 100000;
    const SELECTOR_BOX_ID = 100008;
    
    // Apply conversion logic for quantities
    const yellowStoneQuantity = originalYellowStoneQuantity.value;
    const srGiftMaterialQuantity = originalSrGiftQuantity.value;
    const selectorBoxQuantity = originalSelectorBoxQuantity.value;

    if (convertBox.value) {
      // Save original values only when first checked
      if (originalYellowStoneQuantity.value === 0 || 
        originalSrGiftQuantity.value === 0) {
        // Store the original quantities directly by ID
        originalYellowStoneQuantity.value = 
          parseInt(boxFormData.value[YELLOW_STONE_ID] as unknown as string) || 0;
        originalSrGiftQuantity.value = 
          parseInt(boxFormData.value[SR_GIFT_MATERIAL_ID] as unknown as string) || 0;
        originalSelectorBoxQuantity.value = 
          parseInt(boxFormData.value[SELECTOR_BOX_ID] as unknown as string) || 0;
      }
      
      // Calculate how many boxes can be converted based on available materials
      // Each conversion requires 2 materials and 1 stone
      const maxConvertibleByMaterials = Math.floor(srGiftMaterialQuantity / 2);
      const maxConvertibleByStones = yellowStoneQuantity;
      // Use the minimum of what materials and stones allow
      const convertedQuantity = Math.min(maxConvertibleByMaterials, 
        maxConvertibleByStones);
      
      // Set the quantities in boxFormData using gift IDs
      boxFormData.value[YELLOW_STONE_ID] = yellowStoneQuantity - convertedQuantity; // Leftover stones
      boxFormData.value[SR_GIFT_MATERIAL_ID] = srGiftMaterialQuantity - (convertedQuantity * 2); // Remaining materials
      boxFormData.value[SELECTOR_BOX_ID] = selectorBoxQuantity + convertedQuantity; // Number of selector boxes
    } else {
      // Restore original values when unchecked
      boxFormData.value[YELLOW_STONE_ID] = originalYellowStoneQuantity.value;
      boxFormData.value[SR_GIFT_MATERIAL_ID] = originalSrGiftQuantity.value;
      boxFormData.value[SELECTOR_BOX_ID] = originalSelectorBoxQuantity.value;
    }
  };

  const shouldShowGiftGrade = computed(() => {
    // Define IDs for our special items
    const YELLOW_STONE_ID = 82;
    const SR_GIFT_MATERIAL_ID = 100000;
    const SELECTOR_BOX_ID = 100008;
    const SELECTOR_KEYSTONE_ID = 100009;
    
    return (id: number): boolean => {
      return (
        // Only show grades for non-keystones or when converted boxes have quantities
        (!convertBox.value && id !== YELLOW_STONE_ID) || 
        (convertBox.value && id === SR_GIFT_MATERIAL_ID && boxFormData.value[SR_GIFT_MATERIAL_ID] > 0) ||
        (convertBox.value && id === SELECTOR_BOX_ID && boxFormData.value[SELECTOR_BOX_ID] > 0) ||
        (convertBox.value && id === SELECTOR_KEYSTONE_ID && boxFormData.value[SELECTOR_KEYSTONE_ID] > 0)
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
    handleGiftInput,
    handleBoxInput,
    handleBondInput,
    convertBoxes
  };
}