<script setup lang="ts">
import { computed, ref, watch } from 'vue';

// Define the potential types
type PotentialType = 'attack' | 'maxhp' | 'healpower';

interface MaterialItem {
  material: Record<string, any> | null;
  workbookQuantity: number;
  materialQuantity: number;
  levelsInBlock: number;
  blockStart: number;
  blockEnd: number;
  potentialType?: PotentialType;
}

interface PotentialSettings {
  current: number;
  target: number;
  icon: string;
  name: string;
}

const props = defineProps<{
  currentPotential: number;
  targetPotential: number;
  materials: MaterialItem[];
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
    current: props.currentPotential,
    target: props.targetPotential,
    icon: 'item_icon_workbook_potentialmaxhp',
    name: 'Max HP'
  },
  healpower: {
    current: props.currentPotential,
    target: props.targetPotential,
    icon: 'item_icon_workbook_potentialhealpower',
    name: 'Heal Power'
  }
});

// Watch for prop changes to update potential types
watch(() => props.currentPotential, (newVal) => {
  potentialTypes.value.attack.current = newVal;
}, { immediate: true });

watch(() => props.targetPotential, (newVal) => {
  potentialTypes.value.attack.target = newVal;
}, { immediate: true });

// Determine which potential types are active (target > current)
const activePotentialTypes = computed(() => {
  return Object.entries(potentialTypes.value).filter(([_, settings]) => 
    settings.target > settings.current
  ) as [PotentialType, PotentialSettings][];
});

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

// Update your combinedMaterials computed property to filter materials by potentialType
const combinedMaterials = computed(() => {
  // Create new materials array based on the original materials
  const combinedMats: MaterialItem[] = [];
  
  // Process each potential type individually
  Object.entries(potentialTypes.value).forEach(([type, settings]) => {
    // Only process if target > current for this specific potential type
    if (settings.target > settings.current) {
      // Get materials already tagged with this potential type from props.materials
      const typeSpecificMaterials = props.materials.filter(material => 
        material.potentialType === type || !material.potentialType
      );
      
      if (typeSpecificMaterials.length > 0) {
        // Add these materials to our combined list
        combinedMats.push(...typeSpecificMaterials);
      } else {
        // If no materials are already tagged, calculate what materials would be needed
        const startBlock = Math.floor(settings.current / 5);
        const endBlock = Math.floor((settings.target - 1) / 5);
        
        for (let block = startBlock; block <= endBlock; block++) {
          // Find the matching material in props.materials
          const matchingMaterial = props.materials.find(m => 
            m.blockStart === block * 5 && m.blockEnd <= (block + 1) * 5
          );
          
          if (matchingMaterial) {
            // Calculate levels within this block
            let levelsInBlock = 5;
            
            // Handle first block (may not need all 5 levels)
            if (block === startBlock) {
              const levelStart = settings.current % 5;
              levelsInBlock = 5 - levelStart;
            }
            
            // Handle last block (may not need all 5 levels)
            if (block === endBlock) {
              const remainder = settings.target % 5;
              if (remainder > 0) {
                levelsInBlock = remainder;
              }
            }
            
            // Create a clone with adjusted quantities
            const materialClone = { 
              ...matchingMaterial,
              levelsInBlock,
              workbookQuantity: Math.ceil(matchingMaterial.workbookQuantity * (levelsInBlock / matchingMaterial.levelsInBlock)),
              materialQuantity: Math.ceil(matchingMaterial.materialQuantity * (levelsInBlock / matchingMaterial.levelsInBlock)),
              potentialType: type as PotentialType
            };
            
            combinedMats.push(materialClone);
          }
        }
      }
    }
  });
  
  return combinedMats;
});

// Calculate cumulative materials needed
const cumulativeMaterials = computed(() => {
  const mats = combinedMaterials.value;
  if (!mats.length) return [];

  // Group materials by type (based on material?.Id or similar identifier)
  const materialMap = new Map();
  
  // Process each material item
  mats.forEach(item => {
    const materialId = item.material?.Id;
    
    // Skip if material is invalid
    if (!materialId) return;
    
    // If this material type already exists in the map, update quantities
    if (materialMap.has(materialId)) {
      const existingEntry = materialMap.get(materialId);
      existingEntry.materialQuantity += item.materialQuantity;
    } else {
      // Create a new entry for this material type
      materialMap.set(materialId, {
        material: item.material,
        materialQuantity: item.materialQuantity
      });
    }
  });
  
  // Convert map to array
  return Array.from(materialMap.values());
});

