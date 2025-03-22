import { ref, computed, watch } from 'vue';
import { StudentProps } from '../types/student';
import { GiftDataProps } from '../types/gift';
import bondData from '../../src/data/data.json';

export function useStudentModal(props: {
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
  const bondXpTable = bondData.bond_xp;

  // Reset form data
  function resetFormData() {
    giftFormData.value = {};
    boxFormData.value = {};
    currentBond.value = 1;
    convertBox.value = false;
    originalYellowStoneQuantity.value = 0;
    originalSrGiftQuantity.value = 0;
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
      giftFormData: giftFormData.value,
      boxFormData: boxFormData.value,
      currentBond: currentBond.value,
      convertBox: convertBox.value,
      originalYellowStoneQuantity: originalYellowStoneQuantity.value,
      originalSrGiftQuantity: originalSrGiftQuantity.value
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
        
        // Handle conversion state
        const wasConverted = parsedData.convertBox || false;
        if (wasConverted !== convertBox.value) {
          convertBox.value = wasConverted;
          if (wasConverted) {
            applyBoxProperties();
          } else {
            resetBoxProperties();
          }
        }
      }
    } catch (error) {
      resetFormData();
    }
  }

  // Function to find highest exp SR gift
  function findHighestExpSrGift(): GiftDataProps | null {
    if (!props.student?.Gifts) return null;
    
    let highestExpGift: GiftDataProps | null = null;
    
    props.student.Gifts.forEach((gift) => {
      if (gift.gift.Rarity === "SR" && (!highestExpGift || gift.exp > highestExpGift.exp)) {
        highestExpGift = gift;
      }
    });
    
    return highestExpGift;
  }

  function applyBoxProperties() {
    if (!props.student) return;

    const boxes = props.student.Boxes;

    Object.assign(boxes[0], {
      name: "SR Gifts",
      exp: 20,
      grade: 1,
      gift: { ...boxes[0].gift, Icon: "item_icon_favor_random" },
    });

    const highestExpGift = findHighestExpSrGift();

    Object.assign(boxes[1], {
      name: "Selector SR Gifts",
      exp: highestExpGift?.exp ?? 20,
      grade: highestExpGift?.grade ?? 1,
      gift: { ...boxes[1].gift, Icon: "item_icon_favor_selection" },
    });
  }

  function resetBoxProperties() {
    if (!props.student) return;

    const boxes = props.student.Boxes;

    Object.assign(boxes[0], {
      name: "Advanced Fusion Keystone",
      exp: 0,
      grade: 0,
      gift: { ...boxes[0].gift, Icon: "item_icon_shiftingcraftitem_2" },
    });

    Object.assign(boxes[1], {
      name: "SR Gifts",
      exp: 20,
      grade: 1,
      gift: { ...boxes[1].gift, Icon: "item_icon_favor_random" },
    });
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
    
    if (convertBox.value) {
      // Save original values only when first checked
      if (originalYellowStoneQuantity.value === 0 || originalSrGiftQuantity.value === 0) {
        originalYellowStoneQuantity.value = parseInt(boxFormData.value[0] as unknown as string) || 0;
        originalSrGiftQuantity.value = parseInt(boxFormData.value[1] as unknown as string) || 0;
      }
      
      // Apply conversion logic for quantities
      const yellowStoneQuantity = originalYellowStoneQuantity.value;
      const srGiftMaterialQuantity = originalSrGiftQuantity.value;
      
      if (srGiftMaterialQuantity > 0 && yellowStoneQuantity > 0) {
        // Apply box properties and perform conversion
        applyBoxProperties();
        applyBoxConversion(srGiftMaterialQuantity, yellowStoneQuantity);
      } else {
        // Just apply box properties if no quantities to convert
        applyBoxProperties();
      }
    } else {
      // Restore original values when unchecked
      if (originalYellowStoneQuantity.value > 0 || originalSrGiftQuantity.value > 0) {
        boxFormData.value[0] = originalYellowStoneQuantity.value;
        boxFormData.value[1] = originalSrGiftQuantity.value;
      }
      resetBoxProperties();
    }
  };

  // Function to apply box conversion
  const applyBoxConversion = (materialQuantity: number, stoneQuantity: number) => {
    if (!props.student) return;

    const highestExpGift = findHighestExpSrGift();
    
    // Calculate how many boxes can be converted based on available materials
    // Each conversion requires 2 materials
    const maxConvertible = Math.floor(materialQuantity / 2);
    // Use the minimum of stone quantity and what materials allow
    const convertedQuantity = Math.min(stoneQuantity, maxConvertible);
    const leftoverQuantity = materialQuantity - (convertedQuantity * 2);
    
    boxFormData.value[0] = leftoverQuantity;
    boxFormData.value[1] = convertedQuantity;
    
    // Update the box exp and grade
    const boxes = props.student.Boxes;

    Object.assign(boxes[0], {
      name: "SR Gifts",
      exp: 20,
      grade: 1,
      gift: { ...boxes[0].gift, Icon: "item_icon_favor_random" },
    });
    
    Object.assign(boxes[1], {
      name: "Selector SR Gifts",
      exp: highestExpGift?.exp ?? 20,
      grade: highestExpGift?.grade ?? 1,
      gift: { ...boxes[1].gift, Icon: "item_icon_favor_selection" },
    });
  };

  const shouldShowGiftGrade = computed(() => {
    return (index: number): boolean => {
      // Special case for collab students (without favorite gifts)
      const isCollabStudent = !props.student?.Gifts || props.student.Gifts.length === 4;
      return (
        // Index 0: Keystone, Index 1: SR Gifts, Index 2: SSR Gifts
        (!convertBox.value && index !== 0) || 
        (convertBox.value && index === 0 && boxFormData.value[0] > 0 && boxFormData.value[1] > 0) ||
        (convertBox.value && index > 0 && boxFormData.value[index] > 0) ||
        (isCollabStudent && convertBox.value && index > 0)
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
    applyBoxProperties,
    resetBoxProperties,
    getFontSizeClass,
    handleGiftInput,
    handleBoxInput,
    handleBondInput,
    convertBoxes
  };
}