<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { Material } from '../../../../types/upgrade';
import { EquipmentType } from '../../../../types/gear';
import { useResourceCalculation } from '../../../../consumables/hooks/useResourceCalculation';
import { useGearCalculation } from '../../../../consumables/hooks/useGearCalculation';
import { getEquipments, getResources, getResourceDataById, getEquipmentDataById } from '../../../../consumables/utils/studentStorage';
import { formatLargeNumber, adjustTooltipPosition } from '../../../../consumables/utils/materialUtils';
import { $t } from '../../../../locales';
import '../../../../styles/resourceDisplay.css';

// Define view options
type ViewMode = 'needed' | 'missing' | 'equipment-needed' | 'equipment-missing';

// Define types for material items with remaining property
interface MaterialWithRemaining extends Material {
  remaining: number;
}

// UI state
const activeView = ref<ViewMode>('needed');
const { 
  totalMaterialsNeeded, 
  materialsLeftover, 
  getMaterialUsageByStudents,
  calculateExpNeeds 
} = useResourceCalculation();

// Get equipment resource data
const {
  totalEquipmentsNeeded, 
  equipmentsLeftover, 
  getEquipmentUsageByStudents,
  isExpBall
} = useGearCalculation();

// Track the currently hovered item for tooltip
const hoveredItemId = ref<number | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });
const isHoveringTooltip = ref(false);

// Add a cache for material usage data
const materialUsageCache = ref<Map<string, any[]>>(new Map());
const equipmentUsageCache = ref<Map<string, any[]>>(new Map());

// Add cache for XP calculation results
const xpCalculationCache = ref<{
  totalXpNeeded: number;
  remainingXpNeeded: number;
  studentXpDetails: any[];
} | null>(null);

// Add ref for current exp report icon
const currentExpIcon = ref(10); // Start with Novice report (ID: 10)

// Add ref for current exp ball icon
const currentExpBall = ref(1); // Start with Novice exp ball (ID: 1)

// Function to get XP calculation results (with caching)
const getXpCalculation = () => {
  if (!xpCalculationCache.value) {
    xpCalculationCache.value = calculateExpNeeds();
  }
  return xpCalculationCache.value;
};

// Helper function to check if a material ID is an EXP report
const isExpReport = (materialId: number) => {
  return [10, 11, 12, 13].includes(materialId);
};

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
      
      // Special handling for XP reports
      if (isExpReport(materialId)) {
        const { remainingXpNeeded } = getXpCalculation();
        return remainingXpNeeded > 0;
      }
      
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
      
      // Special handling for XP reports
      if (isExpReport(materialId)) {
        const { remainingXpNeeded } = getXpCalculation();
        return {
          material: item.material,
          materialQuantity: remainingXpNeeded,
          remaining: -remainingXpNeeded,
          type: 'xp' as const
        };
      }
      
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
      
      // Special handling for XP balls
      if (isExpBall(materialId)) {
        const { remainingXpNeeded } = calculateExpNeeds();
        return remainingXpNeeded > 0;
      }
      
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
      
      // Special handling for XP balls
      if (isExpBall(materialId)) {
        const { remainingXpNeeded } = calculateExpNeeds();
        return {
          material: item.material,
          materialQuantity: remainingXpNeeded,
          remaining: -remainingXpNeeded,
          type: 'xp' as const
        };
      }
      
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

// Set up intervals to rotate exp report and exp ball icons
onMounted(() => {
  // Set up interval for exp reports (10-13)
  const expReportInterval = setInterval(() => {
    currentExpIcon.value = currentExpIcon.value === 13 ? 10 : currentExpIcon.value + 1;
  }, 1000);

  // Set up interval for exp balls (1-4)
  const expBallInterval = setInterval(() => {
    currentExpBall.value = currentExpBall.value === 4 ? 1 : currentExpBall.value + 1;
  }, 1000);

  // Clean up intervals on component unmount
  onUnmounted(() => {
    clearInterval(expReportInterval);
    clearInterval(expBallInterval);
  });
});

