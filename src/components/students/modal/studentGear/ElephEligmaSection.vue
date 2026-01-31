<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { $t } from '../../../../locales';
import { ModalProps } from '../../../../types/student';
import { getStudentData } from '../../../../consumables/stores/studentStore';

const props = defineProps<{
  student: ModalProps | null;
  elephNeeded: number;
  gradeInfos: { owned?: number; price?: number; purchasable?: number; };
}>();

const emit = defineEmits<{
  (e: 'update-info', owned: number, price: number, purchasable: number): void;
}>();

// Local state to track levels
const gradeState = ref({
  owned: props.gradeInfos?.owned || 0,
  price: props.gradeInfos?.price || 1,
  purchasable: props.gradeInfos?.purchasable || 20
});

const studentData = computed(() => {
  if (!props.student?.Id) return null;
  return getStudentData(props.student.Id);
});

// Computed property for ElephIcon
const elephIcon = computed(() => {
  // Special case for student ID 10099 to use elephicon from 10098
  if (String(props.student?.Id) === '10099') {
    return 'https://schaledb.com/images/item/icon/item_icon_secretstone_ch0258.webp';
  }
  if (!props.student?.ElephIcon) return '';
  return `https://schaledb.com/images/item/icon/${props.student.ElephIcon}.webp`;
});

// Watch for prop changes to update local state
watch(() => props.gradeInfos, (newVal) => {
  if (newVal) {
    gradeState.value.owned = newVal.owned ?? 0;
    gradeState.value.price = newVal.price ?? 1;
    gradeState.value.purchasable = newVal.purchasable ?? 20;
  }
}, { deep: true, immediate: true });

// Watch for changes in the store
watch(() => studentData.value, () => {
}, { deep: true });

const gradeLevel = computed(() => {
  return studentData.value?.gradeLevels?.current || 0;
});

const isMaxGrade = computed(() => {
  return gradeLevel.value === 9;
});

// Update handlers
const updateValue = (event: Event, field: 'owned' | 'price' | 'purchasable') => {
  const input = event.target as HTMLInputElement;
  const value = parseInt(input.value) || 0;
  
  // Define min and max values for each field
  const limits = {
    owned: { min: 0, max: 520 },
    price: { min: 1, max: 5 },
    purchasable: { min: 1, max: 20 }
  };
  
  // Clamp the value based on field limits
  const clampedValue = Math.max(limits[field].min, Math.min(limits[field].max, value));
  gradeState.value[field] = clampedValue;
  
  // Emit the complete state
  emit('update-info', gradeState.value.owned, gradeState.value.price, gradeState.value.purchasable);
};
</script>

<template>
  <div class="eleph-eligma-card">
    <!-- Maxed Version -->
    <div v-if="isMaxGrade" class="card-section maxed-section">
      <div class="maxed-content">
        <div class="maxed-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" class="max-star-icon">
            <path fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/>
          </svg>
        </div>
        <div class="maxed-text">
          <h3 class="maxed-title">{{ $t('maxGrade') }}</h3>
          <p class="maxed-subtitle">{{ $t('noUpgradeNeeded') }}</p>
        </div>
      </div>
      <div class="maxed-decorative">
        <div class="shine-effect"></div>
      </div>
    </div>

    <!-- Normal Version -->
    <div v-else class="card-section">
      <div class="icons-row">
        <div class="icon-container">
          <img 
            :src="elephIcon"
            alt="Eleph"
            class="resource-icon"
          />
        </div>
        <div class="icon-container">
          <img 
            src="https://schaledb.com/images/item/icon/item_icon_secretstone.webp"
            alt="Eligma"
            class="resource-icon"
          />
        </div>
      </div>
      
      <div class="input-group">
        <div class="input-container">
          <label for="eleph-owned-input" class="input-label">{{ $t('elephsOwned') }}</label>
          <input
            id="eleph-owned-input"
            type="number"
            :value="gradeState.owned"
            @input="(e) => updateValue(e, 'owned')"
            class="resource-input-container"
            min="0"
            max="520"
          />
        </div>
        <div class="input-container">
          <label for="eligma-price-input" class="input-label">{{ $t('price') }}</label>
          <input
            id="eligma-price-input"
            type="number"
            :value="gradeState.price"
            @input="(e) => updateValue(e, 'price')"
            class="resource-input-container"
            min="1"
            max="5"
          />
        </div>
        <div class="input-container">
          <label for="eligma-purchasable-input" class="input-label">{{ $t('purchasable') }}</label>
          <input
            id="eligma-purchasable-input"
            type="number"
            :value="gradeState.purchasable"
            @input="(e) => updateValue(e, 'purchasable')"
            class="resource-input-container"
            min="1"
            max="20"
          />
        </div>
      </div>
      
      <div class="resource-info-group">
        <div class="resource-info">
          {{ $t('elephsNeeded') }}: {{ elephNeeded }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.eleph-eligma-card {
  align-self: center;
  background: var(--card-background);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color);
  margin-bottom: 15px;
  box-sizing: border-box;
}

