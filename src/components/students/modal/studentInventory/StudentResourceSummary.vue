<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { Material } from '../../../../types/upgrade';
import { EquipmentType } from '../../../../types/gear';
import { useMaterialCalculation } from '../../../../consumables/hooks/useMaterialCalculation';
import { useGearCalculation } from '../../../../consumables/hooks/useGearCalculation';
import { useGiftCalculation } from '../../../../consumables/hooks/useGiftCalculation';
import { getAllItemsFromCache, getAllEquipmentFromCache } from '../../../../consumables/stores/resourceCacheStore';
import { 
  formatLargeNumber, 
  formatLargeNumberAmount, 
  adjustTooltipPosition,
  isExpReport,
  isExpBall,
  getMaterialName,
  getMaterialIconSrc
} from '../../../../consumables/utils/materialUtils';
import { $t } from '../../../../locales';
import '../../../../styles/resourceDisplay.css';

// Define view options - 3 main tabs
type ViewTab = 'materials' | 'equipment' | 'gifts';
type ViewMode = 'needed' | 'missing';

// Define types for material items with remaining property
interface MaterialWithRemaining extends Material {
  remaining: number;
}

// Define type for student usage data
interface StudentUsage {
  student: { Id: number; Name: string; [key: string]: any };
  quantity: number;
  equipmentTypes?: EquipmentType[];
}

// UI state
const activeTab = ref<ViewTab>('materials');
const activeMode = ref<ViewMode>('needed');

const { 
  totalMaterialsNeeded, 
  materialsLeftover, 
  getMaterialUsageByStudents,
  calculateExpNeeds 
} = useMaterialCalculation();

// Get equipment resource data
const {
  totalEquipmentsNeeded,
  equipmentsLeftover,
  getEquipmentUsageByStudents,
  calculateExpNeeds: calculateEquipmentExpNeeds
} = useGearCalculation();

// Get gift resource data (Student → Gifts pattern)
const {
  getStudentsWithGifts,
  getGiftsForStudent
} = useGiftCalculation();

// Track the currently hovered item for tooltip
const hoveredItemId = ref<number | null>(null);
const hoveredStudentId = ref<number | null>(null); // For gifts tab - student hover
const tooltipPosition = ref({ x: 0, y: 0 });
const isHoveringTooltip = ref(false);

// Add a cache for material usage data
const materialUsageCache = ref<Map<string, StudentUsage[]>>(new Map());
const equipmentUsageCache = ref<Map<string, StudentUsage[]>>(new Map());

// Add cache for XP calculation results
const xpCalculationCache = ref<{
  totalXpNeeded: number;
  ownedXp: number;
  studentXpDetails: { studentId: string; xpNeeded: number; remainingXp: number; name: string; }[];
} | null>(null);

// Add ref for current exp report icon
const currentExpIcon = ref(10); // Start with Novice report (ID: 10)

// Add ref for current exp ball icon
const currentExpBall = ref(1); // Start with Novice exp ball (ID: 1)