// Helper function to get material icon source
const getMaterialIconSrc = (item: any, activeView: ViewMode, currentExpIcon: number, currentExpBall: number): string => {
  if (!item.material?.Icon) return '';
  
  const isEquipmentTab = activeView === 'equipment-needed' || activeView === 'equipment-missing';
  const isCredits = item.material?.Id === 5;
  const isExp = isExpReport(item.material?.Id);
  const isBall = isExpBall(item.material?.Id);
  
  if (isCredits) {
    return `https://schaledb.com/images/item/icon/${item.material.Icon}.webp`;
  } else if (isEquipmentTab) {
    if (isBall) {
      const expBallResource = getEquipmentDataById(currentExpBall);
      return `https://schaledb.com/images/equipment/icon/${expBallResource?.Icon}.webp`;
    }
    return `https://schaledb.com/images/equipment/icon/${item.material.Icon}_piece.webp`;
  } else if (isExp) {
    const expResource = getResourceDataById(currentExpIcon);
    return `https://schaledb.com/images/item/icon/${expResource?.Icon}.webp`;
  } else {
    return `https://schaledb.com/images/item/icon/${item.material.Icon}.webp`;
  }
};

// Helper function to format quantity
const formatQuantity = (item: any, activeView: ViewMode): string => {
  if (isExpReport(item.material?.Id) || isExpBall(item.material?.Id)) {
    return '';
  }

  let quantity = 0;
  
  if (activeView === 'needed' || activeView === 'equipment-needed') {
    quantity = item.materialQuantity || 0;
  } else if (activeView === 'missing' || activeView === 'equipment-missing') {
    quantity = Math.abs(item.remaining || 0);
  }
  
  return quantity > 0 ? formatLargeNumber(quantity) : '';
};

// Helper function to get quantity class
const getQuantityClass = (activeView: ViewMode): string => {
  return (activeView === 'missing' || activeView === 'equipment-missing') ? 'negative' : '';
};

// Function to reset cache when view changes
const setView = (view: ViewMode) => {
  // Only clear cache if we're switching between equipment and materials views
  const wasEquipmentView = activeView.value === 'equipment-needed' || activeView.value === 'equipment-missing';
  const isEquipmentView = view === 'equipment-needed' || view === 'equipment-missing';
  
  if (wasEquipmentView !== isEquipmentView) {
    // Clear hover state and caches
    hoveredItemId.value = null;
    materialUsageCache.value.clear();
    equipmentUsageCache.value.clear();
    xpCalculationCache.value = null;
  }
  
  activeView.value = view;
};

const showTooltip = async (event: MouseEvent, materialId: number) => {
  hoveredItemId.value = materialId;
  
  // Set initial position
  tooltipPosition.value = adjustTooltipPosition(event);
  
  // Wait for the tooltip to be rendered
  await nextTick();
  
  // Adjust tooltip position after it's rendered
  const tooltip = document.querySelector('.material-tooltip') as HTMLElement;
  if (tooltip) {
    tooltipPosition.value = adjustTooltipPosition(event, tooltip);
  }
};

// Function to hide tooltip
const hideTooltip = () => {
  // Only hide if we're not hovering the tooltip
  if (!isHoveringTooltip.value) {
    hoveredItemId.value = null;
  }
};

// Function to handle tooltip mouse enter
const handleTooltipMouseEnter = () => {
  isHoveringTooltip.value = true;
};

// Function to handle tooltip mouse leave
const handleTooltipMouseLeave = () => {
  isHoveringTooltip.value = false;
  hoveredItemId.value = null;
};

// Helper function to get tooltip grid columns
const getTooltipGridColumns = (count: number): string => {
  if (count <= 3) return count.toString();
  if (count <= 8) return Math.min(4, count).toString();
  if (count <= 16) return Math.min(8, count).toString();
  return Math.min(10, count).toString();
};

// Add a computed property to determine the appropriate grid width based on student count
const tooltipGridColumns = computed(() => getTooltipGridColumns(studentUsageForMaterial.value.length));

// Helper function to format usage quantity
const formatUsageQuantity = (quantity: number, materialId?: number | null, equipmentTypes?: EquipmentType[]): string => {
  if (materialId && (isExpReport(materialId) || isExpBall(materialId))) {
    return quantity.toString();
  }
  return formatLargeNumber(quantity);
};

