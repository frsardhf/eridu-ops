<script setup lang="ts">
import { PotentialType } from '../../../../types/upgrade';
import { $t } from '../../../../locales';
import { getLevelDisplayState, isTargetMaxLevel } from '../../../../composables/student/useStudentSkillDisplay';

const props = defineProps<{
  potentialLevels: Record<PotentialType, { current: number; target: number }>;
  allPotentialsMaxed: boolean;
  targetPotentialsMaxed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-potential', type: PotentialType, current: number, target: number): void;
  (e: 'toggle-max-potentials', checked: boolean): void;
  (e: 'toggle-max-target-potentials', checked: boolean): void;
}>();

// Constants
const MAX_POTENTIAL_LEVEL = 25;

// Static icon mapping for potential types
const POTENTIAL_ICONS: Record<PotentialType, string> = {
  attack: 'item_icon_workbook_potentialattack',
  maxhp: 'item_icon_workbook_potentialmaxhp',
  healpower: 'item_icon_workbook_potentialhealpower'
};

// Helper functions to derive properties from props (no internal state)
const getPotentialIcon = (potType: PotentialType): string => {
  return POTENTIAL_ICONS[potType];
};

const getPotentialName = (potType: PotentialType): string => {
  const names: Record<PotentialType, string> = {
    attack: $t('attack'),
    maxhp: $t('maxHp'),
    healpower: $t('healPower')
  };
  return names[potType];
};

// Handle potential type changes (using props directly, no internal state)
const updatePotentialCurrent = (type: PotentialType, value: number) => {
  if (value >= 0 && value <= MAX_POTENTIAL_LEVEL) {
    const currentTarget = props.potentialLevels[type]?.target ?? 0;
    // Ensure target is always >= current
    const newTarget = Math.max(value, currentTarget);
    emit('update-potential', type, value, newTarget);
  }
};

const updatePotentialTarget = (type: PotentialType, value: number) => {
  if (value >= 0 && value <= MAX_POTENTIAL_LEVEL) {
    const currentLevel = props.potentialLevels[type]?.current ?? 0;
    // Ensure current is always <= target
    if (currentLevel > value) {
      emit('update-potential', type, value, value);
    } else {
      emit('update-potential', type, currentLevel, value);
    }
  }
};

// Checkbox handlers
const handleMaxAllPotentialsChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  emit('toggle-max-potentials', checked);
};

const handleMaxTargetPotentialsChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  emit('toggle-max-target-potentials', checked);
};
</script>

