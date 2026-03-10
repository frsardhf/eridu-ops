<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  formatLargeNumber,
  formatLargeNumberAmount,
  isExpReport,
  isExpBall,
  getMaterialName,
  getMaterialIconSrc,
} from '@/consumables/utils/materialUtils';
import { formatUsageQuantity } from '@/consumables/utils/tooltipUtils';
import { usePaginatedGrid } from '@/composables/usePaginatedGrid';
import { useResourceTooltip } from '@/composables/useResourceTooltip';
import { useResourceSummary, type ViewTab, type ViewMode } from '@/composables/useResourceSummary';
import { $t } from '@/locales';
import '@/styles/resourceDisplay.css';

const props = withDefaults(defineProps<{
  activeTabExternal?: ViewTab | null;
  activeModeExternal?: ViewMode | null;
  showCategoryTabs?: boolean;
  showModeTabs?: boolean;
}>(), {
  activeTabExternal: null,
  activeModeExternal: null,
  showCategoryTabs: true,
  showModeTabs: true
});

// UI state
const activeTab = ref<ViewTab>('materials');
const activeMode = ref<ViewMode>('needed');

// Animation state (exp-report and exp-ball icon cycling)
const currentExpIcon = ref(10); // Start with Novice report (ID: 10)
const currentExpBall = ref(1);  // Start with Novice exp ball (ID: 1)

const {
  studentsWithGifts, pagedLeftoverResources, leftoverByMaterialId,
  displayResources, hasDisplayResources, noResourcesText,
} = useResourceSummary(activeTab, activeMode);

const {
  hoveredItemId, hoveredStudentId, tooltipPosition, isHoveringTooltip,
  studentUsageForMaterial, giftsForHoveredStudent,
  tooltipGridColumns, giftTooltipGridColumns,
  creditOwned, creditNeeded, creditRemaining, isCreditDeficit, isCreditSurplus,
  expInfo, expBallInfo,
  showTooltip, hideTooltip, handleTooltipMouseEnter, handleTooltipMouseLeave,
  showStudentTooltip, hideStudentTooltip,
  getMaterialLeftover, clearHoverState,
} = useResourceTooltip(activeTab, activeMode);

const {
  currentPage: leftoverCurrentPage,
  totalPages: leftoverTotalPages,
  sliderStyle: leftoverSliderStyle,
  setPageRef: setLeftoverPageRef,
  goToPage: goToLeftoverPage
} = usePaginatedGrid(pagedLeftoverResources);

let expReportInterval: ReturnType<typeof setInterval> | null = null;
let expBallInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  expReportInterval = setInterval(() => {
    currentExpIcon.value = currentExpIcon.value === 13 ? 10 : currentExpIcon.value + 1;
  }, 1000);

  expBallInterval = setInterval(() => {
    currentExpBall.value = currentExpBall.value === 4 ? 1 : currentExpBall.value + 1;
  }, 1000);
});

onUnmounted(() => {
  if (expReportInterval) clearInterval(expReportInterval);
  if (expBallInterval) clearInterval(expBallInterval);
});

// Helper function to get material icon source and alt text (Materials and Equipment tabs)
const getMaterialIconSrcAndAlt = (item: any): { src: string; alt: string } => {
  const isEquipmentTab = activeTab.value === 'equipment';
  return {
    src: getMaterialIconSrc(item, isEquipmentTab, currentExpIcon.value, currentExpBall.value),
    alt: getMaterialName(item, isEquipmentTab)
  };
};

// Pre-compute icon src/alt and quantity text per item for needed and missing mode
const displayResourceStates = computed(() =>
  displayResources.value.map(item => {
    const { src, alt } = getMaterialIconSrcAndAlt(item);
    const isExp = isExpReport(item.material?.Id) || isExpBall(item.material?.Id);
    const quantity = isExp ? 0
      : activeMode.value === 'needed'  ? (item.materialQuantity || 0)
      : activeMode.value === 'missing' ? Math.abs(item.remaining || 0)
      : Math.max(0, item.remaining ?? item.materialQuantity ?? 0);
    return { ...item, iconSrc: src, iconAlt: alt, quantityText: formatLargeNumber(quantity) };
  })
);

