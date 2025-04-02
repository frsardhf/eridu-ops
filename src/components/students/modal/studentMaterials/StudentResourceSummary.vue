<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useResourceCalculation } from '../../../../consumables/hooks/useResourceCalculation';

// Define view options
type ViewMode = 'owned' | 'needed' | 'leftover';

// UI state
const activeView = ref<ViewMode>('owned');
const { ownedResources, totalMaterialsNeeded, materialsLeftover, refreshData } = useResourceCalculation();

// Computed property to get the resources based on active view
const displayResources = computed(() => {
  switch (activeView.value) {
    case 'owned':
      return ownedResources.value;
    case 'needed':
      return totalMaterialsNeeded.value;
    case 'leftover':
      return materialsLeftover.value;
    default:
      return [];
  }
});

// Format quantity based on the current view
const formatQuantity = (item: any) => {
  if (activeView.value === 'owned') {
    return item.QuantityOwned || 0;
  } else if (activeView.value === 'needed') {
    return item.materialQuantity || 0;
  } else if (activeView.value === 'leftover') {
    return item.remaining;
  }
  return 0;
};

// Get CSS class for leftover quantity 
const getQuantityClass = (item: any) => {
  if (activeView.value !== 'leftover') return '';
  
  const remaining = item.remaining;
  if (remaining < 0) return 'negative';
  if (remaining > 0) return 'positive';
  return 'neutral';
};

// Get quantity display prefix (+ or - for leftover view)
const getQuantityPrefix = (item: any) => {
  if (activeView.value !== 'leftover') return '';
  
  const remaining = item.remaining;
  if (remaining > 0) return '+';
  return ''; // Negative number will have its own minus sign
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
        :class="{ active: activeView === 'owned' }"
        @click="setView('owned')"
      >
        Owned
      </button>
      <button 
        class="view-tab" 
        :class="{ active: activeView === 'needed' }"
        @click="setView('needed')"
      >
        Total Needed
      </button>
      <button 
        class="view-tab" 
        :class="{ active: activeView === 'leftover' }"
        @click="setView('leftover')"
      >
        Leftover
      </button>
    </div>
    
    <div class="resources-content">
      <div v-if="displayResources.length === 0" class="no-resources">
        No resources {{ activeView === 'owned' ? 'owned' : activeView === 'needed' ? 'needed' : 'calculated' }}
      </div>
      
      <div v-else class="resources-grid">
        <div 
          v-for="(item, index) in displayResources" 
          :key="`resource-${item.material?.Id || index}`"
          class="resource-item"
          :title="item.material?.Name || 'Unknown Resource'"
        >
          <div class="resource-icon-container">
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
              {{ getQuantityPrefix(item) }}{{ formatQuantity(item) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  overflow-y: auto;
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

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 10px;
}

.resource-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--background-secondary);
  border-radius: 8px;
  position: relative;
  padding: 5px;
}

.resource-icon-container {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.resource-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.missing-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--text-secondary);
  background: var(--background-primary);
  border-radius: 8px;
}

.resource-quantity {
  position: absolute;
  bottom: -10px;
  right: -10px;
  font-size: 1em;
  font-weight: bold;
  color: var(--text-primary);
  background: var(--card-label-background);
  border-radius: 12px;
  padding: 2px 8px;
  min-width: 24px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.resource-quantity.negative {
  color: #fff;
  background-color: #e53935;
  font-weight: bold;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

.resource-quantity.positive {
  color: #fff;
  background-color: #43a047;
  font-weight: bold;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

.resource-quantity.neutral {
  color: #fff;
  background-color: #757575;
  font-weight: bold;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

@media (max-width: 976px) {
  .resources-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 8px;
  }
  
  .resource-icon-container {
    width: 56px;
    height: 56px;
  }
}
</style> 