<script setup lang="ts">
import { PotentialType } from '../../../../types/upgrade';
import { $t } from '../../../../locales';
import { getLevelDisplayState, isTargetMaxLevel } from '../../../../composables/student/useStudentSkillDisplay';
import { clampLevelPair } from '@/consumables/utils/upgradeUtils';

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
  const result = clampLevelPair(value, props.potentialLevels[type]?.target ?? 0, 0, MAX_POTENTIAL_LEVEL, false);
  if (result) emit('update-potential', type, result.current, result.target);
};

const updatePotentialTarget = (type: PotentialType, value: number) => {
  const result = clampLevelPair(value, props.potentialLevels[type]?.current ?? 0, 0, MAX_POTENTIAL_LEVEL, true);
  if (result) emit('update-potential', type, result.current, result.target);
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
  <div class="modal-section-card">
    <h3 class="sr-only">{{ $t('talent') }}</h3>

    <div class="modal-options-rail">
      <div class="modal-toggle-item">
        <input
          type="checkbox"
          id="max-all-potentials"
          name="max-all-potentials"
          :checked="props.allPotentialsMaxed"
          @change="handleMaxAllPotentialsChange"
        />
        <label for="max-all-potentials">{{ $t('maxAllPotentials') }}</label>
      </div>
      <div class="modal-toggle-item">
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
        class="modal-grid-item"
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
          <div class="modal-item-icon">
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
.potential-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.potential-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
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
  .potential-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 350px) {
  .potential-grid {
    grid-template-columns: 1fr;
  }
}
</style>
