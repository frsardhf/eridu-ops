<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useStudentGearDisplay, getEquipmentTypeName } from '@/composables/useStudentGearDisplay';
import { getMaxTierForTypeSync } from '@/consumables/utils/gearMaterialUtils';
import { clampLevelPair } from '@/consumables/utils/upgradeUtils';
import { MAX_EXCLUSIVE_GEAR_LEVEL } from '@/consumables/constants/gameConstants';
import { $t } from '@/locales';
import { EquipmentType } from '@/types/gear';
import { StudentProps } from '@/types/student';
import NumberStepper from '@/components/modal/shared/NumberStepper.vue';

const props = defineProps<{
  student: StudentProps;
  equipmentLevels: Record<string, { current: number; target: number; }>;
  exclusiveGearLevel: { current?: number; target?: number };
  hasExclusiveGear: boolean;
  maxUnlockableGearTier: number;
  allGearsMaxed: boolean;
  targetGearsMaxed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-equipment', type: EquipmentType, current: number, target: number): void;
  (e: 'update-exclusive-gear', current: number, target: number): void;
  (e: 'toggle-max-gears', checked: boolean): void;
  (e: 'toggle-max-target-gears', checked: boolean): void;
}>();

const { 
  getEquipmentIconUrl, 
  getExclusiveGearIconUrl, 
  getExclusiveGearDisplay 
} = useStudentGearDisplay(
  toRef(() => props.student),
  () => ({}),
  toRef(() => props.equipmentLevels),
  toRef(() => props.exclusiveGearLevel)
);

const equipmentStates = computed(() =>
  (props.student?.Equipment || []).map(type => ({
    type,
    current: props.equipmentLevels[type]?.current || 1,
    target:  props.equipmentLevels[type]?.target  || 1,
    max:     getMaxTierForTypeSync(type),
  }))
);

const exclusiveGearState = computed(() => {
  const d = getExclusiveGearDisplay();
  return {
    current:    d.current,
    target:     d.target,
    maxCurrent: props.maxUnlockableGearTier,
  };
});

// Function to handle current level changes
function updateEquipmentCurrent(type: string, value: number) {
  const equipmentType = type as EquipmentType;
  const levels = props.equipmentLevels[equipmentType];
  if (!levels) return;
  const result = clampLevelPair(value, levels.target, 1, getMaxTierForTypeSync(type), false);
  if (result) emit('update-equipment', equipmentType, result.current, result.target);
}

// Function to handle target level changes
function updateEquipmentTarget(type: string, value: number) {
  const equipmentType = type as EquipmentType;
  const levels = props.equipmentLevels[equipmentType];
  if (!levels) return;
  const result = clampLevelPair(value, levels.current, 1, getMaxTierForTypeSync(type), true);
  if (result) emit('update-equipment', equipmentType, result.current, result.target);
}

function updateExclusiveGearCurrent(value: number) {
  const target = getExclusiveGearDisplay().target;
  const result = clampLevelPair(value, target, 0, props.maxUnlockableGearTier, false);
  if (result) emit('update-exclusive-gear', result.current, result.target);
}

function updateExclusiveGearTarget(value: number) {
  const current = getExclusiveGearDisplay().current;
  const result = clampLevelPair(value, current, 0, MAX_EXCLUSIVE_GEAR_LEVEL, true);
  if (result) emit('update-exclusive-gear', result.current, result.target);
}
</script>