// Student usage data for the hovered material
const studentUsageForMaterial = computed(() => {
  if (hoveredItemId.value === null) return [];
  
  const materialId = hoveredItemId.value;
  
  // Use different cache based on the active view
  const isEquipmentView = activeView.value === 'equipment-needed' || activeView.value === 'equipment-missing';
  const cache = isEquipmentView ? equipmentUsageCache.value : materialUsageCache.value;
  
  // Create a cache key that includes both material ID and view mode
  const cacheKey = `${materialId}-${activeView.value}`;
  
  // For XP reports, credits, and XP balls, always get fresh data
  if (isExpReport(materialId) || materialId === 5 || isExpBall(materialId)) {
    const usage = isEquipmentView 
      ? getEquipmentUsageByStudents(materialId, activeView.value)
      : getMaterialUsageByStudents(materialId, activeView.value);
    return usage.sort((a, b) => b.quantity - a.quantity); // Sort by highest quantity first
  }
  
  // Check if we already have cached data for this material and view mode
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }
  
  // If not in cache, calculate and store in cache
  let usage: any[] = [];
  if (isEquipmentView) {
    usage = getEquipmentUsageByStudents(materialId, activeView.value)
      .sort((a, b) => b.quantity - a.quantity); // Sort by highest quantity first
    equipmentUsageCache.value.set(cacheKey, usage);
  } else {
    usage = getMaterialUsageByStudents(materialId, activeView.value)
      .sort((a, b) => b.quantity - a.quantity); // Sort by highest quantity first
    materialUsageCache.value.set(cacheKey, usage);
  }
  
  return usage;
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
        {{ $t('itemsNeeded') }}
      </button>
      <button 
        class="view-tab" 
        :class="{ active: activeView === 'missing' }"
        @click="setView('missing')"
      >
        {{ $t('missingItems') }}
      </button>
      <button 
        class="view-tab" 
        :class="{ active: activeView === 'equipment-needed' }"
        @click="setView('equipment-needed')"
      >
        {{ $t('equipmentNeeded') }}
      </button>
      <button 
        class="view-tab" 
        :class="{ active: activeView === 'equipment-missing' }"
        @click="setView('equipment-missing')"
      >
        {{ $t('missingEquipment') }}
      </button>
    </div>
    
    <div class="resources-content">
      <div v-if="displayResources.length === 0" class="no-resources">
        <span v-if="activeView === 'needed' || activeView === 'equipment-needed'">{{ $t('noResourcesNeeded') }}</span>
        <span v-else>{{ $t('allMaterialsAvailable') }}</span>
      </div>
      
      <div v-else class="resources-grid">
        <div 
          v-for="(item, index) in displayResources" 
          :key="`resource-${item.material?.Id || index}`"
          class="resource-item"
          :title="item.material?.Name || $t('unknownResource')"
          @mousemove="showTooltip($event, item.material?.Id)"
          @mouseleave="hideTooltip()"
        >
          <div class="resource-content">
            <img 
              v-if="item.material?.Icon && item.material.Icon !== 'unknown'"
              :src="getMaterialIconSrc(item, activeView, currentExpIcon, currentExpBall)" 
              :alt="item.material?.Name || $t('unknown')"
              class="resource-icon"
            />
            <div 
              v-else
              class="resource-icon missing-icon"
            >?</div>
            
            <div 
              class="resource-quantity" 
              :class="getQuantityClass(activeView)"
            >
              {{ formatQuantity(item, activeView) }}
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
        @mouseenter="handleTooltipMouseEnter"
        @mouseleave="handleTooltipMouseLeave"
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
            <span class="usage-quantity">
              {{ formatUsageQuantity(usage.quantity, hoveredItemId, usage.equipmentTypes) }}
            </span>
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

.view-tab:focus {
  outline: none;
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

/* Tooltip styles */
.material-tooltip {
  position: fixed;
  z-index: 1000;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 5px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  width: auto;
  max-height: 80vh; /* Limit height to 80% of viewport height */
  overflow-y: auto; /* Enable vertical scrolling */
}

.student-icons-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns, 3), minmax(40px, 1fr));
  gap: 8px;
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
  font-size: 0.85em;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--card-background);
  padding: 1px 4px;
  border-radius: 4px;
}

/* Add scrollbar styles */
.material-tooltip::-webkit-scrollbar {
  width: 8px;
}

.material-tooltip::-webkit-scrollbar-track {
  background: var(--card-background);
  border-radius: 4px;
}

.material-tooltip::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.material-tooltip::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
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