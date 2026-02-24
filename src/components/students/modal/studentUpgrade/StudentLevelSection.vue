<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { $t } from '../../../../locales';

const props = defineProps<{
  characterLevels: { current: number; target: number; },
  totalXpNeeded: number
}>();

const emit = defineEmits<(
  e: 'update-level', current: number, target: number
) => void>();

const levelState = ref({
  current: props.characterLevels.current,
  target: props.characterLevels.target,
});

// Track temporary display values (can be empty string during editing)
const inputDisplayValues = ref({
  current: props.characterLevels.current.toString(),
  target: props.characterLevels.target.toString(),
});

watch(() => props.characterLevels, (newVal) => {
  if (newVal) {
    levelState.value.current = newVal.current;
    levelState.value.target = newVal.target;
    inputDisplayValues.value.current = newVal.current.toString();
    inputDisplayValues.value.target = newVal.target.toString();
  }
}, { deep: true, immediate: true });

// Handle input changes during typing
const handleInput = (event: Event, isTarget: boolean) => {
  const input = event.target as HTMLInputElement;
  const rawValue = input.value;

  // Update display value (allow empty during typing)
  if (isTarget) {
    inputDisplayValues.value.target = rawValue;
  } else {
    inputDisplayValues.value.current = rawValue;
  }

  // If empty, don't update levelState yet (will be handled on blur)
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
  processLevelUpdate(value, isTarget);
};

// Handle blur - ensure valid value when leaving input
const handleBlur = (event: Event, isTarget: boolean) => {
  const input = event.target as HTMLInputElement;
  const rawValue = input.value.trim();

  let value: number;

  // If empty or invalid, default to appropriate value
  if (rawValue === '' || rawValue === '-' || isNaN(parseInt(rawValue, 10))) {
    if (isTarget) {
      // Default target to current level when empty
      value = levelState.value.current;
    } else {
      // Default current to 1 when empty
      value = 1;
    }
  } else {
    value = parseInt(rawValue, 10);
  }

  processLevelUpdate(value, isTarget);

  // Sync input display with actual state
  if (isTarget) {
    inputDisplayValues.value.target = levelState.value.target.toString();
    input.value = levelState.value.target.toString();
  } else {
    inputDisplayValues.value.current = levelState.value.current.toString();
    input.value = levelState.value.current.toString();
  }
};

// Centralized logic for processing level updates
const processLevelUpdate = (value: number, isTarget: boolean) => {
  if (isTarget) {
    // Target must be between current and 90
    value = Math.max(levelState.value.current, Math.min(90, value));
    levelState.value.target = value;
  } else {
    // Current must be between 1 and 90
    value = Math.max(1, Math.min(90, value));
    levelState.value.current = value;
    
    // If target is now less than current, bump it up
    if (levelState.value.target < value) {
      levelState.value.target = value;
      inputDisplayValues.value.target = value.toString();
    }
  }

  emit('update-level', levelState.value.current, levelState.value.target);
};

// Prevent invalid characters (e, +, -, .)
const handleKeydown = (event: KeyboardEvent) => {
  if (['e', 'E', '+', '-', '.'].includes(event.key)) {
    event.preventDefault();
  }
};

const isMaxLevel = computed(() => props.characterLevels.current === 90);
</script>

<template>
  <div class="student-level-section" :class="{ 'student-level-section-max': isMaxLevel }">
    <div class="student-level-summary-row">
      <div class="student-level-input-inline">
        <label for="current-level-input">{{ $t('currentLevel') }}</label>
        <input
          id="current-level-input"
          name="current-level-input"
          type="number"
          :value="inputDisplayValues.current"
          @input="(e) => handleInput(e, false)"
          @blur="(e) => handleBlur(e, false)"
          @keydown="handleKeydown"
          class="student-level-input"
          min="1"
          max="90"
        />
      </div>

      <div v-if="!isMaxLevel" class="student-level-progress-pill">
        <span class="student-level-label">LEVEL</span>
        <span class="student-level-value">{{ levelState.current }}</span>
        <div class="student-level-arrow">→</div>
        <span class="student-level-value target">{{ levelState.target }}</span>
      </div>

      <div v-else class="student-level-max-banner">
        <span class="student-level-label">LEVEL</span>
        <span class="student-level-value">90</span>
        <span class="student-level-max-title">{{ $t('max') }}</span>
      </div>

      <div v-if="!isMaxLevel" class="student-level-input-inline">
        <label for="target-level-input">{{ $t('targetLevel') }}</label>
        <input
          id="target-level-input"
          name="target-level-input"
          type="number"
          :value="inputDisplayValues.target"
          @input="(e) => handleInput(e, true)"
          @blur="(e) => handleBlur(e, true)"
          @keydown="handleKeydown"
          class="student-level-input"
          min="1"
          max="90"
        />
      </div>
    </div>

    <div v-if="!isMaxLevel" class="student-level-stats-row">
      <div class="student-level-chip student-level-chip-strong student-level-chip-exp">
        {{ $t('xpRequired') }}: {{ totalXpNeeded.toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.upgrade-level-panel {
  width: 100%;
  max-width: none !important;
  align-self: stretch !important;
}

.student-level-section {
  background: var(--card-background);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.student-level-summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.student-level-input-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.student-level-input-inline label {
  font-size: 0.82rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.student-level-input {
  width: 58px;
  height: 32px;
  padding: 4px 6px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  text-align: center;
  background-color: var(--input-color, var(--background-primary));
  color: var(--text-primary);
  appearance: textfield;
  -moz-appearance: textfield;
}

.student-level-input::-webkit-outer-spin-button,
.student-level-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.student-level-progress-pill,
.student-level-max-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-width: 200px;
  min-height: 42px;
  border-radius: 999px;
  border: 1px solid #4e7eff;
  background: var(--background-primary);
  padding: 4px 12px;
  border-color: rgba(255, 201, 51, 0.35);
  background: linear-gradient(
    135deg,
    rgba(255, 201, 51, 0.24),
    rgba(51, 197, 255, 0.22)
  );
}

.student-level-label {
  font-style: italic;
  font-weight: 700;
  font-size: 0.74rem;
  color: var(--text-secondary);
  letter-spacing: 0.45px;
}

.student-level-value {
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--text-primary);
  line-height: 1;
}

.student-level-value.target {
  color: var(--accent-color);
}

.student-level-arrow {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.student-level-max-title {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.45px;
  text-transform: uppercase;
  color: rgba(51, 105, 255, 0.9);
}

.student-level-stats-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.student-level-chip {
  font-size: 0.82rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--background-primary);
  color: var(--text-secondary);
}

.student-level-chip-strong {
  font-weight: 700;
  color: var(--text-primary);
}

.student-level-chip-exp {
  margin-left: auto;
}

.student-level-chip-muted {
  opacity: 0.85;
}

@media (max-width: 1024px) {
  .student-level-chip-exp {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .student-level-summary-row {
    gap: 6px;
  }

  .student-level-progress-pill,
  .student-level-max-banner {
    min-width: 100%;
  }
}
</style>
