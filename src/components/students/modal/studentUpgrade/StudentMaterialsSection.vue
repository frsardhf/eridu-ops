<script setup lang="ts">
import { computed } from 'vue';
import '../../../../styles/resourceDisplay.css';
import { Material } from '../../../../types/upgrade';
import { formatLargeNumber } from '../../../../consumables/utils/materialUtils';
import { $t } from '../../../../locales';

const props = defineProps<{
  allMaterials?: Material[];
  student?: Record<string, any> | null;
}>();

// Function to check if a material is an exp report
const isExpReport = (materialId: number | undefined): boolean => {
  if (!materialId) return false;
  // Exp reports are IDs 10, 11, 12, 13
  return [10, 11, 12, 13].includes(materialId);
};

// Calculate cumulative materials needed by combining both types
const cumulativeMaterials = computed(() => {
  // Use allMaterials directly if provided - it's already consolidated at the hook level
  if (props.allMaterials && props.allMaterials.length > 0) {
    return props.allMaterials;
  }

  // Fall back to empty array if allMaterials is not provided
  return [];
});

// Determine if any upgrades are active (materials needed)
const hasMaterials = computed(() => {
  return cumulativeMaterials.value && cumulativeMaterials.value.length > 0;
});
</script>

<template>
  <div class="materials-section">
    <h3 class="section-title">{{ $t('totalMaterialsNeeded') }}</h3>
    
    <!-- No materials message -->
    <div v-if="!hasMaterials" class="no-materials">
      {{ $t('noMaterialsNeeded') }}
    </div>
    
    <div v-else class="materials-content">
      <div class="resources-grid">
        <div 
          v-for="(item, index) in cumulativeMaterials" 
          :key="index"
          class="resource-item" 
          :class="{ 'exp-report': isExpReport(item.material?.Id) }"
          :title="item.material?.Name || $t('material')"
        >
          <div class="resource-content">
            <img 
              v-if="item.material?.Icon"
              :src="`https://schaledb.com/images/item/icon/${item.material.Icon}.webp`" 
              :alt="item.material?.Name || $t('material')"
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
/* Only keep component-specific styles */
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
  background: var(--background-primary);
  border-radius: 8px;
  padding: 10px;
}

.exp-report {
  position: relative;
}

.exp-report::after {
  content: 'XP';
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 0.6em;
  background-color: rgba(var(--accent-color-rgb, 100, 108, 255), 0.7);
  color: white;
  padding: 1px 3px;
  border-radius: 3px;
  pointer-events: none;
}
</style> 