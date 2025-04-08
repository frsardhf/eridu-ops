<script setup lang="ts">
import { ref, watch } from 'vue';
import { StudentProps } from '../../../../types/student';
import { useStudentGear } from '../../../../consumables/hooks/useStudentGear';
import { EquipmentType } from '../../../../types/equipment';

const props = defineProps<{
  student: StudentProps | null;
  isVisible?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { equipmentLevels, handleEquipmentUpdate } = useStudentGear(props, emit);

// Debug log for initial equipment levels
console.log('Initial equipmentLevels:', equipmentLevels.value);
console.log('Student Equipment:', props.student?.Equipment);

// Equipment type mapping for display
const equipmentTypes = {
  Hat: 'Hat',
  Gloves: 'Gloves',
  Shoes: 'Shoes',
  Bag: 'Bag',
  Badge: 'Badge',
  Hairpin: 'Hairpin',
  Amulet: 'Amulet',
  Watch: 'Watch',
  Necklace: 'Necklace'
};

// Format equipment type to lowercase for image URL
function formatEquipmentType(type: string): string {
  return type.toLowerCase();
}

// Function to handle current level changes
function updateEquipmentCurrent(type: string, value: number) {
  console.log('updateEquipmentCurrent called with:', { type, value });
  console.log('Current equipmentLevels:', equipmentLevels.value);
  
  if (value >= 1 && value <= 10) {
    const equipmentType = type as EquipmentType;
    console.log('Attempting to update:', equipmentType);
    
    if (!equipmentLevels.value[equipmentType]) {
      console.error('Equipment type not found in levels:', equipmentType);
      return;
    }
    
    equipmentLevels.value[equipmentType].current = value;
    
    // Ensure target is always >= current
    if (equipmentLevels.value[equipmentType].target < value) {
      equipmentLevels.value[equipmentType].target = value;
    }
    
    console.log('Updated equipmentLevels:', equipmentLevels.value);
    // Emit the update event
    handleEquipmentUpdate(equipmentType, value, equipmentLevels.value[equipmentType].target);
  }
}

// Function to handle target level changes
function updateEquipmentTarget(type: string, value: number) {
  console.log('updateEquipmentTarget called with:', { type, value });
  console.log('Current equipmentLevels:', equipmentLevels.value);
  
  if (value >= 1 && value <= 10) {
    const equipmentType = type as EquipmentType;
    console.log('Attempting to update:', equipmentType);
    
    if (!equipmentLevels.value[equipmentType]) {
      console.error('Equipment type not found in levels:', equipmentType);
      return;
    }
    
    const finalValue = Math.max(value, 1);
    equipmentLevels.value[equipmentType].target = finalValue;
    
    // Ensure current is always <= target
    if (equipmentLevels.value[equipmentType].current > finalValue) {
      equipmentLevels.value[equipmentType].current = finalValue;
      
      // Emit the update event for both current and target
      handleEquipmentUpdate(equipmentType, finalValue, finalValue);
    } else {
      // Emit the update event for target only
      handleEquipmentUpdate(equipmentType, equipmentLevels.value[equipmentType].current, finalValue);
    }
    
    console.log('Updated equipmentLevels:', equipmentLevels.value);
  }
}

// Add this function to handle level display state
function getLevelDisplayState(current: number, target: number) {
  if (current === 10 && target === 10) { // Assuming max level is 10
    return 'max';
  } else if (current === target) {
    return 'same';
  } else {
    return 'different';
  }
}

// Add this function to check if target is at max level
function isTargetMaxLevel(target: number) {
  return target === 10; // Assuming max level is 10
}
</script>

<template>
  <div class="equipment-growth-section">
    <div class="equipment-grid">
      <div v-for="type in props.student?.Equipment" :key="type" class="equipment-item">
        <div class="level-inputs">
          <input
            type="number"
            :value="equipmentLevels[type]?.current || 1"
            @input="(e) => updateEquipmentCurrent(type, parseInt((e.target as HTMLInputElement).value))"
            min="1"
            max="10"
            class="level-input current-level"
            placeholder="Current"
          />
          <div class="equipment-icon">
            <img 
              :src="`https://schaledb.com/images/equipment/icon/equipment_icon_${formatEquipmentType(type)}_tier1.webp`" 
              :alt="equipmentTypes[type]"
              class="equipment-image"
            />
          </div>
          <input
            type="number"
            :value="equipmentLevels[type]?.target || 1"
            @input="(e) => updateEquipmentTarget(type, parseInt((e.target as HTMLInputElement).value))"
            min="1"
            max="10"
            class="level-input target-level"
            placeholder="Target"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.equipment-growth-section {
  padding: 20px;
  background-color: var(--background-secondary);
  border-radius: 8px;
}

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  justify-items: center;
}

.equipment-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.equipment-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--background-primary);
  border-radius: 8px;
  padding: 10px;
}

.equipment-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.level-inputs {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.level-input {
  width: 100%;
  padding: 5px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--background-primary);
  color: var(--text-primary);
  text-align: center;
}

.level-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.current-level {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.target-level {
  border-top-right-radius: 0;
  border-top-left-radius: 0;
}
</style> 