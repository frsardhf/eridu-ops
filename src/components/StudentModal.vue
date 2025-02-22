<script setup>
import { ref, computed } from 'vue';
import bondData from '../../src/data/data.json';

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

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 1000px;
  width: 75%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  text-align: center;
  margin-bottom: 20px;
}

.modal-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.student-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #eee;
}

.student-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
}

.bond-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #eee;
}

.gifts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(125px, 1fr));
  gap: 15px;
  height: auto;
  overflow-y: auto;
}

/* Rest of the styles remain unchanged */
.bond-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 15px;
}

.bond-display {
  display: flex;
  align-items: center;
  gap: 5px;
}

.bond-icon-container {
  position: relative;
  width: 50px;
  height: 50px;
}

.bond-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bond-number {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.bond-arrow {
  font-size: 24px;
  color: #4a5568;
}

.bond-input {
  width: 60px;
  padding: 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.total-exp {
  font-size: 1.2em;
  font-weight: bold;
  color: #4a5568;
  margin-top: 10px;
  text-align: center;
}

.gift-card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
}

.gift-icon {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin: 0 auto;
}

.gift-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gift-grade {
  display: flex;
  align-items: center;
  gap: 5px;
  justify-content: center;
}

.grade-icon {
  width: 40px;
}

.exp-value {
  font-size: 0.9em;
  font-weight: bold;
  color: #666;
}

.gift-exp-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
}

.gift-input {
  width: 80px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.bond-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.exp-info {
  font-size: 0.8em;
  color: #666;
  text-align: center;
}

.close-button {
  width: 100%;
  padding: 8px;
  background-color: #4a5568;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;
}

.close-button:hover {
  background-color: #2d3748;
}

@media (max-width: 768px) {
  .modal-grid {
    grid-template-columns: 1fr;
  }
  
  .left-column {
    max-width: 100%;
  }
}
</style>