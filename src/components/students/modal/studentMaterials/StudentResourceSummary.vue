<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useResourceCalculation } from '../../../../consumables/hooks/useResourceCalculation';
import { useGearCalculation } from '../../../../consumables/hooks/useGearCalculation';
import { getEquipments, getResources } from '../../../../consumables/utils/studentStorage';
import '../../../../styles/resourceDisplay.css';
import { Material } from '../../../../types/upgrade';

// Define view options
type ViewMode = 'needed' | 'missing' | 'equipment-needed' | 'equipment-missing';

// Define types for material with remaining property
interface MaterialWithRemaining extends Material {
  remaining: number;
}

// Type for the precomputed material usage data
interface StudentUsage {
  student: any;
  quantity: number;
}

// UI state
const activeView = ref<ViewMode>('needed');
const { 
  totalMaterialsNeeded, 
  materialsLeftover, 
  getMaterialUsageByStudents 
} = useResourceCalculation();

// Get equipment resource data
const {
  totalEquipmentsNeeded, 
  equipmentsLeftover, 
  getEquipmentUsageByStudents 
} = useGearCalculation();

// Track computation state
const isComputingData = ref(false);
const computedViews = ref(new Set<ViewMode>());

// Add these for progress tracking
const computationProgress = ref(0); // 0-100 percentage
const totalItems = ref(0);
const processedItems = ref(0);
const progressAnimation = ref<number | null>(null);

// Precomputed material usage data cache
const materialUsageCache = ref<Record<number, StudentUsage[]>>({});
const equipmentUsageCache = ref<Record<number, StudentUsage[]>>({});

// Track the currently hovered item for tooltip
const hoveredItemId = ref<number | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });

// Materials that are missing (negative leftover)
const missingMaterials = computed<MaterialWithRemaining[]>(() => {
  // Get resources directly to ensure we have latest data
  const resources = getResources() || {};
  
  // Generate materials that are missing
  return totalMaterialsNeeded.value
    .filter(item => {
      // Get the material ID and check if we have it
      const materialId = item.material?.Id;
      if (!materialId) return false;
      
      // Get resource for this material
      const resource = resources[materialId.toString()];
      if (!resource) return true; // If resource doesn't exist, consider it missing
      
      // Get owned quantity
      const owned = resource.QuantityOwned || 0;
      
      // Consider missing if owned < needed
      return owned < item.materialQuantity;
    })
    .map(item => {
      const materialId = item.material?.Id;
      const resource = resources[materialId?.toString() || ''];
      const owned = resource?.QuantityOwned || 0;
      const remaining = owned - item.materialQuantity;
      
      return {
        material: item.material,
        materialQuantity: item.materialQuantity,
        remaining: remaining,
        type: item.type
      };
    })
    .sort((a, b) => a.remaining - b.remaining); // Sort by most negative first
});

