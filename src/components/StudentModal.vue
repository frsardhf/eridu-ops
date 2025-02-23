<script setup>
import { ref, computed } from 'vue';
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

const formData = ref({});
const currentBond = ref(1);
const bondXpTable = bondData.bond_xp;

// Calculate individual gift exp
function calculateExp(index, value) {
  if (!value || isNaN(value)) return 0;
  const totalExp = index.exp * parseInt(value);
  return totalExp;
}

// Calculate cumulative exp across all gifts
const calculateCumulativeExp = () => {
  let total = 0;
  Object.entries(formData.value).forEach(([giftId, value]) => {
    if (value && !isNaN(value)) {
      const giftIndex = props.student.Gifts[giftId];
      total += calculateExp(giftIndex, value);
    }
  });
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

const handleInput = (giftId, event) => {
  formData.value[giftId] = event.target.value;
  const giftIndex = props.student.Gifts[giftId];
  const currentGiftExp = calculateExp(giftIndex, formData.value[giftId]);
  console.log('Current gift exp:', currentGiftExp);
  console.log('Total cumulative exp:', totalCumulativeExp.value);
};

const handleBondInput = (event) => {
  const value = parseInt(event.target.value);
  if (!isNaN(value) && value >= 1 && value <= 100) {
    currentBond.value = value;
  }
};

const closeModal = () => {
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
        </div>

        <!-- Right Column - Gifts Grid -->
        <div class="right-column">
          <div class="gifts-grid">
            <div v-for="(item, index) in student.Gifts" 
                 :key="index"
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
                    type="text"
                    :value="formData[index]"
                    @input="(e) => handleInput(index, e)"
                    class="gift-input"
                    :placeholder="'Amount'"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button 
        @click="closeModal"
        class="close-button"
      >
        Close
      </button>
    </div>
  </div>
</template>