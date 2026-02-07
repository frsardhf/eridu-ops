<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { $t } from '../../../../locales';

const props = defineProps<{
  currentBond: number,
  newBondLevel: number,
  remainingXp: number,
  totalExp: number
}>();

const emit = defineEmits<(e: 'update-bond', value: number) => void>();

// Local state for the actual bond value
const bondState = ref(props.currentBond);

// Separate display value for input (can be empty during typing)
const inputDisplayValue = ref(props.currentBond.toString());

// Sync with prop changes from parent
watch(() => props.currentBond, (newVal) => {
  bondState.value = newVal;
  inputDisplayValue.value = newVal.toString();
}, { immediate: true });

const isMaxBond = computed(() => bondState.value === 100);

// Handle input changes during typing
const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const rawValue = input.value;

  // Update display value (allow empty during typing)
  inputDisplayValue.value = rawValue;

  // If empty or just a dash, don't update state yet (will be handled on blur)
  if (rawValue === '' || rawValue === '-') {
    return;
  }

  // Remove leading zeros and parse
  const cleanedValue = rawValue.replace(/^0+(?=\d)/, '');
  const value = parseInt(cleanedValue, 10);

  // Handle NaN - don't update state
  if (isNaN(value)) {
    return;
  }

  // Apply clamping and update state
  processBondUpdate(value);
};

// Handle blur - ensure valid value when leaving input
const handleBlur = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const rawValue = input.value.trim();

  let value: number;

  // If empty or invalid, default to 1
  if (rawValue === '' || rawValue === '-' || isNaN(parseInt(rawValue, 10))) {
    value = 1;
  } else {
    value = parseInt(rawValue, 10);
  }

  processBondUpdate(value);

  // Sync input display with actual state
  inputDisplayValue.value = bondState.value.toString();
  input.value = bondState.value.toString();
};

// Centralized logic for processing bond updates
const processBondUpdate = (value: number) => {
  // Clamp between 1 and 100
  value = Math.max(1, Math.min(100, value));
  bondState.value = value;
  emit('update-bond', value);
};

// Prevent invalid characters (e, +, -, .)
const handleKeydown = (event: KeyboardEvent) => {
  if (['e', 'E', '+', '-', '.'].includes(event.key)) {
    event.preventDefault();
  }
};
</script>

<template>
  <div class="bond-section">
    <!-- Maxed Version -->
    <div v-if="isMaxBond" class="maxed-section">
      <div class="maxed-content">
        <div class="maxed-icon">
          <div class="max-bond-badge">
            <img
              src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
              alt="Max Bond"
              class="max-bond-icon"
            />
            <span class="max-bond-number">100</span>
          </div>
        </div>
        <div class="maxed-text">
          <h3 class="maxed-title">{{ $t('maxBond') }}</h3>
          <p class="maxed-subtitle">{{ $t('noUpgradeNeeded') }}</p>
        </div>
      </div>

      <!-- Keep the bond input for maxed version -->
      <div class="maxed-input-container">
        <input
          id="bond-input-maxed"
          name="bond-input"
          type="number"
          :value="inputDisplayValue"
          @input="handleInput"
          @blur="handleBlur"
          @keydown="handleKeydown"
          class="bond-input maxed-input"
          min="1"
          max="100"
        />
      </div>

      <div class="maxed-decorative">
        <div class="shine-effect"></div>
      </div>
    </div>

    <!-- Normal Version -->
    <template v-else>
      <!-- Bond input moved to the top -->
      <div class="bond-input-container">
        <label for="bond-input">{{ $t('currentBond') }}</label>
        <input
          id="bond-input"
          name="bond-input"
          type="number"
          :value="inputDisplayValue"
          @input="handleInput"
          @blur="handleBlur"
          @keydown="handleKeydown"
          class="bond-input"
          min="1"
          max="100"
        />
      </div>

      <div class="bond-container">
        <div class="bond-display">
          <div class="bond-icon-container">
            <img
              src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
              alt="Current Bond"
              class="bond-icon"
            />
            <span class="bond-number">{{ bondState }}</span>
          </div>
        </div>

        <div class="bond-arrow">→</div>

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

      <div class="exp-info" v-if="remainingXp > 0">
        {{ remainingXp }} {{ $t('expToNextLevel') }}
      </div>

      <div class="total-exp">
        {{ $t('totalExp') }}: {{ totalExp.toLocaleString() }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.bond-section {
  align-self: center;
  background: var(--card-background);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color);
}

.section-title {
  font-size: 1.1em;
  font-weight: bold;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

.bond-input-container {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 15px;
}

.bond-input-container label {
  font-size: 0.9em;
  color: var(--text-secondary);
}

.exp-info {
  font-size: 0.9em;
  color: var(--text-primary);
  text-align: center;
  margin: 10px 0 0 0;
}

.bond-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.bond-display {
  display: flex;
  align-items: center;
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
  transform: translate(-50%, -60%);
  font-weight: bold;
  font-size: medium;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.bond-arrow {
  font-size: 24px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.bond-input {
  width: 60px;
  padding: 4px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
  background-color: var(--input-color, var(--background-primary));
}

.total-exp {
  font-size: 1.1em;
  font-weight: bold;
  color: var(--text-primary);
  margin-top: 15px;
  text-align: center;
  background: var(--background-primary);
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Maxed Section Styles */
.maxed-section {
  position: relative;
  background: linear-gradient(135deg,
    rgba(255, 105, 180, 0.1),
    rgba(255, 201, 51, 0.1),
    rgba(255, 105, 180, 0.05)
  );
  border: 2px solid transparent;
  background-clip: padding-box;
  border-radius: 8px;
  padding: 16px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  gap: 15px;
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

.max-bond-badge {
  position: relative;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.max-bond-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(255, 105, 180, 0.5));
  animation: pulse 2s ease-in-out infinite;
}

.max-bond-number {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  font-weight: bold;
  font-size: 0.85em;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.maxed-text {
  text-align: center;
}

.maxed-title {
  font-size: 1.2em;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(135deg, rgb(255, 105, 180), rgb(255, 201, 51));
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

.maxed-input-container {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
  z-index: 2;
  position: relative;
}

.maxed-input-container label {
  font-size: 0.9em;
  color: var(--text-secondary);
  font-weight: 500;
}

.maxed-input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 105, 180, 0.3);
  backdrop-filter: blur(5px);
}

.maxed-input:focus {
  outline: none;
  border-color: rgb(255, 105, 180);
  box-shadow: 0 0 0 2px rgba(255, 105, 180, 0.2);
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

/* Hide number input arrows */
.bond-input::-webkit-outer-spin-button,
.bond-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.bond-input {
  appearance: textfield;
  -moz-appearance: textfield;
}

/* Responsive design */
@media (max-width: 480px) {
  .maxed-title {
    font-size: 1.1em;
  }

  .max-bond-badge {
    width: 45px;
    height: 45px;
  }

  .max-bond-number {
    font-size: 0.8em;
  }

  .maxed-section {
    min-height: 120px;
    padding: 15px;
  }
}
</style>