// Generic function to calculate missing items
const calculateMissingItems = (
  items: any[],
  getStorage: () => Record<string, any>,
  isSpecialItem: (id: number) => boolean,
  getSpecialItemNeeds: () => { totalXpNeeded: number; ownedXp: number }
): MaterialWithRemaining[] => {
  // Get storage directly to ensure we have latest data
  const storage = getStorage();
  
  // Generate items that are missing
  return items
    .filter(item => {
      // Get the material ID and check if we have it
      const materialId = item.material?.Id;
      if (!materialId) return false;
      
      // Special handling for special items (XP reports/balls)
      if (isSpecialItem(materialId)) {
        const { totalXpNeeded, ownedXp } = getSpecialItemNeeds();
        return ownedXp < totalXpNeeded;
      }
      
      // Get resource for this material
      const resource = storage[materialId.toString()];
      if (!resource) return true; // If resource doesn't exist, consider it missing
      
      // Get owned quantity
      const owned = resource.QuantityOwned || 0;
      
      // Consider missing if owned < needed
      return owned < item.materialQuantity;
    })
    .map(item => {
      const materialId = item.material?.Id;
      
      // Special handling for special items (XP reports/balls)
      if (isSpecialItem(materialId)) {
        const { totalXpNeeded, ownedXp } = getSpecialItemNeeds();
        return {
          material: item.material,
          materialQuantity: totalXpNeeded,
          remaining: ownedXp - totalXpNeeded,
          type: 'xp' as const
        };
      }
      
      const resource = storage[materialId?.toString() || ''];
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
};

// Materials that are missing (negative leftover)
const missingMaterials = computed<MaterialWithRemaining[]>(() =>
  calculateMissingItems(
    totalMaterialsNeeded.value,
    getAllItemsFromCache,
    isExpReport,
    calculateExpNeeds
  )
);

// Equipments that are missing (negative leftover)
const missingEquipments = computed<MaterialWithRemaining[]>(() =>
  calculateMissingItems(
    totalEquipmentsNeeded.value,
    getAllEquipmentFromCache,
    isExpBall,
    calculateEquipmentExpNeeds
  )
);

// Students with gifts for the Gifts tab (Student → Gifts pattern)
const studentsWithGifts = computed(() => {
  return getStudentsWithGifts(activeMode.value);
});

// Gifts for the hovered student in Gifts tab tooltip
const giftsForHoveredStudent = computed(() => {
  if (hoveredStudentId.value === null) return [];
  return getGiftsForStudent(hoveredStudentId.value, activeMode.value);
});

// Computed property to get the resources based on active tab and mode
const displayResources = computed(() => {
  let resources: any[] = [];

  if (activeTab.value === 'materials') {
    resources = activeMode.value === 'needed' ? totalMaterialsNeeded.value : missingMaterials.value;
  } else if (activeTab.value === 'equipment') {
    resources = activeMode.value === 'needed' ? totalEquipmentsNeeded.value : missingEquipments.value;
  }
  // Note: Gifts tab uses studentsWithGifts computed, not displayResources

  const filtered = resources.filter(r => (r.materialQuantity ?? 0) > 0);

  // Sort to put credits first, then exp reports, then other materials
  return filtered.sort((a, b) => {
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

const totalMaterialQuantity = computed(() => {
  // For gifts tab, count students with gifts
  if (activeTab.value === 'gifts') {
    return studentsWithGifts.value.length;
  }
  return displayResources.value.reduce((sum, item) => {
    return sum + (item.materialQuantity ?? 0);
  }, 0);
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

// Helper function to get material icon source and alt text (Materials and Equipment tabs)
const getMaterialIconSrcAndAlt = (item: any): { src: string; alt: string } => {
  const isEquipmentTab = activeTab.value === 'equipment';
  return {
    src: getMaterialIconSrc(item, isEquipmentTab, currentExpIcon.value, currentExpBall.value),
    alt: getMaterialName(item, isEquipmentTab)
  };
};

// Helper function to format quantity
const formatQuantity = (item: any): string => {
  if (isExpReport(item.material?.Id) || isExpBall(item.material?.Id)) {
    return '';
  }

  let quantity = 0;
  
  if (activeMode.value === 'needed') {
    quantity = item.materialQuantity || 0;
  } else {
    quantity = Math.abs(item.remaining || 0);
  }
  
  return quantity > 0 ? formatLargeNumber(quantity) : '';
};

// Helper function to get quantity class
const getQuantityClass = (): string => {
  return activeMode.value === 'missing' ? 'negative' : '';
};

// Function to reset cache when view changes
const setTab = (tab: ViewTab) => {
  // Clear hover state and caches when switching tabs
  if (activeTab.value !== tab) {
    hoveredItemId.value = null;
    hoveredStudentId.value = null;
    materialUsageCache.value.clear();
    equipmentUsageCache.value.clear();
    xpCalculationCache.value = null;
  }

  activeTab.value = tab;
};

// Function to toggle mode
const toggleMode = () => {
  activeMode.value = activeMode.value === 'needed' ? 'missing' : 'needed';
  // Clear hover state when switching modes
  hoveredItemId.value = null;
  hoveredStudentId.value = null;
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
  hoveredStudentId.value = null;
};

// Show tooltip for student (Gifts tab - Student → Gifts pattern)
const showStudentTooltip = async (event: MouseEvent, studentId: number) => {
  hoveredStudentId.value = studentId;

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

// Hide student tooltip
const hideStudentTooltip = () => {
  if (!isHoveringTooltip.value) {
    hoveredStudentId.value = null;
  }
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

// Tooltip grid columns for gift display (Student → Gifts pattern)
const giftTooltipGridColumns = computed(() => getTooltipGridColumns(giftsForHoveredStudent.value.length));

// Helper function to format usage quantity
const formatUsageQuantity = (quantity: number, materialId?: number | null, equipmentTypes?: EquipmentType[]): string => {
  if (materialId && (isExpReport(materialId) || isExpBall(materialId))) {
    return quantity.toString();
  }
  return formatLargeNumber(quantity);
};

// Student usage data for the hovered material (Materials and Equipment tabs only)
// Gifts tab uses Student → Gifts pattern with giftsForHoveredStudent
const studentUsageForMaterial = computed(() => {
  if (hoveredItemId.value === null) return [];

  const materialId = hoveredItemId.value;
  const isEquipmentView = activeTab.value === 'equipment';

  // Use different cache based on the active tab
  const cache = isEquipmentView ? equipmentUsageCache.value : materialUsageCache.value;

  // Create a cache key that includes both material ID and current view
  const cacheKey = `${materialId}-${activeTab.value}-${activeMode.value}`;

  // For XP reports, credits, and XP balls, always get fresh data
  if (isExpReport(materialId) || materialId === 5 || isExpBall(materialId)) {
    const usage = isEquipmentView
      ? getEquipmentUsageByStudents(materialId, activeMode.value)
      : getMaterialUsageByStudents(materialId, activeMode.value);
    return usage.sort((a, b) => b.quantity - a.quantity); // Sort by highest quantity first
  }

  // Check if we already have cached data for this material and view mode
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // If not in cache, calculate and store in cache
  let usage: any[] = [];
  if (isEquipmentView) {
    usage = getEquipmentUsageByStudents(materialId, activeMode.value)
      .sort((a, b) => b.quantity - a.quantity); // Sort by highest quantity first
    equipmentUsageCache.value.set(cacheKey, usage);
  } else {
    usage = getMaterialUsageByStudents(materialId, activeMode.value)
      .sort((a, b) => b.quantity - a.quantity); // Sort by highest quantity first
    materialUsageCache.value.set(cacheKey, usage);
  }

  return usage;
});

// Add computed properties for credit quantities
const creditOwned = computed(() => {
  const resources = getAllItemsFromCache();
  return resources[5]?.QuantityOwned || 0;
});

const creditNeeded = computed(() => {
  const needed = totalMaterialsNeeded.value.find(m => m.material?.Id === 5);
  return needed?.materialQuantity || 0;
});

const creditRemaining = computed(() => Math.abs(creditOwned.value - creditNeeded.value));
const isCreditDeficit = computed(() => creditOwned.value < creditNeeded.value);
const isCreditSurplus = computed(() => creditOwned.value > creditNeeded.value);

// Helper function to create exp info computed property
const createExpInfo = (calculateFn: () => { totalXpNeeded: number; ownedXp: number }) => {
  return computed(() => {
    const { totalXpNeeded, ownedXp } = calculateFn();
    const remaining = ownedXp - totalXpNeeded;
    return {
      needed: totalXpNeeded,
      remaining: Math.abs(remaining),
      owned: ownedXp,
      isDeficit: remaining < 0,
      isSurplus: remaining > 0
    };
  });
};

// Add computed properties for EXP quantities
const expInfo = createExpInfo(() => calculateExpNeeds());

// Add computed properties for EXP balls quantities
const expBallInfo = createExpInfo(() => calculateEquipmentExpNeeds());

// Add computed property to get leftover quantity for a material (Materials and Equipment tabs)
const getMaterialLeftover = (materialId: number) => {
  const isEquipmentView = activeTab.value === 'equipment';
  const leftover = isEquipmentView ? equipmentsLeftover.value : materialsLeftover.value;
  const material = leftover.find(m => m.material?.Id === materialId);
  return material?.materialQuantity ?? 0;
};
</script>

<template>
  <div class="resource-summary">
    <!-- Main Tabs -->
    <div class="main-tabs">
      <button
        class="main-tab"
        :class="{ active: activeTab === 'materials' }"
        @click="setTab('materials')"
      >
        {{ $t('items') }}
      </button>
      <button
        class="main-tab"
        :class="{ active: activeTab === 'equipment' }"
        @click="setTab('equipment')"
      >
        {{ $t('equipment') }}
      </button>
      <button
        class="main-tab"
        :class="{ active: activeTab === 'gifts' }"
        @click="setTab('gifts')"
      >
        {{ $t('gifts') }}
      </button>
    </div>

    <!-- Mode Toggle -->
    <div class="mode-toggle-container">
      <button 
        class="mode-toggle"
        @click="toggleMode"
        :class="{ 'missing-mode': activeMode === 'missing' }"
      >
        <span class="toggle-icon">
          <svg v-if="activeMode === 'needed'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </span>
        <span class="toggle-text">
          {{ activeMode === 'needed' ? $t('showMissing') : $t('showNeeded') }}
        </span>
      </button>
      
      <div class="mode-indicator">
        <span class="current-mode">
          {{ activeMode === 'needed' ? $t('needed') : $t('missing') }}
        </span>
      </div>
    </div>
    
    <div class="resources-content">
      <div v-if="totalMaterialQuantity === 0" class="no-resources">
        <span v-if="activeMode === 'needed'">{{ $t('noResourcesNeeded') }}</span>
        <span v-else>{{ $t('allMaterialsAvailable') }}</span>
      </div>

      <!-- Materials and Equipment tabs: Show resource icons -->
      <div v-else-if="activeTab !== 'gifts'" class="resources-grid">
        <div
          v-for="(item, index) in displayResources"
          :key="`resource-${item.material?.Id || index}`"
          class="resource-item"
          :title="getMaterialName(item, activeTab === 'equipment')"
          @mousemove="showTooltip($event, item.material?.Id)"
          @mouseleave="hideTooltip()"
        >
          <div class="resource-content">
            <img
              v-if="item.material?.Icon && item.material.Icon !== 'unknown'"
              :src="getMaterialIconSrcAndAlt(item).src"
              :alt="getMaterialIconSrcAndAlt(item).alt"
              class="resource-icon"
            />
            <div
              v-else
              class="resource-icon missing-icon"
            >?</div>

            <div
              class="resource-quantity"
              :class="getQuantityClass()"
            >
              {{ formatQuantity(item) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Gifts tab: Show student icons (Student → Gifts pattern) -->
      <div v-else class="resources-grid">
        <div
          v-for="studentGift in studentsWithGifts"
          :key="`student-${studentGift.student.Id}`"
          class="resource-item student-gift-item"
          :title="studentGift.student.Name"
          @mousemove="showStudentTooltip($event, studentGift.student.Id)"
          @mouseleave="hideStudentTooltip()"
        >
          <div class="resource-content">
            <img
              :src="`https://schaledb.com/images/student/icon/${studentGift.student.Id}.webp`"
              :alt="studentGift.student.Name"
              class="resource-icon student-icon-gift"
            />
            <div
              class="resource-quantity"
              :class="getQuantityClass()"
            >
              {{ formatLargeNumber(studentGift.totalGifts) }}
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
        <!-- Credit Information Section -->
        <div v-if="hoveredItemId === 5" class="credit-info">
          <div class="credit-stats">
            <div class="stat">
              <span class="label">{{ $t('owned') }}</span>
              <span class="value">{{ formatLargeNumberAmount(creditOwned) }}</span>
            </div>
            <div class="stat">
              <span class="label">{{ $t('needed') }}</span>
              <span class="value">{{ formatLargeNumberAmount(creditNeeded) }}</span>
            </div>
            <div class="stat">
              <span class="label">{{ $t('remaining') }}</span>
              <span class="value" :class="{ 
                'negative': isCreditDeficit,
                'positive': isCreditSurplus 
              }">
                {{ formatLargeNumberAmount(creditRemaining) }}
              </span>
            </div>
          </div>
          <div class="separator"></div>
        </div>

        <!-- EXP Information Section -->
        <div v-if="hoveredItemId !== null && isExpReport(hoveredItemId)" class="credit-info">
          <div class="credit-stats">
            <div class="stat">
              <span class="label">{{ $t('owned') }}</span>
              <span class="value">{{ formatLargeNumberAmount(expInfo.owned) }}</span>
            </div>
            <div class="stat">
              <span class="label">{{ $t('needed') }}</span>
              <span class="value">{{ formatLargeNumberAmount(expInfo.needed) }}</span>
            </div>
            <div class="stat">
              <span class="label">{{ $t('remaining') }}</span>
              <span class="value" :class="{ 
                'negative': expInfo.isDeficit,
                'positive': expInfo.isSurplus 
              }">
                {{ formatLargeNumberAmount(expInfo.remaining) }}
              </span>
            </div>
          </div>
          <div class="separator"></div>
        </div>

        <!-- EXP Balls Information Section -->
        <div v-if="hoveredItemId !== null && isExpBall(hoveredItemId)" class="credit-info">
          <div class="credit-stats">
            <div class="stat">
              <span class="label">{{ $t('owned') }}</span>
              <span class="value">{{ formatLargeNumberAmount(expBallInfo.owned) }}</span>
            </div>
            <div class="stat">
              <span class="label">{{ $t('needed') }}</span>
              <span class="value">{{ formatLargeNumberAmount(expBallInfo.needed) }}</span>
            </div>
            <div class="stat">
              <span class="label">{{ $t('remaining') }}</span>
              <span class="value" :class="{ 
                'negative': expBallInfo.isDeficit,
                'positive': expBallInfo.isSurplus 
              }">
                {{ formatLargeNumberAmount(expBallInfo.remaining) }}
              </span>
            </div>
          </div>
          <div class="separator"></div>
        </div>

        <!-- Material Information Section -->
        <div
          v-if="hoveredItemId !== null && !isExpReport(hoveredItemId)
            && hoveredItemId !== 5 && !isExpBall(hoveredItemId)"
          class="credit-info"
        >
          <div class="credit-stats">
            <div class="stat">
              <span class="label">{{ $t('remaining') }}</span>
              <span class="value" :class="{ 
                'negative': getMaterialLeftover(hoveredItemId) < 0,
                'positive': getMaterialLeftover(hoveredItemId) > 0 
              }">
                {{ formatLargeNumberAmount(Math.abs(getMaterialLeftover(hoveredItemId))) }}
              </span>
            </div>
          </div>
          <div class="separator"></div>
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
            <span class="usage-quantity">
              {{ formatUsageQuantity(usage.quantity, hoveredItemId, usage.equipmentTypes) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Student → Gifts Tooltip (for Gifts tab) -->
      <div
        v-if="hoveredStudentId !== null && giftsForHoveredStudent.length > 0"
        class="material-tooltip"
        :style="{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
          '--grid-columns': giftTooltipGridColumns
        }"
        @mouseenter="handleTooltipMouseEnter"
        @mouseleave="handleTooltipMouseLeave"
      >
        <div class="gift-icons-grid">
          <div
            v-for="(giftItem, i) in giftsForHoveredStudent"
            :key="`gift-${i}`"
            class="gift-usage-item"
          >
            <img
              :src="`https://schaledb.com/images/item/icon/${giftItem.gift?.Icon}.webp`"
              :alt="giftItem.gift?.Name || 'Gift'"
              class="gift-icon"
            />
            <span class="usage-quantity">
              {{ formatLargeNumber(giftItem.quantity) }}
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

.main-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 10px;
}

.main-tab {
  padding: 6px 10px;
  font-size: 1em;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
  flex: 1;
}

.main-tab:hover {
  color: var(--text-primary);
}

.main-tab.active {
  color: var(--accent-color);
  border-bottom-color: var(--accent-color);
}

.main-tab:focus {
  outline: none;
}

.mode-toggle-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 0 5px;
}

.mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 500;
  transition: all 0.2s ease;
}

.mode-toggle:hover {
  background: var(--background-secondary);
  border-color: var(--accent-color);
}

.mode-toggle.missing-mode {
  background: rgba(255, 77, 79, 0.1);
  border-color: var(--error-color, #ff4d4f);
  color: var(--error-color, #ff4d4f);
}

.mode-toggle:focus {
  outline: none;
}

.toggle-icon {
  display: flex;
  align-items: center;
}

.mode-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-mode {
  font-size: 0.85em;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 8px;
  background: var(--background-secondary);
  border-radius: 4px;
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

/* Student icon in Gifts tab grid */
.student-gift-item {
  margin: 4px;
}

.student-icon-gift {
  border-radius: 50%;
  border: 2px solid var(--accent-color);
}

.student-gift-item:hover .student-icon-gift {
  transform: scale(1.05);
}

/* Gift icons grid in Student tooltip */
.gift-icons-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns, 3), minmax(40px, 1fr));
  gap: 2px;
  padding: 1px;
}

.gift-usage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 1px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.gift-usage-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.gift-icon {
  width: 80%;
  height: 80%;
  border-radius: 4px;
  transition: transform 0.2s;
}

.gift-usage-item:hover .gift-icon {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .main-tabs {
    flex-wrap: wrap;
  }
  
  .main-tab {
    font-size: 0.9em;
    padding: 10px 15px;
  }
  
  .mode-toggle-container {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
  
  .mode-toggle {
    justify-content: center;
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

/* Credit Info Styles */
.credit-info {
  padding: 6px;
  background: var(--background-primary);
  border-radius: 8px;
  margin-bottom: 6px;
}

.credit-stats {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.label {
  font-size: 0.75em;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value {
  font-size: 1em;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--card-background);
  padding: 2px 8px;
  border-radius: 4px;
  min-width: 60px;
  text-align: center;
}

.value.negative {
  color: var(--error-color, #ff4d4f);
  background: rgba(255, 77, 79, 0.1);
}

.value.positive {
  color: var(--success-color, #52c41a);
  background: rgba(82, 196, 26, 0.1);
}

.separator {
  height: 1px;
  background: var(--border-color);
  margin: 12px 0 0;
  opacity: 0.5;
}
</style> 