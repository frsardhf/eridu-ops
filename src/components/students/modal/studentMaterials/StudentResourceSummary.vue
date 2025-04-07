<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useResourceCalculation } from '../../../../consumables/hooks/useResourceCalculation';
import '../../../../styles/resourceDisplay.css';

// Define view options
type ViewMode = 'needed' | 'missing';

// UI state
const activeView = ref<ViewMode>('needed');
const { totalMaterialsNeeded, materialsLeftover, refreshData, getMaterialUsageByStudents } = useResourceCalculation();

// Track the currently hovered item for tooltip
const hoveredItemId = ref<number | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });

// Materials that are missing (negative leftover)
const missingMaterials = computed(() => {
  return materialsLeftover.value
    .filter(item => item.remaining < 0)
    .sort((a, b) => a.remaining - b.remaining); // Sort by most negative first
});

// Check if the material is an exp report
const isExpReport = (materialId: number) => {
  // Exp report IDs: Novice (10), Normal (11), Advanced (12), Superior (13)
  return [10, 11, 12, 13].includes(materialId);
};

// Computed property to get the resources based on active view
const displayResources = computed(() => {
  let resources: any[] = [];
  
  switch (activeView.value) {
    case 'needed':
      resources = totalMaterialsNeeded.value;
      break;
    case 'missing':
      resources = missingMaterials.value;
      break;
    default:
      resources = [];
  }
  
  // Sort to put credits first, then exp reports, then other materials
  return resources.sort((a, b) => {
    const aId = a.material?.Id || 0;
    const bId = b.material?.Id || 0;
    
    // Always put credits (ID: 5) first
    if (aId === 5) return -1;
    if (bId === 5) return 1;
    
    // Put exp reports next (IDs: 10, 11, 12, 13)
    if (isExpReport(aId) && !isExpReport(bId)) return -1;
    if (!isExpReport(aId) && isExpReport(bId)) return 1;
    
    // For all other materials, sort by ID
    return aId - bId;
  });
});

// Student usage data for the hovered material
const studentUsageForMaterial = computed(() => {
  if (hoveredItemId.value === null) return [];
  
  return getMaterialUsageByStudents(hoveredItemId.value)
    .sort((a, b) => b.quantity - a.quantity); // Sort by highest quantity first
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

// Function to show tooltip
const showTooltip = (event: MouseEvent, materialId: number) => {
  hoveredItemId.value = materialId;
  
  // Position the tooltip near the cursor but not directly under it
  tooltipPosition.value = {
    x: event.clientX + 10,
    y: event.clientY + 10
  };
  
  // Adjust tooltip position if it would go off screen
  setTimeout(() => {
    const tooltip = document.querySelector('.material-tooltip') as HTMLElement;
    if (tooltip) {
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (rect.right > viewportWidth) {
        tooltipPosition.value.x = event.clientX - rect.width - 10;
      }
      
      if (rect.bottom > viewportHeight) {
        tooltipPosition.value.y = event.clientY - rect.height - 10;
      }
    }
  }, 0);
};

// Function to hide tooltip
const hideTooltip = () => {
  hoveredItemId.value = null;
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
          :class="{ 'exp-report': isExpReport(item.material?.Id) }"
          @mousemove="showTooltip($event, item.material?.Id)"
          @mouseleave="hideTooltip()"
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
      
      <!-- Material Usage Tooltip -->
      <div 
        v-if="hoveredItemId !== null && studentUsageForMaterial.length > 0" 
        class="material-tooltip"
        :style="{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }"
      >
        <div class="tooltip-header">
          <span>Used By</span>
        </div>
        <div class="student-icons-grid">
          <div 
            v-for="(usage, i) in studentUsageForMaterial" 
            :key="`usage-${i}`"
            class="student-usage-item"
          >
            <img 
              :src="`https://schaledb.com/images/student/icon/${usage.student.Id}.webp`" 
              :alt="usage.student.Name" 
              class="student-icon"
            />
            <span class="usage-quantity">{{ formatLargeNumber(usage.quantity) }}</span>
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
  font-size: 0.9em;
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

/* Tooltip styles */
.material-tooltip {
  position: fixed;
  z-index: 1000;
  background: rgba(12, 12, 20, 0.92);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  max-width: 300px;
  min-width: 180px;
  pointer-events: none;
  backdrop-filter: blur(5px);
}

.tooltip-header {
  font-size: 0.9em;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 4px;
}

.student-icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 8px;
  max-height: 250px;
  overflow-y: auto;
}

.student-usage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.student-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.usage-quantity {
  font-size: 0.75em;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.4);
  padding: 1px 4px;
  border-radius: 4px;
}
</style> 