<script setup lang="ts">
import { computed } from 'vue';

// Define interfaces for material items
interface BaseMaterial {
  material: Record<string, any> | null;
  materialQuantity: number;
  potentialType: string;
}

interface SkillMaterial extends BaseMaterial {
  level?: number;
}

interface PotentialMaterial extends BaseMaterial {
  workbook?: Record<string, any> | null;
  workbookQuantity?: number;
  levelsInBlock?: number;
  blockStart?: number;
  blockEnd?: number;
}

const props = defineProps<{
  skillMaterials: SkillMaterial[];
  potentialMaterials: PotentialMaterial[];
}>();

// Calculate cumulative materials needed by combining both types
const cumulativeMaterials = computed(() => {
  if (!props.skillMaterials.length && !props.potentialMaterials.length) return [];

  // Group materials by ID
  const materialMap = new Map();
  
  // Process skill materials
  props.skillMaterials.forEach(item => {
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
  
  // Process potential materials
  props.potentialMaterials.forEach(item => {
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

// Calculate workbooks needed by potential type
const workbooksByType = computed(() => {
  const workbooks: Record<string, number> = {};
  
  props.potentialMaterials.forEach(item => {
    if (!item.workbook) return;
    
    const type = item.potentialType;
    if (!workbooks[type]) {
      workbooks[type] = 0;
    }
    workbooks[type] += item.workbookQuantity || 0;
  });
  
  return workbooks;
});

// Determine if any upgrades are active (materials needed)
const hasMaterials = computed(() => {
  return cumulativeMaterials.value.length > 0 || 
         Object.keys(workbooksByType.value).length > 0;
});

// Format workbook icons based on potential type
const getPotentialIcon = (potentialType: string) => {
  const iconMap: Record<string, string> = {
    'attack': 'item_icon_workbook_potentialattack',
    'maxhp': 'item_icon_workbook_potentialmaxhp',
    'healpower': 'item_icon_workbook_potentialhealpower'
  };
  
  return iconMap[potentialType] || 'item_icon_workbook_potentialattack';
};

// Get the display name for potential types
const getPotentialName = (potentialType: string) => {
  const nameMap: Record<string, string> = {
    'attack': 'Attack',
    'maxhp': 'Max HP',
    'healpower': 'Heal Power'
  };
  
  return nameMap[potentialType] || 'Potential';
};
</script>

<template>
  <div class="materials-section">
    <h3 class="section-title">Total Materials Needed</h3>
    
    <!-- No materials message -->
    <div v-if="!hasMaterials" class="no-materials">
      No materials needed (target levels must be higher than current levels)
    </div>
    
    <div v-else class="materials-content">
      <!-- Workbooks section -->
      <div v-if="Object.keys(workbooksByType).length > 0" class="material-category">
        <h4 class="category-title">Potential Workbooks</h4>
        <div class="materials-grid">
          <template v-for="(quantity, potType) in workbooksByType" :key="potType">
            <div class="material-item" :title="`${getPotentialName(potType)} Workbooks`">
              <div class="material-icon-container">
                <img 
                  :src="`https://schaledb.com/images/item/icon/${getPotentialIcon(potType)}.webp`" 
                  :alt="`${getPotentialName(potType)} Workbooks`"
                  class="material-icon"
                />
                <div class="material-quantity">{{ quantity }}</div>
              </div>
              <div class="material-name">{{ getPotentialName(potType) }}</div>
            </div>
          </template>
        </div>
      </div>
      
      <!-- Other materials section -->
      <div v-if="cumulativeMaterials.length > 0" class="material-category">
        <h4 class="category-title">Materials</h4>
        <div class="materials-grid">
          <template v-for="(item, index) in cumulativeMaterials" :key="index">
            <div class="material-item" :title="item.material?.Name || 'Material'">
              <div class="material-icon-container">
                <img 
                  v-if="item.material?.Icon"
                  :src="`https://schaledb.com/images/item/icon/${item.material.Icon}.webp`" 
                  :alt="item.material?.Name || 'Material'"
                  class="material-icon"
                />
                <div class="material-quantity">{{ item.materialQuantity }}</div>
              </div>
              <div class="material-name">{{ item.material?.Name }}</div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.materials-section {
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

.no-materials {
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.materials-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.material-category {
  background: var(--background-primary);
  border-radius: 8px;
  padding: 12px;
}

.category-title {
  font-size: 1em;
  margin-bottom: 12px;
  color: var(--text-primary);
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color);
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  padding: 5px;
}

.material-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--background-secondary);
  border-radius: 8px;
  padding: 10px;
  position: relative;
}

.material-icon-container {
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 8px;
}

.material-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.material-name {
  font-size: 0.8em;
  text-align: center;
  color: var(--text-primary);
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.material-quantity {
  position: absolute;
  bottom: -10px;
  right: -10px;
  font-size: 1.2em;
  font-weight: bold;
  color: var(--text-primary);
  background: var(--card-label-background);
  border-radius: 12px;
  padding: 2px 8px;
  min-width: 24px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

@media (max-width: 976px) {
  .materials-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }
  
  .material-icon-container {
    width: 60px;
    height: 60px;
  }
  
  .material-quantity {
    font-size: 1em;
  }
}
</style> 