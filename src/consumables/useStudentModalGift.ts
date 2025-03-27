import { ref, computed, watch } from 'vue';
import { StudentProps } from '../types/student';
import { GiftDataProps } from '../types/gift';
import xpData from '../data/data.json';

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
  const bondXpTable = xpData.bond_xp;

  // Reset form data
  function resetFormData() {
    giftFormData.value = {};
    boxFormData.value = {};
    currentBond.value = 1;
    convertBox.value = false;
    originalYellowStoneQuantity.value = 0;
    originalSrGiftQuantity.value = 0;
  }

  // Centralized storage management
  function getStudentsFromStorage(): StudentProps[] {
    try {
      const studentsData = localStorage.getItem('students');
      return studentsData ? JSON.parse(studentsData) : [];
    } catch (error) {
      console.error('Error retrieving students from localStorage:', error);
      return [];
    }
  }

  function updateStudentsInStorage(students: StudentProps[]) {
    try {
      localStorage.setItem('students', JSON.stringify(students));
    } catch (error) {
      console.error('Error saving students to localStorage:', error);
    }
  }

  // Save current form data to localStorage
  function saveToLocalStorage() {
    if (!props.student) return;

    const students = getStudentsFromStorage();
    
    // Find existing student data or create new entry
    const existingStudentIndex = students.findIndex(s => s.Id === props.student?.Id);
    
    const studentData: StudentProps = {
      ...props.student,
      Gifts: props.student.Gifts?.map((gift, index) => ({
        ...gift,
        quantity: giftFormData.value[index] || 0
      })),
      Boxes: props.student.Boxes?.map((box, index) => ({
        ...box,
        quantity: boxFormData.value[index] || 0
      })),
      BondFormData: {
        currentBond: currentBond.value,
        convertBox: convertBox.value,
        originalYellowStoneQuantity: originalYellowStoneQuantity.value,
        originalSrGiftQuantity: originalSrGiftQuantity.value
      }
    };
    console.log(studentData);
    if (existingStudentIndex !== -1) {
      students[existingStudentIndex] = studentData;
    } else {
      // Add new student
      students.push(studentData);
    }

    updateStudentsInStorage(students);
  }

  // Load form data from localStorage
  function loadFromLocalStorage() {
    if (!props.student) return;
    console.log(props.student);
    const students = getStudentsFromStorage();
    const savedStudentData = students.find(s => s.Id === props.student?.Id);
    if (savedStudentData) {
      // Apply saved data from the new structure
      if (savedStudentData.Gifts) {
        giftFormData.value = savedStudentData.Gifts.reduce((acc, gift) => {
          acc[gift.id] = gift.quantity || 0;
          return acc;
        }, {} as Record<string, number>);
      }

      if (savedStudentData.Boxes) {
        boxFormData.value = savedStudentData.Boxes.reduce((acc, box) => {
          acc[box.id] = box.quantity || 0;
          return acc;
        }, {} as Record<string, number>);
      }

      // Load bond form data
      if (savedStudentData.BondFormData) {
        currentBond.value = 
          savedStudentData.BondFormData.currentBond || 1;
        originalYellowStoneQuantity.value = 
          savedStudentData.BondFormData.originalYellowStoneQuantity || 0;
        originalSrGiftQuantity.value = 
          savedStudentData.BondFormData.originalSrGiftQuantity || 0;

        // Handle conversion state
        const wasConverted = savedStudentData.BondFormData.convertBox || false;
        if (wasConverted !== convertBox.value) {
          convertBox.value = wasConverted;
          if (wasConverted) {
            applyBoxProperties();
          } else {
            resetBoxProperties();
          }
        }
      }
    }
  }

  watch(() => props.isVisible, (newValue) => {
    if (newValue && props.student) {
      setTimeout(() => {
        loadFromLocalStorage();
      }, 50);
    }
  }, { immediate: true });

  watch(() => props.student, (newValue) => {
    if (newValue) {
      resetFormData();
      if (props.isVisible) {
        loadFromLocalStorage();
      }
    }
  });

  watch([giftFormData, boxFormData, currentBond, convertBox], () => {
    if (props.student && props.isVisible) {
      saveToLocalStorage();
    }
  }, { deep: true });

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
      exp: 20,
      grade: 1,
      gift: { ...boxes[0].gift, Icon: "item_icon_favor_random" },
    });

    const highestExpGift = findHighestExpSrGift();

    Object.assign(boxes[1], {
      exp: highestExpGift?.exp ?? 20,
      grade: highestExpGift?.grade ?? 1,
      gift: { ...boxes[1].gift, Icon: "item_icon_favor_selection" },
    });
  }

  function resetBoxProperties() {
    if (!props.student) return;

    const boxes = props.student.Boxes;

    Object.assign(boxes[0], {
      exp: 0,
      grade: 0,
      gift: { ...boxes[0].gift, Icon: "item_icon_shiftingcraftitem_2" },
    });

    Object.assign(boxes[1], {
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
    const value = parseInt(input.value) || 0;
    giftFormData.value[giftId] = value;
  };

  const handleBoxInput = (boxId: number, event: Event) => {
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    boxFormData.value[boxId] = value;

    // Update original quantities when not in convert mode
    if (!convertBox.value) {
      if (boxId === 0) {
        originalYellowStoneQuantity.value = value;
      } else if (boxId === 1) {
        originalSrGiftQuantity.value = value;
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
        originalYellowStoneQuantity.value = parseInt(boxFormData.value['0'] as unknown as string) || 0;
        originalSrGiftQuantity.value = parseInt(boxFormData.value['1'] as unknown as string) || 0;
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
        boxFormData.value['0'] = originalYellowStoneQuantity.value;
        boxFormData.value['1'] = originalSrGiftQuantity.value;
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
    
    boxFormData.value['0'] = leftoverQuantity;
    boxFormData.value['1'] = convertedQuantity;
    
    // Update the box exp and grade
    const boxes = props.student.Boxes;

    Object.assign(boxes[0], {
      exp: 20,
      grade: 1,
      gift: { ...boxes[0].gift, Icon: "item_icon_favor_random" },
    });
    
    Object.assign(boxes[1], {
      exp: highestExpGift?.exp ?? 20,
      grade: highestExpGift?.grade ?? 1,
      gift: { ...boxes[1].gift, Icon: "item_icon_favor_selection" },
    });
  };

  const shouldShowGiftGrade = computed(() => {
    return (index: number): boolean => {
      // Special case for collab students (without favorite gifts)
      const isCollabStudent = !props.student?.Gifts || props.student.Gifts.length === 4;
      
      // For non-convert mode
      if (!convertBox.value) {
        return index !== 0; // Show grade for all boxes except keystone
      }
      
      // For convert mode
      if (index === 0) {
        return boxFormData.value['0'] > 0 && boxFormData.value['1'] > 0;
      }
      
      // For other boxes in convert mode
      return boxFormData.value[index] > 0 || (isCollabStudent && index > 0);
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