<script setup lang="ts">
import { ref, watch } from 'vue';
import { 
  PotentialType, 
  PotentialSettings,
} from '../../../../types/upgrade';
import '../../../../styles/studentUpgrade.css';

const props = defineProps<{
  potentialLevels: Record<PotentialType, { current: number; target: number }>;
}>();

const emit = defineEmits<{
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
    current: props.potentialLevels.attack.current,
    target: props.potentialLevels.attack.target,
    icon: 'item_icon_workbook_potentialattack',
    name: 'Attack'
  },
  maxhp: {
    current: props.potentialLevels.maxhp.current,
    target: props.potentialLevels.maxhp.target,
    icon: 'item_icon_workbook_potentialmaxhp',
    name: 'Max HP'
  },
  healpower: {
    current: props.potentialLevels.healpower.current,
    target: props.potentialLevels.healpower.target,
    icon: 'item_icon_workbook_potentialhealpower',
    name: 'Heal Power'
  }
});

// Watch for changes to potentialLevels to update all potential types
watch(() => props.potentialLevels, (newVal) => {
  if (newVal) {
    // Update all potential types from potentialLevels prop
    Object.entries(newVal).forEach(([type, levels]) => {
      const potType = type as PotentialType;
      if (potentialTypes.value[potType]) {
        potentialTypes.value[potType].current = levels.current;
        potentialTypes.value[potType].target = levels.target;
      }
    });
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
    
    // Emit the update event
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
      
      // Emit the update event for current as well
      emit('update-potential', type, finalValue, finalValue);
    } else {
      // Only emit target update
      emit('update-potential', type, potentialTypes.value[type].current, finalValue);
    }
  }
};

// Track which potential sliders are being hovered
const hoveredPotential = ref<PotentialType | null>(null);

// Set the currently hovered potential
const setHoveredPotential = (potType: PotentialType | null) => {
  hoveredPotential.value = potType;
};

// Check if a slider should be shown (either always show current, or show target only when hovered or current !== target)
const shouldShowTargetSlider = (potType: PotentialType) => {
  const potential = potentialTypes.value[potType];
  return hoveredPotential.value === potType || potential.current !== potential.target;
};
</script>

<template>
  <div class="upgrade-section">
    <h3 class="section-title collapsible-header" @click="toggleExpand">
      <div class="collapsible-title">
        <span>Talent</span>
        <div 
          class="material-summary" 
          v-if="!isExpanded">
        </div>
        <span 
          class="collapsible-hint" 
          v-else>(Click to {{ isExpanded ? 'collapse' : 'expand' }})
        </span>
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
          
          <div class="content-container">
            <img 
              :src="`https://schaledb.com/images/item/icon/${potentialTypes[potType].icon}.webp`" 
              :alt="potentialTypes[potType].name"
              class="type-icon"
            />
            
            <div 
              class="sliders" 
              @mouseenter="setHoveredPotential(potType)" 
              @mouseleave="setHoveredPotential(null)"
            >
              <!-- Current Potential Slider -->
              <div class="slider-row">
                <span class="slider-label">{{ potentialTypes[potType].current === potentialTypes[potType].target ? 'Level' : 'Current' }}</span>
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
              
              <!-- Target Potential Slider - Only show when hovering or current !== target -->
              <div 
                class="slider-row target-slider"
                v-show="shouldShowTargetSlider(potType)"
                :class="{ 'fade-in': hoveredPotential === potType }"
              >
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

.content-container {
  display: flex;
  gap: 15px;
  align-items: center;
}

.type-icon {
  flex-shrink: 0;
}

.sliders {
  flex: 1;
}

/* Add these styles to your existing styles */
.target-slider {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-in {
  animation: fadeIn 0.2s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 