<template>
  <div class="modal-section-card">
    <h3 class="sr-only">{{ $t('gears') }}</h3>

    <div class="modal-options-rail">
      <div class="modal-toggle-item">
        <input
          type="checkbox"
          id="max-all-gears"
          name="max-all-gears"
          :checked="props.allGearsMaxed"
          @change="(e) => emit('toggle-max-gears', (e.target as HTMLInputElement).checked)"
        />
        <label for="max-all-gears">{{ $t('maxAll') }}</label>
      </div>
      <div class="modal-toggle-item">
        <input
          type="checkbox"
          id="max-target-gears"
          name="max-target-gears"
          :checked="props.targetGearsMaxed"
          @change="(e) => emit('toggle-max-target-gears', (e.target as HTMLInputElement).checked)"
        />
        <label for="max-target-gears">{{ $t('maxTarget') }}</label>
      </div>
    </div>

    <div class="equipment-grid">
      <!-- Regular Equipment Items -->
      <div v-for="state in equipmentStates" :key="state.type" class="modal-grid-item equipment-item">
        <div class="level-control">
          <NumberStepper
            :value="state.current" :min="1" :max="state.max"
            :name="`${state.type.toLowerCase()}-current`"
            :aria-label="`${$t('currentEquipment')} ${getEquipmentTypeName(state.type)}`"
            @change="updateEquipmentCurrent(state.type, $event)"
          />
        </div>

        <div class="modal-item-icon">
          <img
            :src="getEquipmentIconUrl(state.type, state.current)"
            :alt="`${getEquipmentTypeName(state.type)} ${$t('tier')}${state.current}`"
            class="equipment-image"
            loading="lazy"
          />
        </div>

        <div class="level-control">
          <NumberStepper
            :value="state.target" :min="1" :max="state.max"
            variant="target"
            :name="`${state.type.toLowerCase()}-target`"
            :aria-label="`${$t('targetEquipment')} ${getEquipmentTypeName(state.type)}`"
            @change="updateEquipmentTarget(state.type, $event)"
          />
        </div>
      </div>

      <!-- Exclusive Gear -->
      <div class="modal-grid-item equipment-item" :class="{ 'placeholder-item': !hasExclusiveGear }">
        <!-- Current Level Control -->
        <div class="level-control" :class="{ 'placeholder-control': !hasExclusiveGear }">
          <NumberStepper
            :value="exclusiveGearState.current" :min="0" :max="exclusiveGearState.maxCurrent"
            name="exclusive-gear-current"
            :disabled="!hasExclusiveGear || exclusiveGearState.maxCurrent === 0"
            @change="updateExclusiveGearCurrent($event)"
          />
        </div>

        <!-- Gear Icon -->
        <div class="modal-item-icon" :class="{ 'placeholder-icon': !hasExclusiveGear }">

          <!-- Show gear image if student has gear -->
          <template v-if="hasExclusiveGear">
            <img
              :src="getExclusiveGearIconUrl()"
              :alt="student?.Gear?.Name || $t('exclusiveGear')"
              class="equipment-image"
              loading="lazy"
            />
            <!-- Lock overlay when bond too low -->
            <div v-if="maxUnlockableGearTier === 0" class="gear-lock-overlay">
              <svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span class="lock-text">{{ $t('bondRequired') }}</span>
            </div>
          </template>

          <!-- Empty placeholder if no gear data -->
          <template v-else>
            <svg class="lock-icon-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </template>

        </div>

        <!-- Target Level Control -->
        <div class="level-control" :class="{ 'placeholder-control': !hasExclusiveGear }">
          <NumberStepper
            :value="exclusiveGearState.target" :min="0" :max="MAX_EXCLUSIVE_GEAR_LEVEL"
            variant="target"
            name="exclusive-gear-target"
            :disabled="!hasExclusiveGear"
            @change="updateExclusiveGearTarget($event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
}

.equipment-item {
  position: relative;
}

/* Exclusive Gear Placeholder Styles */
.placeholder-item {
  border: 2px dashed var(--border-color);
  opacity: 0.6;
}

.placeholder-icon {
  background: transparent !important;
}

.lock-icon-placeholder {
  width: 32px;
  height: 32px;
  color: var(--text-secondary);
  opacity: 0.5;
}

.placeholder-control {
  opacity: 0.5;
}

.custom-number-input.disabled {
  pointer-events: none;
  opacity: 0.5;
}

.level-input.disabled {
  cursor: not-allowed;
}

/* Gear Lock Overlay (when bond too low) */
.gear-lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 10px;
  z-index: 3;
}

.lock-icon {
  width: 24px;
  height: 24px;
  color: white;
  opacity: 0.8;
}

.lock-text {
  font-size: 0.7rem;
  color: white;
  margin-top: 4px;
  text-align: center;
}
</style>