// Pre-compute icon src/alt and quantity text per item for leftover mode
const pagedLeftoverResourceStates = computed(() =>
  pagedLeftoverResources.value.map(page =>
    page.map(item => {
      const { src, alt } = getMaterialIconSrcAndAlt(item);
      const isExp = isExpReport(item.material?.Id) || isExpBall(item.material?.Id);
      const quantity = isExp ? 0 : Math.max(0, item.remaining ?? item.materialQuantity ?? 0);
      return { ...item, iconSrc: src, iconAlt: alt, quantityText: formatLargeNumber(quantity) };
    })
  )
);

// Helper function to get quantity class
const getQuantityClass = (): string => {
  if (activeMode.value === 'missing') return 'negative';
  if (activeMode.value === 'leftover') return 'positive';
  return '';
};

const getLeftoverTooltipValue = (materialId: number | null): number => {
  if (materialId === null) return 0;

  const leftoverValue = leftoverByMaterialId.value.get(materialId);
  if (typeof leftoverValue === 'number') {
    return leftoverValue;
  }

  if (materialId === 5) {
    return creditRemaining.value;
  }

  if (isExpReport(materialId)) {
    return expInfo.value.remaining;
  }

  if (isExpBall(materialId)) {
    return expBallInfo.value.remaining;
  }

  return Math.max(0, getMaterialLeftover(materialId));
};

const setTab = (tab: ViewTab) => {
  if (activeTab.value !== tab) {
    clearHoverState();
  }
  activeTab.value = tab;
};

const setMode = (mode: ViewMode) => {
  if (mode === activeMode.value) return;
  activeMode.value = mode;
  clearHoverState();
};

watch(
  [activeTab, activeMode],
  () => {
    if (activeMode.value !== 'leftover') return;
    void goToLeftoverPage(0, undefined, true);
  }
);

watch(
  () => props.activeTabExternal,
  (tab) => {
    if (!tab || tab === activeTab.value) return;
    clearHoverState();
    activeTab.value = tab;
  },
  { immediate: true }
);

watch(
  () => props.activeModeExternal,
  (mode) => {
    if (!mode || mode === activeMode.value) return;
    clearHoverState();
    activeMode.value = mode;
  },
  { immediate: true }
);
</script>

