<script setup lang="ts">
import { ref, watch } from 'vue';
import { 
  PotentialType, 
  PotentialSettings,
  PotentialMaterial
} from '../../../../types/upgrade';

interface MaterialItem extends Omit<PotentialMaterial, 'potentialType'> {
  potentialType?: PotentialType;
}

const props = defineProps<{
  currentPotential: number;
  targetPotential: number;
  materials: MaterialItem[];
  potentialLevels?: Record<PotentialType, { current: number; target: number }>;
}>();

const emit = defineEmits<{
  (e: 'update-current-potential', value: number): void;
  (e: 'update-target-potential', value: number): void;
  (e: 'update-potential', type: PotentialType, current: number, target: number): void;
}>();

// Create potential settings for each type
const potentialTypes = ref<Record<PotentialType, PotentialSettings>>({
  attack: {
    current: props.currentPotential,
    target: props.targetPotential,
    icon: 'item_icon_workbook_potentialattack',
    name: 'Attack'
  },
  maxhp: {
    current: 0,
    target: 0,
    icon: 'item_icon_workbook_potentialmaxhp',
    name: 'Max HP'
  },
  healpower: {
    current: 0,
    target: 0,
    icon: 'item_icon_workbook_potentialhealpower',
    name: 'Heal Power'
  }
});

// Watch for prop changes to update attack potential directly
watch(() => props.currentPotential, (newVal) => {
  potentialTypes.value.attack.current = newVal;
}, { immediate: true });

watch(() => props.targetPotential, (newVal) => {
  potentialTypes.value.attack.target = newVal;
}, { immediate: true });

// Watch for changes to potentialLevels to update maxhp and healpower
watch(() => props.potentialLevels, (newVal) => {
  if (newVal) {
    // Update maxhp and healpower from potentialLevels prop
    if (newVal.maxhp) {
      potentialTypes.value.maxhp.current = newVal.maxhp.current;
      potentialTypes.value.maxhp.target = newVal.maxhp.target;
    }
    
    if (newVal.healpower) {
      potentialTypes.value.healpower.current = newVal.healpower.current;
      potentialTypes.value.healpower.target = newVal.healpower.target;
    }
  }
}, { deep: true, immediate: true });

// Handle potential type changes
const updatePotentialCurrent = (type: PotentialType, value: number) => {
  if (value >= 0 && value <= 25) {
    potentialTypes.value[type].current = value;
    
    // Ensure target is always >= current
    if (potentialTypes.value[type].target < value) {
      potentialTypes.value[type].target = value;
    }
    
    if (type === 'attack') {
      emit('update-current-potential', value);
      // Also update target if needed
      if (potentialTypes.value[type].target < value) {
        emit('update-target-potential', value);
      }
    }
    
    // For future enhancement
    emit('update-potential', type, value, potentialTypes.value[type].target);
  }
};

const updatePotentialTarget = (type: PotentialType, value: number) => {
  if (value >= 0 && value <= 25) {
    // Ensure target is always >= current
    const finalValue = Math.max(value, 0);
    potentialTypes.value[type].target = finalValue;
    
    // Ensure current is always <= target
    if (potentialTypes.value[type].current > finalValue) {
      potentialTypes.value[type].current = finalValue;
      
      // If this is attack type, also update the main values
      if (type === 'attack') {
        emit('update-current-potential', finalValue);
      }
      
      // Emit the update event for current as well
      emit('update-potential', type, finalValue, finalValue);
    } else {
      // Only emit target update
      emit('update-potential', type, potentialTypes.value[type].current, finalValue);
    }
    
    if (type === 'attack') {
      emit('update-target-potential', finalValue);
    }
  }
};
</script>

<template>
  <div class="potential-section">
    <h3 class="section-title">Potential Upgrade Calculator</h3>
    
    <div class="potential-sliders-column">
      <template v-for="potType in ['attack', 'maxhp', 'healpower'] as PotentialType[]" :key="potType">
        <div class="potential-type-section">
          <div class="potential-type-header">
            <img 
              :src="`https://schaledb.com/images/item/icon/${potentialTypes[potType].icon}.webp`" 
              :alt="potentialTypes[potType].name"
              class="potential-type-icon"
            />
            <h4>{{ potentialTypes[potType].name }}</h4>
            <div class="level-display">
              <span class="current-level">{{ potentialTypes[potType].current }}</span>
              <span class="level-arrow">→</span>
              <span class="target-level">{{ potentialTypes[potType].target }}</span>
            </div>
          </div>
          
          <div class="potential-sliders">
            <!-- Current Potential Slider -->
            <div class="slider-row">
              <span class="slider-label">Current</span>
              <input
                type="range"
                min="0"
                max="25"
                class="potential-slider"
                :value="potentialTypes[potType].current"
                @input="(e) => updatePotentialCurrent(potType, parseInt((e.target as HTMLInputElement).value))"
              />
            </div>
            
            <!-- Target Potential Slider -->
            <div class="slider-row">
              <span class="slider-label">Target</span>
              <input
                type="range"
                min="0"
                max="25"
                class="potential-slider"
                :value="potentialTypes[potType].target"
                @input="(e) => updatePotentialTarget(potType, parseInt((e.target as HTMLInputElement).value))"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.potential-section {
  background: var(--card-background);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid var(--border-color);
  margin-bottom: 15px;
}

.section-title {
  font-size: 1.1em;
  font-weight: bold;
  margin-bottom: 15px;
  color: var(--text-primary);
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color);
}

.potential-sliders-column {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.potential-type-section {
  background: var(--background-primary);
  border-radius: 8px;
  padding: 12px;
}

.potential-type-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.potential-type-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.level-display {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: bold;
  font-size: 0.9em;
}

.level-arrow {
  color: var(--text-secondary);
}

.current-level {
  color: var(--text-secondary);
}

.target-level {
  color: var(--accent-color);
}

.potential-sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-label {
  font-size: 0.8em;
  color: var(--text-secondary);
  width: 50px;
}

.potential-slider {
  flex: 1;
  height: 10px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--background-secondary);
  border-radius: 5px;
  outline: none;
}

.potential-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--accent-color);
  border-radius: 50%;
  cursor: pointer;
}

.potential-levels {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 0.7em;
  padding: 0 5px;
}

@media (max-width: 976px) {
  .potential-slider {
    height: 8px;
  }
  
  .potential-slider::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }
}
</style> 