// Equipments that are missing (negative leftover)
const missingEquipments = computed<MaterialWithRemaining[]>(() => {
  // Get equipments directly to ensure we have latest data
  const equipments = getEquipments() || {};
  
  // Generate materials that are missing
  return totalEquipmentsNeeded.value
    .filter(item => {
      // Get the material ID and check if we have it
      const materialId = item.material?.Id;
      if (!materialId) return false;
      
      // Get resource for this material
      const resource = equipments[materialId.toString()];
      if (!resource) return true; // If resource doesn't exist, consider it missing
      
      // Get owned quantity
      const owned = resource.QuantityOwned || 0;
      
      // Consider missing if owned < needed
      return owned < item.materialQuantity;
    })
    .map(item => {
      const materialId = item.material?.Id;
      const resource = equipments[materialId?.toString() || ''];
      const owned = resource?.QuantityOwned || 0;
      const remaining = owned - item.materialQuantity;
      
      return {
        material: item.material,
        materialQuantity: item.materialQuantity,
        remaining: remaining,
        type: item.type
      };
    })
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
    case 'equipment-needed':
      resources = totalEquipmentsNeeded.value;
      break;
    case 'equipment-missing':
      resources = missingEquipments.value;
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

// More accurate progress tracking
const startComputation = () => {
  if (progressAnimation.value) {
    clearInterval(progressAnimation.value);
  }
  
  computationProgress.value = 0;
  // Start with a quick jump to show activity
  setTimeout(() => {
    computationProgress.value = 5;
  }, 100);
  
  // Simulate continuous progress with slight acceleration
  progressAnimation.value = setInterval(() => {
    // Accelerate slowly at the beginning, slow down as we approach 90%
    const increment = computationProgress.value < 30 ? 2 : 
      computationProgress.value < 60 ? 1 : 0.5;
                     
    // Cap at 90% until complete
    if (computationProgress.value < 90) {
      computationProgress.value = Math.min(90, computationProgress.value + increment);
    }
  }, 200);
};

// Modified computation function with better progress tracking
const computeDataForCurrentView = async () => {
  if (computedViews.value.has(activeView.value) || isComputingData.value) return;
  
  console.time(`Computing data for ${activeView.value}`);
  isComputingData.value = true;
  
  // Start progress animation
  startComputation();
  
  // Determine which cache and data to process
  const isEquipmentView = activeView.value.startsWith('equipment');
  const itemsToProcess = isEquipmentView ? totalEquipmentsNeeded.value : totalMaterialsNeeded.value;
  const cacheToUpdate = isEquipmentView ? equipmentUsageCache.value : materialUsageCache.value;
  const usageFunction = isEquipmentView ? getEquipmentUsageByStudents : getMaterialUsageByStudents;
  
  // Set total items for progress tracking
  totalItems.value = itemsToProcess.length;
  processedItems.value = 0;
  
  // Process in batches
  const batchSize = 5;
  
  for (let i = 0; i < itemsToProcess.length; i += batchSize) {
    const batch = itemsToProcess.slice(i, i + batchSize);
    
    // Process this batch
    await new Promise(resolve => {
      setTimeout(() => {
        batch.forEach(item => {
          if (item.material?.Id) {
            cacheToUpdate[item.material.Id] = usageFunction(item.material.Id)
              .sort((a, b) => b.quantity - a.quantity);
          }
          processedItems.value++;
        });
        resolve(undefined);
      }, 0);
    });
  }
  
  // Complete the progress
  if (progressAnimation.value) {
    clearInterval(progressAnimation.value);
    progressAnimation.value = null;
  }
  computationProgress.value = 100;
  
  // Small delay before hiding the progress bar
  setTimeout(() => {
    computedViews.value.add(activeView.value);
    isComputingData.value = false;
  }, 300);
};

// Modified studentUsageForMaterial computed property
const studentUsageForMaterial = computed(() => {
  if (hoveredItemId.value === null) return [];
  
  const isEquipmentView = activeView.value.startsWith('equipment');
  const cache = isEquipmentView ? equipmentUsageCache.value : materialUsageCache.value;
  const usageFunction = isEquipmentView ? getEquipmentUsageByStudents : getMaterialUsageByStudents;
  
  // If we have cached data, use it
  if (cache[hoveredItemId.value]) {
    return cache[hoveredItemId.value];
  }
  
  // If we don't have cached data yet, compute it on demand for this specific item
  if (hoveredItemId.value) {
    // Compute and cache the data for this specific item
    cache[hoveredItemId.value] = usageFunction(hoveredItemId.value)
      .sort((a, b) => b.quantity - a.quantity);
    return cache[hoveredItemId.value];
  }
  
  return [];
});

// Initial computation after mount
onMounted(() => {
  // Allow component to render first, then start computing
  setTimeout(() => {
    computeDataForCurrentView();
  }, 0);
});

// Clean up on component unmount
onUnmounted(() => {
  if (progressAnimation.value) {
    clearInterval(progressAnimation.value);
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
  if (activeView.value === 'needed' || activeView.value === 'equipment-needed') {
    quantity = item.materialQuantity || 0;
  } else if (activeView.value === 'missing' || activeView.value === 'equipment-missing') {
    // For missing materials, display the absolute remaining value (how many are short)
    quantity = Math.abs(item.remaining || 0);
  }
  
  // Use special formatting for large numbers
  if (quantity > 0) {
    return formatLargeNumber(quantity);
  }
  
  return '';
};

// Get CSS class for quantity 
const getQuantityClass = (item: any) => {
  if (activeView.value === 'missing' || activeView.value === 'equipment-missing') {
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
  
  // Initial position based on event
  const initialPosition = {
    x: event.clientX + 20,
    y: event.clientY + 20
  };
  
  // Set initial position
  tooltipPosition.value = initialPosition;
  
  // Adjust tooltip position after it's rendered
  setTimeout(() => {
    const tooltip = document.querySelector('.material-tooltip') as HTMLElement;
    if (tooltip) {
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let adjustedX = initialPosition.x;
      let adjustedY = initialPosition.y;
      
      // Check if off-screen right
      if (rect.right > viewportWidth - 20) {
        adjustedX = Math.max(20, event.clientX - rect.width - 20);
      }
      
      // Check if off-screen bottom
      if (rect.bottom > viewportHeight - 20) {
        adjustedY = Math.max(20, event.clientY - rect.height - 20);
      }
      
      // Update position if changed
      if (adjustedX !== tooltipPosition.value.x || adjustedY !== tooltipPosition.value.y) {
        tooltipPosition.value = {
          x: adjustedX,
          y: adjustedY
        };
      }
    }
  }, 0);
};

// Function to hide tooltip
const hideTooltip = () => {
  hoveredItemId.value = null;
};

// Determine source for the material icon based on material type
const getMaterialIconSrc = (item: any): string => {
  if (!item.material?.Icon) return '';
  
  const isEquipmentTab = activeView.value === 'equipment-needed' || activeView.value === 'equipment-missing';
  const isCredits = item.material?.Id === 5;
  
  if (isCredits) {
    return `https://schaledb.com/images/item/icon/${item.material.Icon}.webp`;
  } else if (isEquipmentTab) {
    return `https://schaledb.com/images/equipment/icon/${item.material.Icon}_piece.webp`;
  } else {
    return `https://schaledb.com/images/item/icon/${item.material.Icon}.webp`;
  }
};

// Add a computed property to determine the appropriate grid width based on student count
const tooltipGridColumns = computed(() => {
  const count = studentUsageForMaterial.value.length;
  if (count <= 3) return count.toString();
  if (count <= 8) return Math.min(4, count).toString();
  if (count <= 16) return Math.min(8, count).toString();
  return Math.min(10, count).toString();
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
        Items Needed
      </button>
      <button 
        class="view-tab" 
        :class="{ active: activeView === 'missing' }"
        @click="setView('missing')"
      >
        Missing Items
      </button>
      <button 
        class="view-tab" 
        :class="{ active: activeView === 'equipment-needed' }"
        @click="setView('equipment-needed')"
      >
        Equipment Needed
      </button>
      <button 
        class="view-tab" 
        :class="{ active: activeView === 'equipment-missing' }"
        @click="setView('equipment-missing')"
      >
        Missing Equipment
      </button>
    </div>
    
    <div class="resources-content">
      <!-- Loading Progress Bar -->
      <div v-if="isComputingData" class="loading-progress-container">
        <div class="loading-progress-bar" :style="{  width: `${computationProgress}%` }"></div>
        <div class="loading-progress-pulse" :style="{ left: `${computationProgress - 3}%` }"></div>
      </div>

      <div v-if="displayResources.length === 0" class="no-resources">
        <span v-if="activeView === 'needed' || activeView === 'equipment-needed'">No resources needed for upgrades</span>
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
              :src="getMaterialIconSrc(item)" 
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
        :style="{ 
          left: `${tooltipPosition.x}px`, 
          top: `${tooltipPosition.y}px`,
          '--grid-columns': tooltipGridColumns
        }"
      >
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
/* Enhanced progress bar styles */
.loading-progress-container {
  position: relative;
  width: 100%;
  height: 5px;
  background-color: rgba(var(--border-color-rgb, 40, 40, 50), 0.3);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 15px;
}

.loading-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, 
              var(--accent-color, #646cff) 0%, 
              rgba(var(--accent-color-rgb, 100, 108, 255), 0.8) 100%);
  border-radius: 3px;
  transition: width 0.3s ease-out;
  position: relative;
}

.loading-progress-pulse {
  position: absolute;
  height: 100%;
  width: 6px;
  background-color: rgba(255, 255, 255, 0.7);
  filter: blur(2px);
  border-radius: 3px;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { opacity: 0.2; }
  50% { opacity: 0.8; }
  100% { opacity: 0.2; }
}

/* Only keep component-specific styles */
.resource-summary {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.view-tabs {
  display: flex;
  flex-wrap: wrap;
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
  pointer-events: none;
  backdrop-filter: blur(5px);
  width: auto;
}

.student-icons-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns, 3), minmax(40px, 1fr));
  gap: 8px;
  overflow-y: auto;
  max-height: 300px;
  padding: 4px;
}

.student-usage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.student-usage-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.student-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.2s;
}

.student-usage-item:hover .student-icon {
  transform: scale(1.05);
}

.usage-quantity {
  font-size: 0.75em;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.4);
  padding: 1px 4px;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .view-tabs {
    flex-wrap: wrap;
  }
  
  .view-tab {
    font-size: 0.8em;
    padding: 8px 10px;
  }
  
  .student-icons-grid {
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  }
  
  .student-icon {
    width: 30px;
    height: 30px;
  }

  .material-tooltip {
    min-width: 200px;
  }
}
</style> 