.card-section {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: var(--background-primary);
  border-radius: 8px;
  gap: 16px;
}

/* Maxed Section Styles */
.maxed-section {
  position: relative;
  background: linear-gradient(135deg, 
    rgba(255, 201, 51, 0.1), 
    rgba(51, 200, 255, 0.1),
    rgba(255, 201, 51, 0.05)
  );
  border: 2px solid transparent;
  background-clip: padding-box;
  min-height: 120px;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.maxed-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 2;
  position: relative;
}

.maxed-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.max-star-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, rgb(255, 201, 51), hsl(192, 100%, 60%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 4px rgba(255, 201, 51, 0.3));
  animation: pulse 2s ease-in-out infinite;
}

.maxed-text {
  text-align: center;
}

.maxed-title {
  font-size: 1.2em;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(135deg, rgb(255, 201, 51), hsl(192, 100%, 60%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.maxed-subtitle {
  font-size: 0.9em;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
  opacity: 0.8;
}

.maxed-decorative {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.shine-effect {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.05) 40%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 60%,
    transparent 70%
  );
  animation: shine 4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes shine {
  0% { transform: rotate(0deg) translate(-100%, -100%); }
  100% { transform: rotate(360deg) translate(-100%, -100%); }
}

/* Normal Section Styles */
.icons-row {
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
}

.resource-icon {
  width: 100%;
  height: 100%;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
}

.input-container {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.input-label {
  font-size: 0.9em;
  color: var(--text-secondary);
  font-weight: 500;
  text-align: left;
  justify-self: start;
}

.resource-input-container {
  width: 50px;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  text-align: center;
  background-color: var(--input-background, var(--background-primary));
  color: var(--text-primary);
  font-size: 1em;
  transition: border-color 0.2s ease;
  justify-self: end;
  
  /* Hide number input arrows */
  appearance: textfield;
  -moz-appearance: textfield;
}

/* Hide number input arrows for Webkit browsers */
.resource-input-container::-webkit-outer-spin-button,
.resource-input-container::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.resource-input-container:focus {
  outline: none;
  border-color: var(--accent-color, #4a90e2);
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.resource-info-group {
  display: flex;
  justify-content: space-between;
}

.resource-info {
  font-size: 0.9em;
  color: var(--text-primary);
  text-align: center;
  padding: 8px 12px;
  background: var(--card-background);
  border-radius: 6px;
  font-weight: bold;
  border: 1px solid var(--border-color);
  flex: 1;
}

/* Responsive design */
@media (max-width: 480px) {
  .input-group {
    max-width: 100%;
  }
  
  .maxed-title {
    font-size: 1.1em;
  }
  
  .max-star-icon {
    width: 35px;
    height: 35px;
  }
}

@media (max-width: 320px) {
  .input-container {
    grid-template-columns: 1fr;
    gap: 6px;
    text-align: center;
  }
  
  .input-label {
    justify-self: center;
  }
  
  .resource-input-container {
    justify-self: center;
  }
}
</style>