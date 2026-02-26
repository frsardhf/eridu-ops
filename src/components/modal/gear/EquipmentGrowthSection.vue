<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useStudentGearDisplay } from '@/composables/useStudentGearDisplay';
import { getMaxTierForTypeSync } from '@/consumables/utils/gearMaterialUtils';
import { clampLevelPair } from '@/consumables/utils/upgradeUtils';
import { $t } from '@/locales';
import { EquipmentType } from '@/types/gear';
import { StudentProps } from '@/types/student';

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

const { getEquipmentIconUrl, getExclusiveGearIconUrl } = useStudentGearDisplay(
  toRef(() => props.student),
  () => ({}),
  toRef(() => props.equipmentLevels),
  toRef(() => props.exclusiveGearLevel)
);

// Checkbox handlers
const handleMaxAllGearsChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  emit('toggle-max-gears', checked);
};

const handleMaxTargetGearsChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked;
  emit('toggle-max-target-gears', checked);
};

// Equipment type mapping for display
const equipmentTypes = {
  Hat: $t('equipmentTypes.Hat'),
  Gloves: $t('equipmentTypes.Gloves'),
  Shoes: $t('equipmentTypes.Shoes'),
  Bag: $t('equipmentTypes.Bag'),
  Badge: $t('equipmentTypes.Badge'),
  Hairpin: $t('equipmentTypes.Hairpin'),
  Charm: $t('equipmentTypes.Charm'),
  Watch: $t('equipmentTypes.Watch'),
  Necklace: $t('equipmentTypes.Necklace')
};

type EquipmentKey = keyof typeof equipmentTypes;

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

// Function to check if target is at max level
function isTargetMaxLevel(target: number, type: string) {
  return target === getMaxTierForTypeSync(type);
}

// Exclusive gear computed with defaults
const gearCurrent = computed(() => props.exclusiveGearLevel?.current ?? 0);
const gearTarget = computed(() => props.exclusiveGearLevel?.target ?? 0);

function updateExclusiveGearCurrent(value: number) {
  const result = clampLevelPair(value, gearTarget.value, 0, props.maxUnlockableGearTier, false);
  if (result) emit('update-exclusive-gear', result.current, result.target);
}

