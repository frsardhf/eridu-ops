<script setup lang="ts">
import { ref, watch } from 'vue';
import { 
  PotentialType, 
  PotentialSettings,
  PotentialMaterial
} from '../../../../types/upgrade';
import '../../../../styles/studentUpgrade.css';

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

// State for collapsible section
const isExpanded = ref(false);

// Toggle expansion
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

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

// Constants
const MAX_POTENTIAL_LEVEL = 25;

// Add this function to handle level display state
const getLevelDisplayState = (current: number, target: number) => {
  if (current === MAX_POTENTIAL_LEVEL && target === MAX_POTENTIAL_LEVEL) {
    return 'max';
  } else if (current === target) {
    return 'same';
  } else {
    return 'different';
  }
};

// Add this function to check if target is at max level
const isTargetMaxLevel = (target: number) => {
  return target === MAX_POTENTIAL_LEVEL;
};

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
  <div class="upgrade-section">
    <h3 class="section-title collapsible-header" @click="toggleExpand">
      <div class="collapsible-title">
        <span>Potential</span>
        <div class="material-summary" v-if="!isExpanded && materials.length > 0">
          <span class="material-hint">Requires: 
            <span v-for="(item, index) in materials.slice(0, 3)" :key="index" class="material-item">
              {{ item.material?.Name || 'Unknown material' }}{{ index < Math.min(materials.length, 3) - 1 ? ', ' : '' }}
            </span>
            <span v-if="materials.length > 3">+{{ materials.length - 3 }} more</span>
          </span>
        </div>
        <span class="collapsible-hint" v-else>(Click to {{ isExpanded ? 'collapse' : 'expand' }})</span>
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
    
    <div class="sliders-column" v-show="isExpanded">
      <template v-for="potType in ['attack', 'maxhp', 'healpower'] as PotentialType[]" :key="potType">
        <div class="type-section">
          <div class="type-header">
            <img 
              :src="`https://schaledb.com/images/item/icon/${potentialTypes[potType].icon}.webp`" 
              :alt="potentialTypes[potType].name"
              class="type-icon"
            />
            <h4>{{ potentialTypes[potType].name }}</h4>
            <div class="level-display">
              <template v-if="getLevelDisplayState(
                potentialTypes[potType].current, 
                potentialTypes[potType].target
              ) === 'max'">
                <span class="max-level">MAX</span>
              </template>
              
              <template v-else-if="getLevelDisplayState(
                potentialTypes[potType].current, 
                potentialTypes[potType].target
              ) === 'same'">
                <span class="target-level">{{ potentialTypes[potType].current }}</span>
              </template>
              
              <template v-else>
                <span class="current-level">{{ potentialTypes[potType].current }}</span>
                <span class="level-arrow">→</span>
                <span class="target-level">{{ potentialTypes[potType].target }}</span>
                <span class="max-indicator" 
                      v-if="isTargetMaxLevel(potentialTypes[potType].target)">
                  MAX
                </span>
              </template>
            </div>
          </div>
          
          <div class="sliders">
            <!-- Current Potential Slider -->
            <div class="slider-row">
              <span class="slider-label">Current</span>
              <input
                type="range"
                min="0"
                max="25"
                class="slider"
                :name="`potential-current-${potType}`"
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
                class="slider"
                :name="`potential-target-${potType}`"
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
/* Component-specific styles */
.collapsible-header {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  transition: background-color 0.2s ease;
  margin-bottom: 0;
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

.material-summary {
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-hint {
  font-size: 0.75em;
  font-weight: normal;
  color: var(--text-secondary);
}

.material-item {
  color: var(--accent-color);
}

.collapsible-header:hover {
  background-color: rgba(var(--background-hover-rgb, 60, 60, 60), 0.15);
  border-radius: 4px;
}

.expand-icon {
  display: flex;
  align-items: center;
}

.expand-icon.rotated svg {
  transform: rotate(180deg);
}
</style> 