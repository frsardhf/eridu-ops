<script setup lang="ts">
import { ModalProps } from '../../../../types/student';
import { EquipmentType } from '../../../../types/gear';
import { getAllEquipmentFromCache } from '../../../../consumables/stores/resourceCacheStore';
import { $t } from '../../../../locales';

const props = defineProps<{
  student: ModalProps | null;
  equipmentLevels: Record<string, { current: number; target: number; }>;
  allGearsMaxed: boolean;
  targetGearsMaxed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-equipment', type: EquipmentType, current: number, target: number): void;
  (e: 'toggle-max-gears', checked: boolean): void;
  (e: 'toggle-max-target-gears', checked: boolean): void;
}>();

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

// Format equipment type to lowercase for image URL
function formatEquipmentType(type: string): string {
  return type.toLowerCase();
}

// Get equipment icon URL
function getEquipmentIconUrl(type: string, tier: number): string {
  const baseUrl = 'https://schaledb.com/images/equipment/icon';
  const formattedType = formatEquipmentType(type);
  return `${baseUrl}/equipment_icon_${formattedType}_tier${tier}.webp`;
}

// Function to get maximum tier for each equipment type
function getMaxTierForType(type: string): number {
  const equipments = getAllEquipmentFromCache();
  if (!equipments || Object.keys(equipments).length === 0) return 10; // Default to 10 if data not found

  // Find all equipment that matches the type and sort by ID in descending order
  const matchingEquipments = Object.values(equipments)
    .filter((item: any) => item.Category === type)
    .sort((a: any, b: any) => b.Id - a.Id);

  // Get the first item (highest tier) or default to 10
  const highestTierEquipment = matchingEquipments[0];

  return highestTierEquipment?.Tier || 10;
}

// Function to handle current level changes
function updateEquipmentCurrent(type: string, value: number) {
  const maxTier = getMaxTierForType(type);
  if (value >= 1 && value <= maxTier) {
    const equipmentType = type as EquipmentType;
    
    if (!props.equipmentLevels[equipmentType]) {
      return;
    }
    
    props.equipmentLevels[equipmentType].current = value;
    
    // Ensure target is always >= current
    if (props.equipmentLevels[equipmentType].target < value) {
      props.equipmentLevels[equipmentType].target = value;
    }
    
    // Emit the update event
    emit('update-equipment', equipmentType, value, props.equipmentLevels[equipmentType].target);
  }
}

// Function to handle target level changes
function updateEquipmentTarget(type: string, value: number) {
  const maxTier = getMaxTierForType(type);
  if (value >= 1 && value <= maxTier) {
    const equipmentType = type as EquipmentType;
    
    if (!props.equipmentLevels[equipmentType]) {
      return;
    }
    
    const finalValue = Math.max(value, 1);
    props.equipmentLevels[equipmentType].target = finalValue;
    
    // Ensure current is always <= target
    if (props.equipmentLevels[equipmentType].current > finalValue) {
      props.equipmentLevels[equipmentType].current = finalValue;
      
      // Emit the update event for both current and target
      emit('update-equipment', equipmentType, finalValue, finalValue);
    } else {
      // Emit the update event for target only
      emit('update-equipment', equipmentType, props.equipmentLevels[equipmentType].current, finalValue);
    }
  }
}

// Function to check if target is at max level
function isTargetMaxLevel(target: number, type: string) {
  const maxTier = getMaxTierForType(type);
  return target === maxTier;
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
              :max="getMaxTierForType(type)"
              class="level-input current-level"
              :aria-label="`${$t('currentEquipment')} ${equipmentTypes[type as EquipmentKey]}`"
            />
            <button 
              class="control-button increment-button"
              :class="{ disabled: equipmentLevels[type]?.current >= getMaxTierForType(type) }"
              @click="updateEquipmentCurrent(type, (equipmentLevels[type]?.current || 1) + 1)"
              :disabled="equipmentLevels[type]?.current >= getMaxTierForType(type)"
              :aria-label="$t('increaseLevel')"
            >
              <span>+</span>
            </button>
            <button 
              class="control-button max-button"
              :class="{ disabled: equipmentLevels[type]?.current >= getMaxTierForType(type) }"
              @click="updateEquipmentCurrent(type, getMaxTierForType(type))"
              :disabled="equipmentLevels[type]?.current >= getMaxTierForType(type)"
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
              :max="getMaxTierForType(type)"
              class="level-input target-level"
              :class="{ 'max-level': isTargetMaxLevel(equipmentLevels[type]?.target || 1, type) }"
              :aria-label="`${$t('targetEquipment')} ${equipmentTypes[type as EquipmentKey]}`"
            />
            <button 
              class="control-button increment-button"
              :class="{ disabled: equipmentLevels[type]?.target >= getMaxTierForType(type) }"
              @click="updateEquipmentTarget(type, (equipmentLevels[type]?.target || 1) + 1)"
              :disabled="equipmentLevels[type]?.target >= getMaxTierForType(type)"
              :aria-label="$t('increaseLevel')"
            >
              <span>+</span>
            </button>
            <button 
              class="control-button max-button"
              :class="{ disabled: equipmentLevels[type]?.target >= getMaxTierForType(type) }"
              @click="updateEquipmentTarget(type, getMaxTierForType(type))"
              :disabled="equipmentLevels[type]?.target >= getMaxTierForType(type)"
              :aria-label="$t('setMaxLevel')"
            >
              <span>»</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Exclusive Gear Placeholder -->
      <div class="equipment-item placeholder-item">
        <div class="level-control placeholder-control">
          <div class="custom-number-input disabled">
            <button class="control-button min-button disabled" disabled><span>«</span></button>
            <button class="control-button decrement-button disabled" disabled><span>−</span></button>
            <input type="number" value="1" disabled class="level-input current-level disabled" />
            <button class="control-button increment-button disabled" disabled><span>+</span></button>
            <button class="control-button max-button disabled" disabled><span>»</span></button>
          </div>
        </div>

        <div class="equipment-icon placeholder-icon">
          <div class="equipment-type-badge placeholder-badge">{{ $t('exclusiveGear') }}</div>
          <svg class="lock-icon-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div class="tier-indicator placeholder-tier">{{ $t('comingSoon') }}</div>
        </div>

        <div class="level-control placeholder-control">
          <div class="custom-number-input disabled">
            <button class="control-button min-button disabled" disabled><span>«</span></button>
            <button class="control-button decrement-button disabled" disabled><span>−</span></button>
            <input type="number" value="1" disabled class="level-input current-level disabled" />
            <button class="control-button increment-button disabled" disabled><span>+</span></button>
            <button class="control-button max-button disabled" disabled><span>»</span></button>
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
  outline: none;
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
</style>