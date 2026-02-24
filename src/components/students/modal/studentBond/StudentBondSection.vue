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
  <div class="bond-section" :class="{ 'bond-section-max': isMaxBond }">
    <div class="bond-summary-row">
      <div class="bond-input-inline">
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

      <div v-if="!isMaxBond" class="bond-progress-pill">
        <div class="bond-icon-container">
          <img
            src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
            alt="Current Bond"
            class="bond-icon"
          />
          <span class="bond-number">{{ bondState }}</span>
        </div>

        <template v-if="totalExp > 0">
          <div class="bond-arrow">→</div>

          <div class="bond-icon-container">
            <img
              src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
              alt="New Bond"
              class="bond-icon"
            />
            <span class="bond-number">{{ newBondLevel }}</span>
          </div>
        </template>
      </div>

      <div v-else class="bond-max-banner">
        <div class="max-bond-badge">
          <img
            src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
            alt="Max Bond"
            class="max-bond-icon"
          />
          <span class="max-bond-number">100</span>
        </div>
        <div class="max-banner-title">{{ $t('maxBond') }}</div>
      </div>
    </div>

    <div v-if="!isMaxBond && remainingXp > 0" class="bond-stats-row">
      <div class="stat-chip">
        {{ remainingXp }} {{ $t('expToNextLevel') }}
      </div>

      <div class="stat-chip strong-chip total-chip">
        {{ $t('totalExp') }}: {{ totalExp.toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.bond-section {
  background: var(--card-background);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bond-summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bond-input-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.bond-input-inline label {
  font-size: 0.82rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.bond-arrow {
  font-size: 0.95rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bond-progress-pill,
.bond-max-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-width: 190px;
  min-height: 40px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  padding: 3px 10px;
}

.bond-max-banner {
  border-color: rgba(255, 105, 180, 0.35);
  background: linear-gradient(
    90deg,
    rgba(255, 105, 180, 0.14) 0%,
    rgba(235, 51, 255, 0.14) 100%
  );
}

.bond-icon-container,
.max-bond-badge {
  position: relative;
  width: 34px;
  height: 34px;
}

.bond-icon,
.max-bond-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scale(1.18);
  transform-origin: center;
}

.bond-number,
.max-bond-number {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  font-weight: 700;
  font-size: 0.82rem;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.max-banner-title {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: linear-gradient(135deg, rgb(255, 105, 180), rgb(255, 146, 51));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.bond-input {
  width: 58px;
  height: 32px;
  padding: 4px 6px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  text-align: center;
  background-color: var(--input-color, var(--background-primary));
  color: var(--text-primary);
}

.bond-stats-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-chip {
  font-size: 0.82rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--background-primary);
  color: var(--text-secondary);
}

.strong-chip {
  font-weight: 700;
  color: var(--text-primary);
}

.total-chip {
  margin-left: auto;
}

.muted-chip {
  opacity: 0.85;
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
  .bond-section {
    padding: 10px;
  }

  .bond-summary-row {
    gap: 6px;
  }

  .bond-progress-pill,
  .bond-max-banner {
    min-width: 100%;
  }

  .total-chip {
    margin-left: 0;
  }
}
</style>
