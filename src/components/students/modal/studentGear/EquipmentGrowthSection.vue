<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useStudentGearDisplay } from '@/composables/student/useStudentGearDisplay';
import { getMaxTierForTypeSync } from '@/consumables/utils/gearMaterialUtils';
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
  const maxTier = getMaxTierForTypeSync(type);
  if (value >= 1 && value <= maxTier) {
    const equipmentType = type as EquipmentType;
    const levels = props.equipmentLevels[equipmentType];
    if (!levels) return;

    const nextCurrent = value;
    const nextTarget = Math.max(levels.target, value);
    emit('update-equipment', equipmentType, nextCurrent, nextTarget);
  }
}

// Function to handle target level changes
function updateEquipmentTarget(type: string, value: number) {
  const maxTier = getMaxTierForTypeSync(type);
  if (value >= 1 && value <= maxTier) {
    const equipmentType = type as EquipmentType;
    const levels = props.equipmentLevels[equipmentType];
    if (!levels) return;

    const finalValue = Math.max(value, 1);
    const nextCurrent = Math.min(levels.current, finalValue);
    emit('update-equipment', equipmentType, nextCurrent, finalValue);
  }
}

// Function to check if target is at max level
function isTargetMaxLevel(target: number, type: string) {
  return target === getMaxTierForTypeSync(type);
}

// Exclusive gear computed with defaults
const gearCurrent = computed(() => props.exclusiveGearLevel?.current ?? 0);
const gearTarget = computed(() => props.exclusiveGearLevel?.target ?? 0);

function updateExclusiveGearCurrent(value: number) {
  const maxTier = props.maxUnlockableGearTier;
  if (value >= 0 && value <= maxTier) {
    const newTarget = Math.max(value, gearTarget.value);
    emit('update-exclusive-gear', value, newTarget);
  }
}

function updateExclusiveGearTarget(value: number) {
  if (value >= 0 && value <= 2) {
    const current = gearCurrent.value;
    if (current > value) {
      emit('update-exclusive-gear', value, value);
    } else {
      emit('update-exclusive-gear', current, value);
    }
  }
}
</script>

<template>
  <div class="equipment-growth-section">
    <h3 class="sr-only">{{ $t('gears') }}</h3>

    <div class="equipment-options-rail">
      <div class="equipment-toggle-item">
        <input
          type="checkbox"
          id="max-all-gears"
          name="max-all-gears"
          :checked="props.allGearsMaxed"
          @change="handleMaxAllGearsChange"
        />
        <label for="max-all-gears">{{ $t('maxAllGears') }}</label>
      </div>
      <div class="equipment-toggle-item">
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
      <div v-for="type in student?.Equipment" :key="type" class="equipment-item">
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
        
        <div class="equipment-icon">
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
      <div class="equipment-item" :class="{ 'placeholder-item': !hasExclusiveGear }">
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
        <div class="equipment-icon" :class="{ 'placeholder-icon': !hasExclusiveGear }">

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
.equipment-growth-section {
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

.equipment-options-rail {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin: 0 0 8px 0;
}

.equipment-toggle-item {
  position: relative;
}

.equipment-toggle-item input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.equipment-toggle-item label {
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

.equipment-toggle-item input[type="checkbox"]:checked + label {
  border-color: var(--accent-color);
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-color) 16%, var(--background-primary));
}

.equipment-toggle-item input[type="checkbox"]:focus-visible + label {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
}

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
}

.equipment-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  background-color: var(--background-primary);
  position: relative;
  padding: 0.5rem;
}

.equipment-icon {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--card-background);
  border-radius: 12px;
  position: relative;
}

.equipment-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.level-control {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.level-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: 0.25rem;
  font-weight: 600;
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
  padding: 0 0.5rem;
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

.max-level {
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
  font-size: 1rem;
  font-weight: bold;
}

@media (max-width: 500px) {
  .equipment-options-rail {
    width: 100%;
    justify-content: stretch;
    gap: 6px;
  }

  .equipment-toggle-item {
    flex: 1 1 0;
  }

  .equipment-toggle-item label {
    width: 100%;
  }
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
  border-radius: 12px;
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