<template>
  <div class="resource-summary">
    <div class="summary-toolbar">
      <div v-if="showCategoryTabs" class="view-segmented" role="tablist" aria-label="Summary category">
        <button
          type="button"
          class="view-segment-btn"
          :class="{ active: activeTab === 'materials' }"
          @click="setTab('materials')"
        >
          {{ $t('items') }}
        </button>
        <button
          type="button"
          class="view-segment-btn"
          :class="{ active: activeTab === 'equipment' }"
          @click="setTab('equipment')"
        >
          {{ $t('equipment') }}
        </button>
        <button
          type="button"
          class="view-segment-btn"
          :class="{ active: activeTab === 'gifts' }"
          @click="setTab('gifts')"
        >
          {{ $t('gifts') }}
        </button>
      </div>

      <span v-if="showCategoryTabs" class="toolbar-divider" aria-hidden="true"></span>

      <div v-if="showModeTabs" class="mode-segmented" role="tablist" aria-label="Summary mode">
        <button
          type="button"
          :class="['mode-segment-btn', 'mode-needed', { active: activeMode === 'needed' }]"
          @click="setMode('needed')"
        >
          {{ $t('needed') }}
        </button>
        <button
          type="button"
          :class="['mode-segment-btn', 'mode-missing', { active: activeMode === 'missing' }]"
          @click="setMode('missing')"
        >
          {{ $t('missing') }}
        </button>
        <button
          type="button"
          :class="['mode-segment-btn', 'mode-leftover', { active: activeMode === 'leftover' }]"
          @click="setMode('leftover')"
        >
          {{ $t('leftover') }}
        </button>
      </div>
    </div>
    
    <div class="resources-content">
      <div v-if="!hasDisplayResources" class="no-resources">
        <span>{{ noResourcesText }}</span>
      </div>

      <!-- Leftover mode: show full paginated catalog-style grids -->
      <div v-else-if="activeMode === 'leftover'" class="resources-tab">
        <div class="resources-container">
          <div class="resources-slider" :style="leftoverSliderStyle">
            <div
              v-for="(pageItems, pageIndex) in pagedLeftoverResourceStates"
              :key="`leftover-page-${pageIndex}`"
              :ref="(el) => setLeftoverPageRef(el, pageIndex)"
              class="resources-page"
              :aria-hidden="leftoverCurrentPage !== pageIndex"
            >
              <div class="resources-grid">
                <div
                  v-for="(item, itemIndex) in pageItems"
                  :key="`resource-${item.material?.Id || pageIndex}-${itemIndex}`"
                  class="resource-item"
                  :title="getMaterialName(item, activeTab === 'equipment')"
                  @mousemove="item.material?.Id && showTooltip($event, item.material.Id)"
                  @mouseleave="hideTooltip()"
                >
                  <div class="resource-content">
                    <img
                      v-if="item.material?.Icon && item.material.Icon !== 'unknown'"
                      :src="item.iconSrc"
                      :alt="item.iconAlt"
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
                      {{ item.quantityText }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="leftoverTotalPages > 1" class="resources-pagination">
          <div class="page-indicator">
            <button
              v-for="page in leftoverTotalPages"
              :key="`leftover-dot-${page}`"
              type="button"
              class="page-dot"
              :class="{ active: leftoverCurrentPage === page - 1 }"
              :aria-label="`Go to page ${page}`"
              :aria-current="leftoverCurrentPage === page - 1 ? 'page' : undefined"
              @click="goToLeftoverPage(page - 1)"
            ></button>
          </div>
        </div>
      </div>

      <!-- Needed/Missing materials and equipment -->
      <div v-else-if="activeTab !== 'gifts'" class="resources-grid-wrap">
        <div class="resources-grid">
          <div
            v-for="(item, index) in displayResourceStates"
            :key="`resource-${item.material?.Id || index}`"
            class="resource-item"
            :title="getMaterialName(item, activeTab === 'equipment')"
            @mousemove="item.material?.Id && showTooltip($event, item.material.Id)"
            @mouseleave="hideTooltip()"
          >
            <div class="resource-content">
              <img
                v-if="item.material?.Icon && item.material.Icon !== 'unknown'"
                :src="item.iconSrc"
                :alt="item.iconAlt"
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
                {{ item.quantityText }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Gifts tab: Show student icons (Student → Gifts pattern) -->
      <div v-else class="resources-grid-wrap">
        <div class="resources-grid">
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
      </div>
      
      <!-- Material Usage Tooltip -->
      <div 
        v-if="hoveredItemId !== null && (activeMode === 'leftover' || studentUsageForMaterial.length > 0)"
        class="material-tooltip"
        :style="{
          left: tooltipPosition.left,
          top: tooltipPosition.top,
          '--grid-columns': tooltipGridColumns
        }"
        @mouseenter="handleTooltipMouseEnter"
        @mouseleave="handleTooltipMouseLeave"
      >
        <div v-if="activeMode === 'leftover'" class="credit-info">
          <div class="credit-stats">
            <div class="stat">
              <span class="label">{{ $t('leftover') }}</span>
              <span class="value positive">
                {{ formatLargeNumberAmount(getLeftoverTooltipValue(hoveredItemId)) }}
              </span>
            </div>
          </div>
          <div class="separator"></div>
        </div>

        <!-- Credit Information Section -->
        <div v-if="activeMode !== 'leftover' && hoveredItemId === 5" class="credit-info">
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
        <div v-if="activeMode !== 'leftover' && hoveredItemId !== null && isExpReport(hoveredItemId)" class="credit-info">
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
        <div v-if="activeMode !== 'leftover' && hoveredItemId !== null && isExpBall(hoveredItemId)" class="credit-info">
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
          v-if="activeMode !== 'leftover' && hoveredItemId !== null && !isExpReport(hoveredItemId)
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

        <div v-if="studentUsageForMaterial.length > 0" class="student-icons-grid">
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
              {{ formatUsageQuantity(usage.quantity, hoveredItemId) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Student → Gifts Tooltip (for Gifts tab) -->
      <div
        v-if="hoveredStudentId !== null && giftsForHoveredStudent.length > 0"
        class="material-tooltip"
        :style="{
          left: tooltipPosition.left,
          top: tooltipPosition.top,
          '--grid-columns': giftTooltipGridColumns,
          pointerEvents: 'none'
        }"
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

.summary-toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  position: sticky;
  top: 0;
  z-index: 4;
  background: var(--background-secondary);
}

.view-segmented,
.mode-segmented {
  display: flex;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.view-segment-btn,
.mode-segment-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  padding: 7px 12px;
  cursor: pointer;
  font-size: 0.86em;
  font-weight: 600;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.view-segment-btn:hover,
.mode-segment-btn:hover {
  color: var(--text-primary);
}

.view-segment-btn.active {
  background: var(--accent-color);
  color: #fff;
}

.toolbar-divider {
  width: 1px;
  height: 28px;
  background: var(--border-color);
  opacity: 0.9;
  border-radius: 999px;
}

.view-segmented {
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
}

.mode-segmented {
  background: color-mix(in srgb, var(--card-background) 86%, var(--background-secondary));
}

.view-segment-btn {
  font-weight: 700;
}

.mode-segment-btn {
  font-size: 0.82em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.mode-segment-btn.active {
  border-left-color: transparent;
}

.mode-segment-btn.mode-needed.active {
  color: #1f4fd6;
  background: color-mix(in srgb, #1f4fd6 18%, var(--card-background));
}

.mode-segment-btn.mode-missing.active {
  color: #c62828;
  background: color-mix(in srgb, #c62828 16%, var(--card-background));
}

.mode-segment-btn.mode-leftover.active {
  color: #2e7d32;
  background: color-mix(in srgb, #2e7d32 18%, var(--card-background));
}

.view-segment-btn + .view-segment-btn,
.mode-segment-btn + .mode-segment-btn {
  border-left: 1px solid var(--border-color);
}

.view-segment-btn.active,
.mode-segment-btn.active {
  border-left-color: transparent;
}

.view-segment-btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
  border: 1px solid var(--border-color);
}

.mode-segment-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 1px;
  border: 1px solid var(--border-color);
}

.resources-content {
  flex: 1;
  background: var(--card-background);
  border-radius: 8px;
  padding: 5px;
  overflow-y: auto;
}

.resources-grid-wrap {
  display: flex;
  justify-content: center;
}

.resources-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.resources-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.resources-slider {
  display: flex;
  height: 100%;
  width: 100%;
}

.resources-page {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
}

.resources-page .resources-grid {
  width: 100%;
}

.resources-pagination {
  padding-top: 12px;
  display: flex;
  justify-content: center;
}

.page-indicator {
  display: flex;
  gap: 8px;
}

.page-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background-color: var(--border-color);
  transition: all 0.2s ease;
  cursor: pointer;
  padding: 0;
}

.page-dot.active {
  background-color: var(--accent-color);
  transform: scale(1.2);
}

.page-dot:hover {
  transform: scale(1.2);
}

.page-dot:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 3px;
}

.resources-grid-wrap :deep(.resources-grid) {
  grid-template-columns: repeat(auto-fill, minmax(65px, 1fr));
  justify-content: stretch;
  width: 100%;
  gap: 0;
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
  grid-template-columns: repeat(var(--grid-columns, 3), minmax(20px, 0.9fr));
  gap: 8px;
  padding: 4px;
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
  .summary-toolbar {
    position: static;
    padding-top: 2px;
  }

  .toolbar-divider {
    display: none;
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
