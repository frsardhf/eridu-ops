import { ref, computed, watch } from 'vue';
import { StudentProps } from '../../types/student';
import { BondDetailDataProps, DEFAULT_BOND_DETAIL } from '../../types/gift';
import { getResources, loadFormDataToRefs, saveFormData } from '../utils/studentStorage';
import bondData from '../../data/data.json';
import { updateStudentData } from '../stores/studentStore';
import { SELECTOR_BOX_ID, SR_GIFT_MATERIAL_ID, YELLOW_STONE_ID } from '../../types/resource';

export function useStudentGifts(props: {
  student: StudentProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {

  const giftFormData = ref<Record<string, number>>({});
  const boxFormData = ref<Record<string, number>>({});
  const bondDetailData = ref<BondDetailDataProps>({...DEFAULT_BOND_DETAIL});
  const isCalculating = ref(false);
  
  // Add previous state storage for undo functionality
  const previousGiftFormData = ref<Record<string, number>>({});
  const previousBoxFormData = ref<Record<string, number>>({});

  const bondXpTable = bondData.bond_xp;

  function resetFormData() {
    giftFormData.value = {};
    boxFormData.value = {};
    bondDetailData.value = {...DEFAULT_BOND_DETAIL};
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

  // Store previous state before any changes
  const savePreviousState = () => {
    previousGiftFormData.value = JSON.parse(JSON.stringify(giftFormData.value));
    previousBoxFormData.value = JSON.parse(JSON.stringify(boxFormData.value));
  };

  // Watch for changes to form data and save to localStorage
  watch([giftFormData, boxFormData, bondDetailData], () => {
    if (props.student && props.isVisible) {
      saveToLocalStorage();
      updateStudentData(props.student.Id);
    }
  }, { deep: true });

  function saveToLocalStorage() {
    if (!props.student) return;

    const dataToSave = {
      giftFormData: giftFormData.value,
      boxFormData: boxFormData.value,
      bondDetailData: bondDetailData.value
    }

    saveFormData(props.student.Id, dataToSave);
  }

  function loadFromLocalStorage() {
    if (!props.student) return;
    
    // Define the refs and their default values
    const refs = {
      giftFormData,
      boxFormData,
      bondDetailData
    };
    
    const defaultValues = {
      giftFormData: {},
      boxFormData: {},
      bondDetailData: DEFAULT_BOND_DETAIL
    };

    loadFormDataToRefs(props.student.Id, refs, defaultValues);
    
    // Store initial state for undo after loading
    savePreviousState();
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
    
    return totalExp;
  };

  const totalCumulativeExp = computed(calculateCumulativeExp);

  // Compute new bond level based on current bond and cumulative EXP
  const newBondLevel = computed(() => {
    // Return early if we're already at max level
    if (bondDetailData.value.currentBond >= 100) return 100;
    
    // No gifts added, stay at current level
    if (totalCumulativeExp.value <= 0) return bondDetailData.value.currentBond;
    
    // Calculate total XP including current level's cumulative XP and gift XP
    const currentLevelCumulativeXp = bondXpTable[bondDetailData.value.currentBond - 1] ?? 0;
    const totalXp = currentLevelCumulativeXp + totalCumulativeExp.value;
    
    // Find the highest level we can reach with this total XP
    let newLevel = bondDetailData.value.currentBond;
    for (let i = bondDetailData.value.currentBond; i < 100; i++) {
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
    const currentLevelCumulativeXp = bondXpTable[bondDetailData.value.currentBond - 1] ?? 0;
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
    // Save current state before modifying
    savePreviousState();
    
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    giftFormData.value[giftId] = parseInt(input.value) || 0;
  };

  const handleBoxInput = (boxId: number, event: Event) => {
    // Save current state before modifying
    savePreviousState();
    
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    boxFormData.value[boxId] = parseInt(input.value) || 0;
  };

  const handleBondInput = (event: Event) => {
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    if (!isNaN(value) && value >= 1 && value <= 100) {
      bondDetailData.value.currentBond = value;
    }
  };

  const convertBoxes = () => {
    // Save current state before modifying
    savePreviousState();
    
    if (!props.student?.Boxes || Object.keys(props.student.Boxes).length === 0) {
      return;
    }
    
    // Run conversion immediately (no toggling needed)
    calculateOptimalConversion();
  };

  // Function to calculate optimal conversion
  const calculateOptimalConversion = () => {
    // Prevent recalculation if already calculating
    if (isCalculating.value) return;
    
    try {
      isCalculating.value = true;
      
      // Get current values
      const yellowStoneQuantity = boxFormData.value[YELLOW_STONE_ID] || 0;
      const srGiftMaterialQuantity = boxFormData.value[SR_GIFT_MATERIAL_ID] || 0;
      const selectorBoxQuantity = boxFormData.value[SELECTOR_BOX_ID] || 0;
      
      // Ensure we have valid values
      if (yellowStoneQuantity <= 0 || srGiftMaterialQuantity <= 0) {
        // Not enough materials to convert, no changes needed
        return;
      }
      
      // Calculate how many boxes can be converted based on available materials
      // Each conversion requires 2 materials and 1 stone
      const maxConvertibleByMaterials = Math.floor(srGiftMaterialQuantity / 2);
      const maxConvertibleByStones = yellowStoneQuantity;
      
      // Use the minimum of what materials and stones allow
      const convertedQuantity = Math.min(maxConvertibleByMaterials, maxConvertibleByStones);
      
      // Set the quantities in boxFormData without triggering the watcher
      boxFormData.value = {
        ...boxFormData.value,
        [YELLOW_STONE_ID]: yellowStoneQuantity - convertedQuantity, // Leftover stones
        [SR_GIFT_MATERIAL_ID]: srGiftMaterialQuantity - (convertedQuantity * 2), // Remaining materials
        [SELECTOR_BOX_ID]: selectorBoxQuantity + convertedQuantity // Number of selector boxes
      };
    } finally {
      isCalculating.value = false;
    }
  };

  // Watch for changes to boxFormData when in conversion mode
  watch(boxFormData, () => {
    // Removed the conversion logic from the watcher
  }, { deep: true });

  const shouldShowGiftGrade = computed(() => {
    return (id: number): boolean => {
      return (
        // Only show grades for non-keystones to avoid missing grade favor icon
        // because keystone doesn't have exp value
        id !== YELLOW_STONE_ID
      );
    };
  });

  // Reset all gifts to zero
  const resetGifts = () => {
    // Save current state before resetting
    savePreviousState();
    
    // Reset all gift and box data to empty objects (zero values)
    giftFormData.value = {};
    boxFormData.value = {};
  };
  
  // Undo changes to previous state
  const undoChanges = () => {
    // Restore from previous state
    giftFormData.value = JSON.parse(JSON.stringify(previousGiftFormData.value));
    boxFormData.value = JSON.parse(JSON.stringify(previousBoxFormData.value));
  };

  const autoFillGifts = () => {
    // Save current state before autofilling
    savePreviousState();
    
    const resources = getResources();

    // Filter out gifts from the resources
    const gifts = Object.values(resources ?? {}).filter(resource => 
      resource && resource.Category === 'Favor'
    );

    if (!giftFormData.value) {
      giftFormData.value = {};
    }

    let nonFavorGiftsSr = 0;
    let nonFavorGiftsSsr = 0;
    const blackListIds = [5996, 5997, 5998, 5999];

    // Check if student has gifts
    if (props.student?.Gifts) {
      // Loop through all gifts from resources
      gifts.forEach(gift => {
        if (gift.Id) {
          // Check if this gift ID exists in the student's Gifts
          // This depends on the structure of student.Gifts
          const isStudentGift = props.student?.Gifts
            ? Object.keys(props.student.Gifts).some(
                giftKey => props.student?.Gifts[giftKey].gift.Id === gift.Id
              )
            : false;
          
          if (isStudentGift) {
            // Set the quantity in giftFormData based on what's owned
            giftFormData.value[gift.Id] = gift.QuantityOwned ?? 0;
          } else {
            if (gift.Rarity === 'SR') {
              nonFavorGiftsSr += gift.QuantityOwned ?? 0;
            }
            if (gift.Rarity === 'SSR' && !blackListIds.includes(gift.Id)) {
              // Exclude specific IDs from SSR count
              nonFavorGiftsSsr += gift.QuantityOwned ?? 0;
            }
          }
        }
      });
    }

    // Set the quantities for non-favor gifts in boxFormData
    boxFormData.value[100000] = nonFavorGiftsSr;
    boxFormData.value[100009] = nonFavorGiftsSsr;
  }

  function closeModal() {
    // Save the current state (including conversion state) before closing
    saveToLocalStorage();
    emit('close');
  }

  // Create computed properties to expose the nested properties for compatibility
  const currentBond = computed({
    get: () => bondDetailData.value.currentBond,
    set: (value) => { bondDetailData.value.currentBond = value; }
  });

  return {
    // State
    giftFormData,
    boxFormData,
    bondDetailData,
    currentBond, // Computed getter/setter for compatibility
    
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
    convertBoxes,
    autoFillGifts,
    resetGifts,
    undoChanges,
  };
}