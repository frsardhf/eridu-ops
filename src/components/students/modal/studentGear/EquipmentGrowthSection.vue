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
    <h3 class="section-title">
      {{ $t('gears') }}
      <div class="options-container">
        <div class="max-all-container">
          <input
            type="checkbox"
            id="max-all-gears"
            name="max-all-gears"
            :checked="props.allGearsMaxed"
            @change="handleMaxAllGearsChange"
          />
          <label for="max-all-gears">{{ $t('maxAllGears') }}</label>
        </div>
        <div class="max-all-container">
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
    </h3>

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
          <div class="equipment-type-badge">{{ equipmentTypes[type as EquipmentKey] }}</div>
          <img 
            :src="getEquipmentIconUrl(type, equipmentLevels[type]?.current || 1)"
            :alt="`${equipmentTypes[type as EquipmentKey]} ${$t('tier')}${equipmentLevels[type]?.current || 1}`"
            class="equipment-image"
            loading="lazy"
          />
          <div class="tier-indicator">
            {{ $t('tier') }}{{ equipmentLevels[type]?.current || 1 }}
            <span class="tier-target" v-if="equipmentLevels[type]?.current !== equipmentLevels[type]?.target">
              → {{ $t('tier') }}{{ equipmentLevels[type]?.target || 1 }}
            </span>
          </div>
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
          <div class="equipment-type-badge" :class="{ 'placeholder-badge': !hasExclusiveGear }">
            {{ $t('exclusiveGear') }}
          </div>

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

          <div class="tier-indicator" :class="{ 'placeholder-tier': !hasExclusiveGear }">
            <template v-if="!hasExclusiveGear">
              {{ $t('comingSoon') }}
            </template>
            <template v-else-if="gearCurrent === 0">
              {{ $t('locked') }}
            </template>
            <template v-else>
              {{ $t('tier') }}{{ gearCurrent }}
              <span class="tier-target" v-if="gearCurrent !== gearTarget">
                → {{ $t('tier') }}{{ gearTarget }}
              </span>
            </template>
          </div>
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
  margin-bottom: 15px;
  background-color: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 1rem 0;
  font-size: 1.1em;
  color: var(--text-primary);
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

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
}

.equipment-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
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
  margin: 0.5rem 0;
}

.equipment-type-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--accent-color, #4a8af4);
  color: white;
  padding: 0.25rem 0.75rem;
  width: max-content;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 2;
}

.equipment-image {
  max-width: 85%;
  max-height: 85%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.equipment-icon:hover .equipment-image {
  transform: scale(1.05);
}

.tier-indicator {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--background-primary);
  color: var(--text-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.tier-target {
  color: var(--accent-color, #4a8af4);
  font-weight: 700;
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
  width: 28px;
  height: 36px;
  border: none;
  background-color: transparent;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0;
  font-size: 1.25rem;
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

@media (max-width: 768px) {
  .equipment-grid {
    grid-template-columns: repeat(auto-fit, minmax(125px, 1fr));
    gap: 1rem;
  }
  
  .equipment-icon {
    width: 80px;
    height: 80px;
  }
  
  .equipment-type-badge,
  .tier-indicator {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
  }
}

@media (max-width: 500px) {
  .section-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .options-container {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 0px;
  }
}

@media (max-width: 480px) {
  .equipment-growth-section {
    padding: 1rem;
  }

  .equipment-item {
    padding: 0.75rem;
  }

  .equipment-icon {
    width: 70px;
    height: 70px;
  }

  .control-button {
    width: 24px;
  }

  .min-button,
  .max-button {
    font-size: 0.875rem;
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

.placeholder-badge {
  background-color: var(--text-secondary) !important;
}

.lock-icon-placeholder {
  width: 32px;
  height: 32px;
  color: var(--text-secondary);
  opacity: 0.5;
}

.placeholder-tier {
  color: var(--text-secondary);
  font-style: italic;
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
