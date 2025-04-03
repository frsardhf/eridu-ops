<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useResourceCalculation } from '../../../../consumables/hooks/useResourceCalculation';
import '../../../../styles/resourceDisplay.css';

// Define view options
type ViewMode = 'needed' | 'missing';

// UI state
const activeView = ref<ViewMode>('needed');
const { totalMaterialsNeeded, materialsLeftover, refreshData } = useResourceCalculation();

// Materials that are missing (negative leftover)
const missingMaterials = computed(() => {
  return materialsLeftover.value
    .filter(item => item.remaining < 0)
    .sort((a, b) => a.remaining - b.remaining); // Sort by most negative first
});

// Computed property to get the resources based on active view
const displayResources = computed(() => {
  switch (activeView.value) {
    case 'needed':
      return totalMaterialsNeeded.value;
    case 'missing':
      return missingMaterials.value;
    default:
      return [];
  }
});

// Function to format quantity with 'K/M' for large numbers
const formatLargeNumber = (quantity: number): string => {
  if (!quantity || quantity <= 0) return '';
  
  // Format large numbers with 'M' suffix for millions
  if (quantity >= 1000000) {
    return `×${Math.floor(quantity / 1000000)}M`;
  } 
  // Format large numbers with 'K' suffix for thousands
  else if (quantity >= 10000) {
    return `×${Math.floor(quantity / 1000)}K`;
  } 
  
  // Keep normal display for smaller numbers
  return `×${quantity}`;
};

// Format quantity based on the current view
const formatQuantity = (item: any) => {
  let quantity = 0;
  if (activeView.value === 'needed') {
    quantity = item.materialQuantity || 0;
  } else if (activeView.value === 'missing') {
    // For missing materials, display the absolute value of the negative remaining
    quantity = Math.abs(item.remaining);
  }
  
  // Use special formatting for large numbers
  if (quantity > 0) {
    return formatLargeNumber(quantity);
  }
  
  return '';
};

// Get CSS class for quantity 
const getQuantityClass = (item: any) => {
  if (activeView.value === 'missing') {
    return 'negative'; // Always negative (missing materials)
  }
  return '';
};

// Change the current view
const setView = (view: ViewMode) => {
  activeView.value = view;
};

// Refresh the data initially
onMounted(() => {
  refreshData();
});
</script>

<template>
  <div class="resource-summary">
    <div class="view-tabs">
      <button 
        class="view-tab" 
        :class="{ active: activeView === 'needed' }"
        @click="setView('needed')"
      >
        Total Needed
      </button>
      <button 
        class="view-tab" 
        :class="{ active: activeView === 'missing' }"
        @click="setView('missing')"
      >
        Missing Materials
      </button>
    </div>
    
    <div class="resources-content">
      <div v-if="displayResources.length === 0" class="no-resources">
        <span v-if="activeView === 'needed'">No resources needed for upgrades</span>
        <span v-else>You have all the materials you need! ✓</span>
      </div>
      
      <div v-else class="resources-grid">
        <div 
          v-for="(item, index) in displayResources" 
          :key="`resource-${item.material?.Id || index}`"
          class="resource-item"
          :title="item.material?.Name || 'Unknown Resource'"
        >
          <div class="resource-content">
            <img 
              v-if="item.material?.Icon && item.material.Icon !== 'unknown'"
              :src="`https://schaledb.com/images/item/icon/${item.material.Icon}.webp`" 
              :alt="item.material?.Name || 'Unknown'"
              class="resource-icon"
            />
            <div 
              v-else
              class="resource-icon missing-icon"
            >?</div>
            
            <div 
              class="resource-quantity" 
              :class="getQuantityClass(item)"
            >
              {{ formatQuantity(item) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Only keep component-specific styles */
.resource-summary {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.view-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 15px;
}

.view-tab {
  padding: 10px 15px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}

.view-tab:hover {
  color: var(--text-primary);
}

.view-tab.active {
  color: var(--accent-color);
  border-bottom-color: var(--accent-color);
}

.resources-content {
  flex: 1;
  background: var(--card-background);
  border-radius: 8px;
  padding: 15px;
}

.no-resources {
  color: var(--text-secondary);
  font-style: italic;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
}
</style> 