// Calculate workbooks needed by type
const workbooksByType = computed(() => {
  const workbooks: Record<string, number> = {};
  
  combinedMaterials.value.forEach(item => {
    const type = item.potentialType || 'attack';
    if (!workbooks[type]) {
      workbooks[type] = 0;
    }
    workbooks[type] += item.workbookQuantity;
  });
  
  return workbooks;
});

// Calculate total workbooks needed
const totalWorkbooksNeeded = computed(() => {
  return Object.values(workbooksByType.value).reduce((sum, qty) => sum + qty, 0);
});

// Calculate total materials needed
const totalMaterialsNeeded = computed(() => {
  return cumulativeMaterials.value.reduce((sum, item) => sum + item.materialQuantity, 0);
});

// Determine if any potential is active
const hasAnyActivePotential = computed(() => {
  return Object.values(potentialTypes.value).some(settings => 
    settings.target > settings.current
  );
});
</script>

<template>
  <div class="potential-section">
    <h3 class="section-title">Potential Upgrade Calculator</h3>
    
    <div class="potential-calculator-layout">
      <!-- Left Column: Potential Sliders -->
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
      
      <!-- Right Column: Materials -->
      <div class="materials-column">
        <h4 class="materials-title">Materials Needed</h4>
        
        <!-- No materials message -->
        <div v-if="!hasAnyActivePotential" class="no-materials">
          Target levels must be higher than current levels
        </div>
        
        <!-- Materials list -->
        <div v-else-if="combinedMaterials.length === 0" class="no-materials">
          No materials needed for this upgrade
        </div>
        
        <div v-else class="materials-summary">
          <!-- Workbooks by potential type -->
          <template v-for="potType in Object.keys(workbooksByType)" :key="potType">
            <div class="material-item" :title="`${potentialTypes[potType as PotentialType]?.name || 'Potential'} Workbooks`">
              <div class="material-icon-container">
                <img 
                  :src="`https://schaledb.com/images/item/icon/${potentialTypes[potType as PotentialType]?.icon || 'item_icon_workbook_potentialattack'}.webp`" 
                  :alt="`${potentialTypes[potType as PotentialType]?.name || 'Potential'} Workbooks`"
                  class="material-icon"
                />
              </div>
              <div class="material-quantity">{{ workbooksByType[potType] }}</div>
            </div>
          </template>
          
          <!-- Materials -->
          <template v-for="(item, index) in cumulativeMaterials" :key="index">
            <div class="material-item" :title="item.material?.Name || 'Material'">
              <div class="material-icon-container">
                <img 
                  v-if="item.material?.Icon"
                  :src="`https://schaledb.com/images/item/icon/${item.material.Icon}.webp`" 
                  :alt="item.material?.Name || 'Material'"
                  class="material-icon"
                />
              </div>
              <div class="material-quantity">{{ item.materialQuantity }}</div>
            </div>
          </template>
        </div>
      </div>
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

.potential-calculator-layout {
  display: grid;
  grid-template-columns: 9fr 1fr;
  gap: 15px;
}

/* Left Column Styles */
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

/* Right Column Styles */
.materials-column {
  background: var(--background-primary);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.materials-title {
  font-size: 1em;
  font-weight: bold;
  margin-bottom: 12px;
  color: var(--text-primary);
  text-align: center;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color);
}

.no-materials {
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 15px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.materials-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  padding: 5px;
}

.material-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  background: var(--background-secondary);
  border-radius: 8px;
  padding: 8px;
  position: relative;
}

.material-icon-container {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.material-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.material-quantity {
  font-size: 1.3em;
  font-weight: bold;
  color: var(--accent-color);
}

@media (max-width: 976px) {
  .potential-calculator-layout {
    grid-template-columns: 1fr;
  }
  
  .materials-column {
    padding: 10px;
  }
  
  .material-icon-container {
    width: 40px;
    height: 40px;
  }
  
  .potential-slider {
    height: 8px;
  }
  
  .potential-slider::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }
}
</style> 