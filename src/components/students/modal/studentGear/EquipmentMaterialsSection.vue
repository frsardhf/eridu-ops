<script setup lang="ts">
import { computed } from 'vue';
import { formatLargeNumber } from '../../../../consumables/utils/materialUtils';
import '../../../../styles/resourceDisplay.css';
import { Material } from '../../../../types/upgrade';

const props = defineProps<{
  materials: Material[];
  student?: Record<string, any> | null;
}>();

// Calculate cumulative materials needed by combining all equipment types
const cumulativeMaterials = computed(() => {
  if (!props.materials.length) return [];

  // Group materials by ID
  const materialMap = new Map();
  
  // Process equipment materials
  props.materials.forEach(item => {
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
  
  // Convert map to array and sort by material ID
  return Array.from(materialMap.values())
    .sort((a, b) => {
      const aId = a.material?.Id || 0;
      const bId = b.material?.Id || 0;
      return aId - bId;
    });
});

// Determine if any materials are needed
const hasMaterials = computed(() => {
  return cumulativeMaterials.value.length > 0;
});
</script>

<template>
  <div class="materials-section">
    <h3 class="section-title">Total Materials Needed</h3>
    
    <!-- No materials message -->
    <div v-if="!hasMaterials" class="no-materials">
      No materials needed (target levels must be higher than current levels)
    </div>
    
    <div v-else class="materials-content">
      <div class="resources-grid">
        <div 
          v-for="(item, index) in cumulativeMaterials" 
          :key="index"
          class="resource-item"
          :title="item.material?.Name || 'Material'"
        >
          <div class="resource-content">
            <img 
              v-if="item.material?.Icon"
              :src="item.material?.Id === 5 
                ? `https://schaledb.com/images/item/icon/${item.material.Icon}.webp`
                : `https://schaledb.com/images/equipment/icon/${item.material.Icon}_piece.webp`"
              :alt="item.material?.Name || 'Material'"
              class="resource-icon"
            />
            <div class="resource-quantity">
              {{ formatLargeNumber(item.materialQuantity) }}
            </div>
          </div>
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
  background: var(--background-primary);
  border-radius: 8px;
  padding: 10px;
}
</style> 