function updateExclusiveGearTarget(value: number) {
  const result = clampLevelPair(value, gearCurrent.value, 0, 2, true);
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
          @change="handleMaxAllGearsChange"
        />
        <label for="max-all-gears">{{ $t('maxAllGears') }}</label>
      </div>
      <div class="modal-toggle-item">
        <input
          type="checkbox"
          id="max-target-gears"
          name="max-target-gears"
          :checked="props.targetGearsMaxed"
          @change="handleMaxTargetGearsChange"
        />
        <label for="max-target-gears">{{ $t('maxTargetGears') }}</label>
      </div>
    </div>

    <div class="equipment-grid">
      <!-- Regular Equipment Items -->
      <div v-for="type in student?.Equipment" :key="type" class="modal-grid-item equipment-item">
        <div class="level-control">
          <div class="custom-number-input">
            <button
              class="control-button min-button"
              :class="{ disabled: equipmentLevels[type]?.current <= 1 }"
              @click="updateEquipmentCurrent(type, 1)"
              :disabled="equipmentLevels[type]?.current <= 1"
              :aria-label="$t('setMinLevel')"
            >
              <span>«</span>
            </button>
            <button
              class="control-button decrement-button"
              :class="{ disabled: equipmentLevels[type]?.current <= 1 }"
              @click="updateEquipmentCurrent(type, (equipmentLevels[type]?.current || 1) - 1)"
              :disabled="equipmentLevels[type]?.current <= 1"
              :aria-label="$t('decreaseLevel')"
            >
              <span>−</span>
            </button>
            <input
              type="number"
              :name="`${type.toLowerCase()}-current`"
              :value="equipmentLevels[type]?.current || 1"
              @input="(e) => updateEquipmentCurrent(type, parseInt((e.target as HTMLInputElement).value))"
              :min="1"
              :max="getMaxTierForTypeSync(type)"
              class="level-input current-level"
              :aria-label="`${$t('currentEquipment')} ${equipmentTypes[type as EquipmentKey]}`"
            />
            <button
              class="control-button increment-button"
              :class="{ disabled: equipmentLevels[type]?.current >= getMaxTierForTypeSync(type) }"
              @click="updateEquipmentCurrent(type, (equipmentLevels[type]?.current || 1) + 1)"
              :disabled="equipmentLevels[type]?.current >= getMaxTierForTypeSync(type)"
              :aria-label="$t('increaseLevel')"
            >
              <span>+</span>
            </button>
            <button
              class="control-button max-button"
              :class="{ disabled: equipmentLevels[type]?.current >= getMaxTierForTypeSync(type) }"
              @click="updateEquipmentCurrent(type, getMaxTierForTypeSync(type))"
              :disabled="equipmentLevels[type]?.current >= getMaxTierForTypeSync(type)"
              :aria-label="$t('setMaxLevel')"
            >
              <span>»</span>
            </button>
          </div>
        </div>

        <div class="modal-item-icon">
          <img
            :src="getEquipmentIconUrl(type, equipmentLevels[type]?.current || 1)"
            :alt="`${equipmentTypes[type as EquipmentKey]} ${$t('tier')}${equipmentLevels[type]?.current || 1}`"
            class="equipment-image"
            loading="lazy"
          />
        </div>

        <div class="level-control">
          <div class="custom-number-input">
            <button
              class="control-button min-button"
              :class="{ disabled: equipmentLevels[type]?.target <= 1 }"
              @click="updateEquipmentTarget(type, 1)"
              :disabled="equipmentLevels[type]?.target <= 1"
              :aria-label="$t('setMinLevel')"
            >
              <span>«</span>
            </button>
            <button
              class="control-button decrement-button"
              :class="{ disabled: equipmentLevels[type]?.target <= 1 }"
              @click="updateEquipmentTarget(type, (equipmentLevels[type]?.target || 1) - 1)"
              :disabled="equipmentLevels[type]?.target <= 1"
              :aria-label="$t('decreaseLevel')"
            >
              <span>−</span>
            </button>
            <input
              type="number"
              :name="`${type.toLowerCase()}-target`"
              :value="equipmentLevels[type]?.target || 1"
              @input="(e) => updateEquipmentTarget(type, parseInt((e.target as HTMLInputElement).value))"
              :min="1"
              :max="getMaxTierForTypeSync(type)"
              class="level-input target-level"
              :class="{ 'max-level': isTargetMaxLevel(equipmentLevels[type]?.target || 1, type) }"
              :aria-label="`${$t('targetEquipment')} ${equipmentTypes[type as EquipmentKey]}`"
            />
            <button
              class="control-button increment-button"
              :class="{ disabled: equipmentLevels[type]?.target >= getMaxTierForTypeSync(type) }"
              @click="updateEquipmentTarget(type, (equipmentLevels[type]?.target || 1) + 1)"
              :disabled="equipmentLevels[type]?.target >= getMaxTierForTypeSync(type)"
              :aria-label="$t('increaseLevel')"
            >
              <span>+</span>
            </button>
            <button
              class="control-button max-button"
              :class="{ disabled: equipmentLevels[type]?.target >= getMaxTierForTypeSync(type) }"
              @click="updateEquipmentTarget(type, getMaxTierForTypeSync(type))"
              :disabled="equipmentLevels[type]?.target >= getMaxTierForTypeSync(type)"
              :aria-label="$t('setMaxLevel')"
            >
              <span>»</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Exclusive Gear -->
      <div class="modal-grid-item equipment-item" :class="{ 'placeholder-item': !hasExclusiveGear }">
        <!-- Current Level Control -->
        <div class="level-control" :class="{ 'placeholder-control': !hasExclusiveGear }">
          <div class="custom-number-input" :class="{ disabled: !hasExclusiveGear || maxUnlockableGearTier === 0 }">
            <button
              class="control-button min-button"
              :class="{ disabled: !hasExclusiveGear || gearCurrent <= 0 }"
              @click="updateExclusiveGearCurrent(0)"
              :disabled="!hasExclusiveGear || gearCurrent <= 0"
            ><span>«</span></button>
            <button
              class="control-button decrement-button"
              :class="{ disabled: !hasExclusiveGear || gearCurrent <= 0 }"
              @click="updateExclusiveGearCurrent(gearCurrent - 1)"
              :disabled="!hasExclusiveGear || gearCurrent <= 0"
            ><span>−</span></button>
            <input
              type="number"
              name="exclusive-gear-current"
              :value="gearCurrent"
              @input="(e) => updateExclusiveGearCurrent(parseInt((e.target as HTMLInputElement).value))"
              :min="0"
              :max="maxUnlockableGearTier"
              class="level-input current-level"
              :disabled="!hasExclusiveGear || maxUnlockableGearTier === 0"
            />
            <button
              class="control-button increment-button"
              :class="{ disabled: !hasExclusiveGear || gearCurrent >= maxUnlockableGearTier }"
              @click="updateExclusiveGearCurrent(gearCurrent + 1)"
              :disabled="!hasExclusiveGear || gearCurrent >= maxUnlockableGearTier"
            ><span>+</span></button>
            <button
              class="control-button max-button"
              :class="{ disabled: !hasExclusiveGear || gearCurrent >= maxUnlockableGearTier }"
              @click="updateExclusiveGearCurrent(maxUnlockableGearTier)"
              :disabled="!hasExclusiveGear || gearCurrent >= maxUnlockableGearTier"
            ><span>»</span></button>
          </div>
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
          <div class="custom-number-input" :class="{ disabled: !hasExclusiveGear }">
            <button
              class="control-button min-button"
              :class="{ disabled: !hasExclusiveGear || gearTarget <= 0 }"
              @click="updateExclusiveGearTarget(0)"
              :disabled="!hasExclusiveGear || gearTarget <= 0"
            ><span>«</span></button>
            <button
              class="control-button decrement-button"
              :class="{ disabled: !hasExclusiveGear || gearTarget <= 0 }"
              @click="updateExclusiveGearTarget(gearTarget - 1)"
              :disabled="!hasExclusiveGear || gearTarget <= 0"
            ><span>−</span></button>
            <input
              type="number"
              name="exclusive-gear-target"
              :value="gearTarget"
              @input="(e) => updateExclusiveGearTarget(parseInt((e.target as HTMLInputElement).value))"
              :min="0"
              :max="2"
              class="level-input target-level"
              :class="{ 'max-level': gearTarget === 2 }"
              :disabled="!hasExclusiveGear"
            />
            <button
              class="control-button increment-button"
              :class="{ disabled: !hasExclusiveGear || gearTarget >= 2 }"
              @click="updateExclusiveGearTarget(gearTarget + 1)"
              :disabled="!hasExclusiveGear || gearTarget >= 2"
            ><span>+</span></button>
            <button
              class="control-button max-button"
              :class="{ disabled: !hasExclusiveGear || gearTarget >= 2 }"
              @click="updateExclusiveGearTarget(2)"
              :disabled="!hasExclusiveGear || gearTarget >= 2"
            ><span>»</span></button>
          </div>
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
