<script setup lang="ts">
import { ref } from 'vue';
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

// State for collapsible section
const isExpanded = ref(false);

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

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
    <h3 class="section-title collapsible-header" @click="toggleExpand">
      <div class="collapsible-title">
        <span>{{ $t('talent') }}</span>
        <div class="options-container" v-if="isExpanded" @click.stop>
          <div class="max-all-container">
            <input
              type="checkbox"
              id="max-all-potentials"
              name="max-all-potentials"
              :checked="props.allPotentialsMaxed"
              @change="handleMaxAllPotentialsChange"
            />
            <label for="max-all-potentials">{{ $t('maxAllPotentials') }}</label>
          </div>
          <div class="max-all-container">
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
        <span
          class="collapsible-hint"
          v-if="!isExpanded"
        >({{ $t('clickTo') }} {{ $t('expand') }})</span>
      </div>
      <div class="expand-icon" :class="{ 'rotated': isExpanded }">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </h3>

    <div class="potential-grid" v-show="isExpanded">
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

          <!-- Level Display -->
          <div class="level-indicator">
            <template v-if="getLevelDisplayState(
              props.potentialLevels[potType]?.current ?? 0,
              props.potentialLevels[potType]?.target ?? 0,
              MAX_POTENTIAL_LEVEL
            ) === 'max'">
              <span class="max-level">{{ $t('max') }}</span>
            </template>
            <template v-else-if="getLevelDisplayState(
              props.potentialLevels[potType]?.current ?? 0,
              props.potentialLevels[potType]?.target ?? 0,
              MAX_POTENTIAL_LEVEL
            ) === 'same'">
              <span>Lv.{{ props.potentialLevels[potType]?.current ?? 0 }}</span>
            </template>
            <template v-else>
              <span class="current-level-text">Lv.{{ props.potentialLevels[potType]?.current ?? 0 }}</span>
              <span class="level-arrow">→</span>
              <span class="target-level-text" :class="{ 'max-level': isTargetMaxLevel(props.potentialLevels[potType]?.target ?? 0, MAX_POTENTIAL_LEVEL) }">
                {{ props.potentialLevels[potType]?.target ?? 0 }}
              </span>
            </template>
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
  margin-bottom: 15px;
  background-color: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.collapsible-header {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  transition: background-color 0.2s ease;
  margin: 0;
  font-size: 1.1em;
  color: var(--text-primary);
}

.collapsible-header:hover {
  background-color: rgba(var(--background-hover-rgb, 60, 60, 60), 0.15);
  border-radius: 4px;
}

.collapsible-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.collapsible-hint {
  font-size: 0.75em;
  font-weight: normal;
  color: var(--text-secondary);
  opacity: 0.7;
}

.expand-icon {
  display: flex;
  align-items: center;
}

.expand-icon.rotated svg {
  transform: rotate(180deg);
}

.options-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.max-all-container {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.85em;
  color: var(--text-secondary);
}

.max-all-container input[type="checkbox"] {
  cursor: pointer;
}

.max-all-container label {
  cursor: pointer;
  user-select: none;
}

.potential-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
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
  outline: none;
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
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--card-background);
  border-radius: 12px;
}

.potential-image {
  max-width: 115%;
  max-height: 115%;
  object-fit: contain;
}

.level-indicator {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.level-indicator .max-level {
  color: var(--accent-color, #4a8af4);
}

.level-indicator .level-arrow {
  margin: 0 2px;
  color: var(--text-secondary);
}

.level-indicator .target-level-text.max-level {
  color: var(--accent-color, #4a8af4);
}

.potential-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .potential-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 500px) {
  .collapsible-title {
    flex-direction: column;
    align-items: flex-start;
  }

  .options-container {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 0px;
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
