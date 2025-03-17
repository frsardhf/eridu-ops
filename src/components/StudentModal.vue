<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { StudentProps } from '../types/student'
import bondData from '../../src/data/data.json';
import '../styles/studentModal.css'
import { GiftDataProps } from '../types/gift';

const props = defineProps<{
  student: StudentProps | null,
  isVisible?: boolean
}>();

type EmitFn = (event: 'close') => void;
const emit = defineEmits<EmitFn>();

function closeModal() {
  // Save the current state (including conversion state) before closing
  saveToLocalStorage();
  emit('close');
};

const giftFormData = ref({});
const boxFormData = ref({});
const currentBond = ref(1);
const convertBox = ref(false);
const originalYellowStoneQuantity = ref(0);
const originalSrGiftQuantity = ref(0);
const bondXpTable = bondData.bond_xp;

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

// Reset form data
function resetFormData() {
  giftFormData.value = {};
  boxFormData.value = {};
  currentBond.value = 1;
  convertBox.value = false;
  originalYellowStoneQuantity.value = 0;
  originalSrGiftQuantity.value = 0;
}

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
  giftFormData.value[giftId] = input.value;
};

const handleBoxInput = (boxId: number, event: Event) => {
  removeLeadingZeros(event);
  const input = event.target as HTMLInputElement;
  boxFormData.value[boxId] = input.value;

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
  if (!props.student?.Boxes || props.student.Boxes.length === 0) {
    return;
  }
  
  if (convertBox.value) {
    // Save original values only when first checked
    if (originalYellowStoneQuantity.value === 0 || originalSrGiftQuantity.value === 0) {
      originalYellowStoneQuantity.value = parseInt(boxFormData.value[0]) || 0;
      originalSrGiftQuantity.value = parseInt(boxFormData.value[1]) || 0;
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
};

const shouldShowGiftGrade = computed(() => {
  return (index: number):boolean => {
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
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      
      <div class="modal-grid">
        <!-- Left Column -->
        <div class="left-column">
          <!-- Student Image Section -->
          <div class="student-section">
            <img 
              :src="`https://schaledb.com/images/student/collection/${student!.Id}.webp`"
              :alt="student!.Name"
              class="student-image"
            />
            <h2 
              class="student-name text-xl font-bold" 
              :class="getFontSizeClass(student!.Name)">
              {{ student!.Name }}
            </h2>
          </div>

          <!-- Bond Section -->
          <div class="bond-section">
            <div class="bond-container">
              <div class="bond-display">
                <div class="bond-icon-container">
                  <img 
                    src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
                    alt="Current Bond"
                    class="bond-icon"
                  />
                  <span class="bond-number">{{ currentBond }}</span>
                </div>
              </div>
              
              <div class="bond-info">
                <div class="bond-arrow">→</div>
                <div class="exp-info" v-if="remainingXp > 0">
                  {{ remainingXp }} XP to next level
                </div>
              </div>
              
              <div class="bond-display">
                <div class="bond-icon-container">
                  <img 
                    src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
                    alt="New Bond"
                    class="bond-icon"
                  />
                  <span class="bond-number">{{ newBondLevel }}</span>
                </div>
              </div>
            </div>
            <div>
              <input
                id="bond-input"
                type="number"
                :value="currentBond"
                @input="handleBondInput"
                class="bond-input"
                min="1"
                max="100"
              />
            </div>
            <div class="total-exp">
              Total EXP: {{ totalCumulativeExp }}
            </div>
          </div>

          <div class="convert-box-section">
            <input
              id="convert-input"
              type="checkbox"
              v-model="convertBox"
              @change="convertBoxes"
              class="convert-input"
            />
            <span>Convert Gift Choice Box</span>
          </div>
        </div>

        <!-- Right Column - Gifts Grid -->
        <div class="right-column">
          <div class="gifts-grid">
            <!-- Regular Gifts Section -->
            <template v-if="student!.Gifts && student!.Gifts.length > 0">
              <div v-for="(item, index) in student!.Gifts" 
                  :key="`gift-${index}`"
                  class="gift-card">
                <div class="gift-header">
                  <img 
                    :src="`https://schaledb.com/images/item/icon/${item.gift.Icon}.webp`"
                    :alt="item.gift.Name"
                    class="gift-icon"
                  />
                </div>
                <div class="gift-details">
                  <div class="gift-grade">
                    <img 
                      :src="`https://schaledb.com/images/ui/Cafe_Interaction_Gift_0${item.grade}.png`"
                      :alt="item.grade.toString()"
                      class="grade-icon"
                    />
                    <span class="exp-value">{{ item.exp }} EXP</span>
                  </div>
                  <div class="gift-exp-info">
                    <input
                      :id="`gift-input-${index}`"
                      type="number"
                      :value="giftFormData[index]"
                      @input="(e) => handleGiftInput(index, e)"
                      class="gift-input"
                      min="0"
                      placeholder="Amount"
                    />
                  </div>
                </div>
              </div>
            </template>
            
            <!-- Gift Boxes Section -->
            <template v-if="student!.Boxes && student!.Boxes.length > 0">
              <div v-for="(item, index) in student!.Boxes" 
                  :key="`box-${index}`"
                  class="gift-card box-card">
                <div class="gift-header">
                  <img 
                    :src="`https://schaledb.com/images/item/full/${item.gift.Icon}.webp`"
                    :alt="item.gift.Name"
                    class="gift-icon"
                  />
                </div>
                <div class="gift-details">
                  <div class="gift-grade" v-if="shouldShowGiftGrade(index)">
                    <img 
                      :src="`https://schaledb.com/images/ui/Cafe_Interaction_Gift_0${item.grade}.png`"
                      :alt="item.grade.toString()"
                      class="grade-icon"
                    />
                    <span class="exp-value">{{ item.exp }} EXP</span>
                  </div>
                  <div class="gift-grade placeholder-div" v-else>
                    <div class="invisible-placeholder">
                      <span class="gift-name">{{ item.name }}</span>
                    </div>
                  </div>
                  <div class="gift-exp-info">
                    <input
                      :id="`box-input-${index}`"
                      type="number"
                      :value="boxFormData[index]"
                      @input="(e) => handleBoxInput(index, e)"
                      class="gift-input"
                      min="0"
                      placeholder="Amount"
                      :disabled="convertBox"
                    />
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>