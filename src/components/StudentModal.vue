<script setup>
import { ref, computed, onMounted } from 'vue';
import bondData from '../../src/data/data.json';
import '../styles/studentModal.css'

const props = defineProps({
  student: {
    type: Object,
    required: true
  },
  isVisible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const giftFormData = ref({});
const boxFormData = ref({});
const currentBond = ref(1);
const convertBox = ref(false);
const originalYellowStoneQuantity = ref(0);
const originalSrGiftQuantity = ref(0);
const bondXpTable = bondData.bond_xp;

// Reset form data when student changes
onMounted(() => {
  resetFormData();
});

function resetFormData() {
  giftFormData.value = {};
  boxFormData.value = {};
}

// Calculate individual item exp
function calculateItemExp(item, quantity) {
  if (!quantity || isNaN(quantity)) return 0;
  return item.exp * parseInt(quantity);
}

// Calculate cumulative exp across all gifts and boxes
const calculateCumulativeExp = () => {
  let total = 0;
  
  // Calculate exp from regular gifts
  if (props.student?.Gifts) {
    Object.entries(giftFormData.value).forEach(([giftId, quantity]) => {
      if (quantity && !isNaN(quantity)) {
        const gift = props.student.Gifts[giftId];
        if (gift) {
          total += calculateItemExp(gift, quantity);
        }
      }
    });
  }
  
  // Calculate exp from gift boxes
  if (props.student?.Boxes) {
    Object.entries(boxFormData.value).forEach(([boxId, quantity]) => {
      if (quantity && !isNaN(quantity)) {
        const box = props.student.Boxes[boxId];
        if (box) {
          total += calculateItemExp(box, quantity);
        }
      }
    });
  }
  
  return total;
};

// Computed property for total cumulative exp
const totalCumulativeExp = computed(() => {
  return calculateCumulativeExp();
});

// Compute new bond level based on current bond and cumulative exp
const newBondLevel = computed(() => {
  const currentXp = bondXpTable[currentBond.value - 1] || 0;
  const newXp = currentXp + totalCumulativeExp.value;
  
  // Find the highest bond level where required XP is less than or equal to newXp
  let newLevel = currentBond.value;
  while (newLevel < bondXpTable.length && bondXpTable[newLevel - 1] <= newXp) {
    newLevel++;
  }
  
  return Math.min(newLevel, 100); // Cap at level 100
});

// Compute remaining XP to next level
const remainingXp = computed(() => {
  if (newBondLevel.value >= 100) return 0;
  
  const currentXp = bondXpTable[currentBond.value - 1] || 0;
  const newXp = currentXp + totalCumulativeExp.value;
  const nextLevelXp = bondXpTable[newBondLevel.value - 1];
  
  return Math.max(0, nextLevelXp - newXp);
});

// Separate handlers for gifts and boxes
const handleGiftInput = (giftId, event) => {
  giftFormData.value[giftId] = event.target.value;
};

const handleBoxInput = (boxId, event) => {
  boxFormData.value[boxId] = event.target.value;
};

const handleBondInput = (event) => {
  const value = parseInt(event.target.value);
  if (!isNaN(value) && value >= 1 && value <= 100) {
    currentBond.value = value;
  }
};

const convertBoxes = () => {
  if (!props.student?.Boxes || props.student.Boxes.length === 0) {
    return; // Exit early
  }
  
  const yellowStoneQuantity = parseInt(boxFormData.value[0]) || 0;
  const srGiftMaterialQuantity = parseInt(boxFormData.value[1]) || 0;

  if (convertBox.value) {
    if (originalSrGiftQuantity.value === 0) {
    originalYellowStoneQuantity.value = yellowStoneQuantity;
    originalSrGiftQuantity.value = srGiftMaterialQuantity;
    }
    
    if (srGiftMaterialQuantity > 0 && yellowStoneQuantity > 0) {
      applyBoxConversion(srGiftMaterialQuantity, yellowStoneQuantity);
    }
  } else {
    // Restore original values when unchecked
    restoreOriginalBoxValues();
  }
};

// Function to apply box conversion
const applyBoxConversion = (materialQuantity, stoneQuantity) => {
  // Find the gift with highest exp with "SR" rarity
  const highestExpGift = findHighestExpSrGift();
  
  if (highestExpGift) {
    // Calculate how many boxes can be converted based on available materials
    // Each conversion requires 2 materials
    const maxConvertible = Math.floor(materialQuantity / 2);
    // Use the minimum of stone quantity and what materials allow
    const convertedQuantity = Math.min(stoneQuantity, maxConvertible);
    const leftoverQuantity = materialQuantity - (convertedQuantity * 2);
    boxFormData.value[0] = leftoverQuantity;
    boxFormData.value[1] = convertedQuantity;
    
    // Update the box exp and grade
    props.student.Boxes[0].name = "SR Gifts";
    props.student.Boxes[0].exp = 20;
    props.student.Boxes[0].grade = 1;
    props.student.Boxes[0].gift.Icon = "item_icon_favor_random";
    props.student.Boxes[1].name = "Selector SR Gifts";
    props.student.Boxes[1].exp = highestExpGift.exp;
    props.student.Boxes[1].grade = highestExpGift.grade;
    props.student.Boxes[1].gift.Icon = "item_icon_favor_selection";
  }
};

// Function to find highest exp SR gift
const findHighestExpSrGift = () => {
  if (!props.student?.Gifts) return null;
  
  let highestExpGift = null;
  
  props.student.Gifts.forEach((gift) => {
    if (gift.gift.Rarity === "SR" && (!highestExpGift || gift.exp > highestExpGift.exp)) {
      highestExpGift = gift;
    }
  });
  
  return highestExpGift;
};

// Function to restore original box values
const restoreOriginalBoxValues = () => {
  // Restore original quantity
  if (originalSrGiftQuantity.value > 0) {
    boxFormData.value[0] = originalYellowStoneQuantity.value;
    boxFormData.value[1] = originalSrGiftQuantity.value;
  }
  
  // Reset to original exp, grade, and icon
  props.student.Boxes[0].name = "Advanced Fusion Keystone";
  props.student.Boxes[0].exp = 0;
  props.student.Boxes[0].grade = 0;
  props.student.Boxes[0].gift.Icon = "item_icon_shiftingcraftitem_2";
  props.student.Boxes[1].name = "SR Gifts";
  props.student.Boxes[1].exp = 20;
  props.student.Boxes[1].grade = 1;
  props.student.Boxes[1].gift.Icon = "item_icon_favor_random";
  
  // Reset original quantity tracking
  originalYellowStoneQuantity.value = 0;
  originalSrGiftQuantity.value = 0;
};

const shouldShowGiftGrade = computed(() => {
  return (index) => {
    return (
      // Index 0: Keystone, Index 1: SR Gifts, Index 2: SSR Gifts
      // When checkbox is unchecked AND not keystone
      (!convertBox.value && index !== 0) || 
      // When checkbox is checked AND it's keystone AND both inputs have values
      (convertBox.value && index === 0 && boxFormData.value[0] > 0 && boxFormData.value[1] > 0) ||
      // When checkbox is checked AND it's not keystone AND its input has value
      (convertBox.value && index > 0 && boxFormData.value[index] > 0)
    );
  };
});

const closeModal = () => {
  resetFormData();
  emit('close');
};
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="text-xl font-bold">{{ student.Name }}</h2>
      </div>
      
      <div class="modal-grid">
        <!-- Left Column -->
        <div class="left-column">
          <!-- Student Image Section -->
          <div class="student-section">
            <img 
              :src="`https://schaledb.com/images/student/collection/${student.Id}.webp`"
              :alt="student.Name"
              class="student-image"
            />
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
                type="number"
                :value="currentBond"
                @input="handleBondInput"
                class="bond-input"
                min="1"
                max="100"
                placeholder="Current Bond"
              />
            </div>
            <div class="total-exp">
              Total Cumulative EXP: {{ totalCumulativeExp }}
            </div>
          </div>

          <div class="convert-box-section">
            <input
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
            <template v-if="student.Gifts && student.Gifts.length > 0">
              <div v-for="(item, index) in student.Gifts" 
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
                      :alt="item.grade"
                      class="grade-icon"
                    />
                    <span class="exp-value">{{ item.exp }} EXP</span>
                  </div>
                  <div class="gift-exp-info">
                    <input
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
            <template v-if="student.Boxes && student.Boxes.length > 0">
              <div v-for="(item, index) in student.Boxes" 
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
                      :alt="item.grade"
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