<template>
  <div class="potential-section">
    <h3 class="sr-only">{{ $t('talent') }}</h3>

    <div class="potential-options-rail">
      <div class="potential-toggle-item">
        <input
          type="checkbox"
          id="max-all-potentials"
          name="max-all-potentials"
          :checked="props.allPotentialsMaxed"
          @change="handleMaxAllPotentialsChange"
        />
        <label for="max-all-potentials">{{ $t('maxAllPotentials') }}</label>
      </div>
      <div class="potential-toggle-item">
        <input
          type="checkbox"
          id="max-target-potentials"
          name="max-target-potentials"
          :checked="props.targetPotentialsMaxed"
          @change="handleMaxTargetPotentialsChange"
        />
        <label for="max-target-potentials">{{ $t('maxTargetPotentials') }}</label>
      </div>
    </div>

    <div class="potential-grid">
      <div
        v-for="potType in ['attack', 'maxhp', 'healpower'] as PotentialType[]"
        :key="potType"
        class="potential-item"
      >
        <!-- Current Level Control -->
        <div class="level-control">
          <div class="custom-number-input">
            <button
              class="control-button min-button"
              :class="{ disabled: (props.potentialLevels[potType]?.current ?? 0) <= 0 }"
              @click="updatePotentialCurrent(potType, 0)"
              :disabled="(props.potentialLevels[potType]?.current ?? 0) <= 0"
              :aria-label="$t('setMinLevel')"
            >
              <span>«</span>
            </button>
            <button
              class="control-button decrement-button"
              :class="{ disabled: (props.potentialLevels[potType]?.current ?? 0) <= 0 }"
              @click="updatePotentialCurrent(potType, (props.potentialLevels[potType]?.current ?? 0) - 1)"
              :disabled="(props.potentialLevels[potType]?.current ?? 0) <= 0"
              :aria-label="$t('decreaseLevel')"
            >
              <span>−</span>
            </button>
            <input
              type="number"
              :name="`potential-current-${potType}`"
              :value="props.potentialLevels[potType]?.current ?? 0"
              @input="(e) => updatePotentialCurrent(potType, parseInt((e.target as HTMLInputElement).value))"
              :min="0"
              :max="MAX_POTENTIAL_LEVEL"
              class="level-input current-level"
              :aria-label="`${$t('current')} ${getPotentialName(potType)}`"
            />
            <button
              class="control-button increment-button"
              :class="{ disabled: (props.potentialLevels[potType]?.current ?? 0) >= MAX_POTENTIAL_LEVEL }"
              @click="updatePotentialCurrent(potType, (props.potentialLevels[potType]?.current ?? 0) + 1)"
              :disabled="(props.potentialLevels[potType]?.current ?? 0) >= MAX_POTENTIAL_LEVEL"
              :aria-label="$t('increaseLevel')"
            >
              <span>+</span>
            </button>
            <button
              class="control-button max-button"
              :class="{ disabled: (props.potentialLevels[potType]?.current ?? 0) >= MAX_POTENTIAL_LEVEL }"
              @click="updatePotentialCurrent(potType, MAX_POTENTIAL_LEVEL)"
              :disabled="(props.potentialLevels[potType]?.current ?? 0) >= MAX_POTENTIAL_LEVEL"
              :aria-label="$t('setMaxLevel')"
            >
              <span>»</span>
            </button>
          </div>
        </div>

        <!-- Potential Icon -->
        <div class="potential-icon-container">
          <div class="potential-icon">
            <img
              :src="`https://schaledb.com/images/item/icon/${getPotentialIcon(potType)}.webp`"
              :alt="getPotentialName(potType)"
              class="potential-image"
            />
          </div>
        </div>

        <!-- Target Level Control -->
        <div class="level-control">
          <div class="custom-number-input">
            <button
              class="control-button min-button"
              :class="{ disabled: (props.potentialLevels[potType]?.target ?? 0) <= 0 }"
              @click="updatePotentialTarget(potType, 0)"
              :disabled="(props.potentialLevels[potType]?.target ?? 0) <= 0"
              :aria-label="$t('setMinLevel')"
            >
              <span>«</span>
            </button>
            <button
              class="control-button decrement-button"
              :class="{ disabled: (props.potentialLevels[potType]?.target ?? 0) <= 0 }"
              @click="updatePotentialTarget(potType, (props.potentialLevels[potType]?.target ?? 0) - 1)"
              :disabled="(props.potentialLevels[potType]?.target ?? 0) <= 0"
              :aria-label="$t('decreaseLevel')"
            >
              <span>−</span>
            </button>
            <input
              type="number"
              :name="`potential-target-${potType}`"
              :value="props.potentialLevels[potType]?.target ?? 0"
              @input="(e) => updatePotentialTarget(potType, parseInt((e.target as HTMLInputElement).value))"
              :min="0"
              :max="MAX_POTENTIAL_LEVEL"
              class="level-input target-level"
              :class="{ 'max-level': isTargetMaxLevel(props.potentialLevels[potType]?.target ?? 0, MAX_POTENTIAL_LEVEL) }"
              :aria-label="`${$t('target')} ${getPotentialName(potType)}`"
            />
            <button
              class="control-button increment-button"
              :class="{ disabled: (props.potentialLevels[potType]?.target ?? 0) >= MAX_POTENTIAL_LEVEL }"
              @click="updatePotentialTarget(potType, (props.potentialLevels[potType]?.target ?? 0) + 1)"
              :disabled="(props.potentialLevels[potType]?.target ?? 0) >= MAX_POTENTIAL_LEVEL"
              :aria-label="$t('increaseLevel')"
            >
              <span>+</span>
            </button>
            <button
              class="control-button max-button"
              :class="{ disabled: (props.potentialLevels[potType]?.target ?? 0) >= MAX_POTENTIAL_LEVEL }"
              @click="updatePotentialTarget(potType, MAX_POTENTIAL_LEVEL)"
              :disabled="(props.potentialLevels[potType]?.target ?? 0) >= MAX_POTENTIAL_LEVEL"
              :aria-label="$t('setMaxLevel')"
            >
              <span>»</span>
            </button>
          </div>
        </div>

        <!-- Potential Name -->
        <div class="potential-name">{{ getPotentialName(potType) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.potential-section {
  padding: 1rem;
  background-color: var(--card-background);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.potential-options-rail {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin: 0 0 8px 0;
}

.potential-toggle-item {
  position: relative;
}

.potential-toggle-item input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.potential-toggle-item label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.potential-toggle-item input[type="checkbox"]:checked + label {
  border-color: var(--accent-color);
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-color) 16%, var(--background-primary));
}

.potential-toggle-item input[type="checkbox"]:focus-visible + label {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
}

.potential-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.potential-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  background-color: var(--background-primary);
  padding: 0.5rem;
}

.level-control {
  width: 100%;
}

.custom-number-input {
  display: flex;
  align-items: center;
  background-color: var(--background-primary);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  height: 36px;
}

.level-input {
  flex: 1;
  height: 100%;
  padding: 0 0.25rem;
  border: none;
  background-color: transparent;
  color: var(--text-primary);
  text-align: center;
  font-weight: 600;
  font-size: 1rem;
  min-width: 0;
}

.level-input::-webkit-outer-spin-button,
.level-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.level-input:focus {
  background-color: rgba(0, 0, 0, 0.02);
}

.level-input.max-level {
  color: var(--accent-color, #4a8af4);
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 36px;
  border: none;
  background-color: transparent;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0;
  font-size: 1.1rem;
  transition: background-color 0.2s, color 0.2s;
  flex-shrink: 0;
}

.control-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--accent-color, #4a8af4);
}

.control-button:active {
  background-color: rgba(0, 0, 0, 0.1);
}

.control-button.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-button.disabled:hover {
  background-color: transparent;
  color: var(--text-primary);
}

.min-button,
.max-button {
  font-size: 0.9rem;
  font-weight: bold;
}

.potential-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.potential-icon {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--card-background);
  border-radius: 12px;
}

.potential-image {
  object-fit: contain;
}

.potential-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.2;
}

@media (max-width: 500px) {
  .potential-options-rail {
    width: 100%;
    justify-content: stretch;
    gap: 6px;
  }

  .potential-toggle-item {
    flex: 1 1 0;
  }

  .potential-toggle-item label {
    width: 100%;
  }

  .potential-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .control-button {
    width: 20px;
  }
}

@media (max-width: 350px) {
  .potential-grid {
    grid-template-columns: 1fr;
  }
}
</style>
