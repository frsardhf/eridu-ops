<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
import {
  formatLargeNumber,
  formatLargeNumberAmount,
  isExpReport,
  isExpBall,
  getMaterialName,
  getMaterialIconSrc,
} from '@/lib/utils/materialUtils';
import type { Material } from '@/types/upgrade';
import { formatUsageQuantity } from '@/lib/utils/tooltipUtils';
import { useResourceTooltip } from '@/composables/useResourceTooltip';
import { useResourceSummary, type ViewTab, type ViewMode } from '@/composables/useResourceSummary';
import { $t } from '@/locales';
import { getModeQuantityClass, getResourceQuantityClass } from '@/lib/utils/colorUtils';
import { getStudentIconUrl, getItemIconUrl } from '@/lib/utils/iconUtils';
import {
  getInventoryGroupId,
  type InventoryGroupId,
  type InventoryResourceType,
} from '@/lib/utils/resourceGroupUtils';
import type { InventoryLayout } from '@/types/resource';
import '@/styles/resourceDisplay.css';

const props = withDefaults(
  defineProps<{
    activeGroup: InventoryGroupId;
    activeMode: ViewMode;
    layout?: InventoryLayout;
    viewType?: 'aggregate' | 'per-student';
  }>(),
  {
    layout: 'paged',
    viewType: 'aggregate',
  },
);

const emit = defineEmits<{
  (e: 'group-change', group: InventoryGroupId): void;
}>();

const activeTab = computed<ViewTab>(() => {
  if (props.activeGroup === 'equipment') return 'equipment';
  if (props.activeGroup === 'gifts') return 'gifts';
  return 'materials';
});
const activeMode = computed(() => props.activeMode);
const tooltipTab = ref<ViewTab>(activeTab.value);
const summaryRef = ref<HTMLElement | null>(null);

// Animation state (exp-report and exp-ball icon cycling)
const currentExpIcon = ref(10); // Start with Novice report (ID: 10)
const currentExpBall = ref(1); // Start with Novice exp ball (ID: 1)

const {
  studentsWithGifts,
  materialResourcesForMode,
  equipmentResourcesForMode,
  giftResourcesForMode,
  noResourcesText,
  allStudentMaterialRows,
} = useResourceSummary(activeMode);

const {
  hoveredItemId,
  hoveredStudentId,
  tooltipPosition,
  studentUsageForMaterial,
  giftsForHoveredStudent,
  tooltipGridColumns,
  giftTooltipGridColumns,
  creditOwned,
  creditNeeded,
  creditRemaining,
  expInfo,
  expBallInfo,
  showTooltip,
  hideTooltip,
  handleTooltipMouseEnter,
  handleTooltipMouseLeave,
  showStudentTooltip,
  hideStudentTooltip,
  getMaterialLeftover,
  clearHoverState,
} = useResourceTooltip(tooltipTab, activeMode);

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

// Per-student chip tooltip (XP items + credits)
const chipTooltipData = ref<{ quantity: number; label: string } | null>(null);
const chipTooltipPos = ref({ left: '0px', top: '0px' });

function showChipTooltip(e: MouseEvent, quantity: number, label: string) {
  chipTooltipData.value = { quantity, label };
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const tipWidth = 140;
  const left =
    rect.right + 6 + tipWidth > window.innerWidth ? rect.left - tipWidth - 6 : rect.right + 6;
  chipTooltipPos.value = { left: `${left}px`, top: `${rect.top}px` };
}

function hideChipTooltip() {
  chipTooltipData.value = null;
}

const getMaterialIconSrcAndAlt = (
  item: Material,
  itemType: InventoryResourceType,
): { src: string; alt: string } => {
  return {
    src: getMaterialIconSrc(
      item,
      itemType === 'equipment',
      currentExpIcon.value,
      currentExpBall.value,
    ),
    alt: getMaterialName(item),
  };
};

interface SummaryGroup {
  id: InventoryGroupId;
  labelKey: 'general' | 'academy' | 'gifts' | 'equipment';
  itemType: InventoryResourceType;
  resources: (Material & { remaining?: number })[];
  showsStudents?: boolean;
}

const summaryGroups = computed<SummaryGroup[]>(() => {
  const materialGroups = materialResourcesForMode.value.reduce(
    (groups, resource) => {
      if (!resource.material) return groups;
      const groupId = getInventoryGroupId(resource.material, 'resource');
      if (groupId === 'general' || groupId === 'academy') groups[groupId].push(resource);
      return groups;
    },
    {
      general: [] as (Material & { remaining?: number })[],
      academy: [] as (Material & { remaining?: number })[],
    },
  );

  const groups: SummaryGroup[] = [
    { id: 'general', labelKey: 'general', itemType: 'resource', resources: materialGroups.general },
    { id: 'academy', labelKey: 'academy', itemType: 'resource', resources: materialGroups.academy },
    {
      id: 'gifts',
      labelKey: 'gifts',
      itemType: 'resource',
      resources: giftResourcesForMode.value,
      showsStudents: activeMode.value !== 'leftover',
    },
    {
      id: 'equipment',
      labelKey: 'equipment',
      itemType: 'equipment',
      resources: equipmentResourcesForMode.value,
    },
  ];

  return groups.filter((group) =>
    group.showsStudents ? studentsWithGifts.value.length > 0 : group.resources.length > 0,
  );
});

const summaryGroupStates = computed(() =>
  summaryGroups.value.map((group) => ({
    ...group,
    resourceStates: group.resources.map((item) => {
      const { src, alt } = getMaterialIconSrcAndAlt(item, group.itemType);
      const isExp = isExpReport(item.material?.Id) || isExpBall(item.material?.Id);
      const quantity = isExp
        ? 0
        : activeMode.value === 'needed'
          ? item.materialQuantity || 0
          : activeMode.value === 'missing'
            ? Math.abs(item.remaining || 0)
            : Math.max(0, item.remaining ?? item.materialQuantity ?? 0);
      return { ...item, iconSrc: src, iconAlt: alt, quantityText: formatLargeNumber(quantity) };
    }),
  })),
);

const visibleGroupStates = computed(() =>
  props.layout === 'continuous'
    ? summaryGroupStates.value
    : summaryGroupStates.value.filter((group) => group.id === props.activeGroup),
);

watch(
  [summaryGroups, () => props.activeGroup, () => props.activeMode],
  ([groups, activeGroup]) => {
    clearHoverState();
    if (groups.length > 0 && !groups.some((group) => group.id === activeGroup)) {
      emit('group-change', groups[0].id);
    }
  },
  { immediate: true },
);

async function selectGroup(groupId: InventoryGroupId) {
  emit('group-change', groupId);
  clearHoverState();
  if (props.layout !== 'continuous') return;
  await nextTick();
  summaryRef.value
    ?.querySelector<HTMLElement>(`#summary-resource-section-${groupId}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showGroupTooltip(event: MouseEvent, itemId: number, group: SummaryGroup) {
  tooltipTab.value =
    group.id === 'equipment' ? 'equipment' : group.id === 'gifts' ? 'gifts' : 'materials';
  showTooltip(event, itemId);
}
</script>

<template>
  <div ref="summaryRef" class="resource-summary">
    <div
      v-if="props.viewType !== 'per-student' && summaryGroups.length > 0"
      class="resource-group-tabs"
      :role="layout === 'paged' ? 'tablist' : 'navigation'"
      :aria-label="$t('inventory')"
    >
      <button
        v-for="group in summaryGroups"
        :id="`summary-resource-tab-${group.id}`"
        :key="group.id"
        type="button"
        :role="layout === 'paged' ? 'tab' : undefined"
        class="resource-group-tab"
        :class="{ active: activeGroup === group.id }"
        :aria-selected="layout === 'paged' ? activeGroup === group.id : undefined"
        :aria-controls="`summary-resource-section-${group.id}`"
        @click="selectGroup(group.id)"
      >
        {{ $t(group.labelKey) }}
      </button>
    </div>

    <div class="resources-content">
      <!-- Per-student view -->
      <template v-if="props.viewType === 'per-student'">
        <div class="per-student-list">
          <div v-for="row in allStudentMaterialRows" :key="row.student.Id" class="student-row">
            <div class="student-info">
              <img
                :src="getStudentIconUrl(row.student.Id)"
                :alt="row.student.Name"
                class="per-student-icon"
              />
              <span class="per-student-name">{{ row.student.Name }}</span>
            </div>
            <div class="student-materials">
              <div
                v-for="(mat, materialIndex) in row.materials"
                :key="`${mat.type}-${mat.material?.Id ?? materialIndex}`"
                class="resource-item per-student-mat-item"
                :title="
                  mat.type !== 'xp' && mat.material?.Id !== 5 ? mat.material?.Name : undefined
                "
                @mouseenter="
                  mat.type === 'xp' || mat.material?.Id === 5
                    ? showChipTooltip($event, mat.materialQuantity, $t('needed'))
                    : undefined
                "
                @mouseleave="
                  mat.type === 'xp' || mat.material?.Id === 5 ? hideChipTooltip() : undefined
                "
              >
                <div class="resource-content">
                  <img
                    :src="
                      getMaterialIconSrc(
                        mat,
                        mat.type === 'equipments',
                        currentExpIcon,
                        currentExpBall,
                      )
                    "
                    class="resource-icon"
                    :alt="mat.material?.Name"
                  />
                  <span v-if="mat.type !== 'xp'" class="resource-quantity">{{
                    formatLargeNumber(mat.materialQuantity)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
          <p v-if="allStudentMaterialRows.length === 0" class="no-resources-msg">
            {{ $t('noResourcesNeeded') }}
          </p>
        </div>

        <!-- Per-student chip tooltip (XP items + credits) -->
        <div
          v-if="chipTooltipData"
          class="material-tooltip"
          :style="{ left: chipTooltipPos.left, top: chipTooltipPos.top, 'pointer-events': 'none' }"
        >
          <div class="credit-info" style="margin-bottom: 0">
            <div class="credit-stats">
              <div class="stat">
                <span class="label">{{ chipTooltipData.label }}</span>
                <span class="value">{{ formatLargeNumberAmount(chipTooltipData.quantity) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Aggregate view -->
      <template v-else>
        <div v-if="summaryGroups.length === 0" class="no-resources">
          <span>{{ noResourcesText }}</span>
        </div>

        <div v-else class="summary-groups" :class="{ continuous: layout === 'continuous' }">
          <section
            v-for="group in visibleGroupStates"
            :id="`summary-resource-section-${group.id}`"
            :key="group.id"
            :class="{ 'resource-section': layout === 'continuous' }"
            :role="layout === 'paged' ? 'tabpanel' : undefined"
            :aria-labelledby="`summary-resource-tab-${group.id}`"
          >
            <header v-if="layout === 'continuous'" class="resource-section-header">
              <h3>{{ $t(group.labelKey) }}</h3>
            </header>

            <div class="resources-grid">
              <template v-if="group.showsStudents">
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
                      :src="getStudentIconUrl(studentGift.student.Id)"
                      :alt="studentGift.student.Name"
                      class="resource-icon student-icon-gift"
                    />
                    <div class="resource-quantity" :class="getModeQuantityClass(activeMode)">
                      {{ formatLargeNumber(studentGift.totalGifts) }}
                    </div>
                  </div>
                </div>
              </template>

              <template v-else>
                <div
                  v-for="(item, itemIndex) in group.resourceStates"
                  :key="`${group.itemType}-${item.material?.Id ?? itemIndex}`"
                  class="resource-item"
                  :title="getMaterialName(item)"
                  @mousemove="
                    item.material?.Id && showGroupTooltip($event, item.material.Id, group)
                  "
                  @mouseleave="hideTooltip()"
                >
                  <div class="resource-content">
                    <img
                      v-if="item.material?.Icon && item.material.Icon !== 'unknown'"
                      :src="item.iconSrc"
                      :alt="item.iconAlt"
                      class="resource-icon"
                    />
                    <div v-else class="resource-icon missing-icon">?</div>
                    <div class="resource-quantity" :class="getModeQuantityClass(activeMode)">
                      {{ item.quantityText }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </section>
        </div>

        <!-- Material Usage Tooltip -->
        <div
          v-if="
            hoveredItemId !== null &&
            ((activeMode === 'leftover' &&
              (hoveredItemId === 5 || isExpReport(hoveredItemId) || isExpBall(hoveredItemId))) ||
              (activeMode !== 'leftover' && studentUsageForMaterial.length > 0))
          "
          class="material-tooltip"
          :style="{
            left: tooltipPosition.left,
            top: tooltipPosition.top,
            '--grid-columns': tooltipGridColumns,
          }"
          @mouseenter="handleTooltipMouseEnter"
          @mouseleave="handleTooltipMouseLeave"
        >
          <!-- Leftover mode: Credits -->
          <div
            v-if="activeMode === 'leftover' && hoveredItemId === 5"
            class="credit-info"
            style="margin-bottom: 0"
          >
            <div class="credit-stats">
              <div class="stat">
                <span class="label">{{ $t('owned') }}</span>
                <span class="value">{{ formatLargeNumberAmount(creditOwned) }}</span>
              </div>
              <div class="stat">
                <span class="label">{{ $t('leftover') }}</span>
                <span class="value positive">{{ formatLargeNumberAmount(creditRemaining) }}</span>
              </div>
            </div>
          </div>

          <!-- Leftover mode: EXP Reports -->
          <div
            v-if="activeMode === 'leftover' && hoveredItemId !== null && isExpReport(hoveredItemId)"
            class="credit-info"
            style="margin-bottom: 0"
          >
            <div class="credit-stats">
              <div class="stat">
                <span class="label">{{ $t('owned') }}</span>
                <span class="value">{{ formatLargeNumberAmount(expInfo.owned) }}</span>
              </div>
              <div class="stat">
                <span class="label">{{ $t('leftover') }}</span>
                <span class="value positive">{{ formatLargeNumberAmount(expInfo.remaining) }}</span>
              </div>
            </div>
          </div>

          <!-- Leftover mode: EXP Balls -->
          <div
            v-if="activeMode === 'leftover' && hoveredItemId !== null && isExpBall(hoveredItemId)"
            class="credit-info"
            style="margin-bottom: 0"
          >
            <div class="credit-stats">
              <div class="stat">
                <span class="label">{{ $t('owned') }}</span>
                <span class="value">{{ formatLargeNumberAmount(expBallInfo.owned) }}</span>
              </div>
              <div class="stat">
                <span class="label">{{ $t('leftover') }}</span>
                <span class="value positive">{{
                  formatLargeNumberAmount(expBallInfo.remaining)
                }}</span>
              </div>
            </div>
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
                <span class="value" :class="getResourceQuantityClass(creditRemaining)">
                  {{ formatLargeNumberAmount(creditRemaining) }}
                </span>
              </div>
            </div>
            <div class="separator"></div>
          </div>

          <!-- EXP Information Section -->
          <div
            v-if="activeMode !== 'leftover' && hoveredItemId !== null && isExpReport(hoveredItemId)"
            class="credit-info"
          >
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
                <span class="value" :class="getResourceQuantityClass(expInfo.remaining)">
                  {{ formatLargeNumberAmount(expInfo.remaining) }}
                </span>
              </div>
            </div>
            <div class="separator"></div>
          </div>

          <!-- EXP Balls Information Section -->
          <div
            v-if="activeMode !== 'leftover' && hoveredItemId !== null && isExpBall(hoveredItemId)"
            class="credit-info"
          >
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
                <span class="value" :class="getResourceQuantityClass(expBallInfo.remaining)">
                  {{ formatLargeNumberAmount(expBallInfo.remaining) }}
                </span>
              </div>
            </div>
            <div class="separator"></div>
          </div>

          <!-- Material Information Section -->
          <div
            v-if="
              activeMode !== 'leftover' &&
              hoveredItemId !== null &&
              !isExpReport(hoveredItemId) &&
              hoveredItemId !== 5 &&
              !isExpBall(hoveredItemId)
            "
            class="credit-info"
          >
            <div class="credit-stats">
              <div class="stat">
                <span class="label">{{ $t('remaining') }}</span>
                <span
                  class="value"
                  :class="getResourceQuantityClass(getMaterialLeftover(hoveredItemId))"
                >
                  {{ formatLargeNumberAmount(Math.abs(getMaterialLeftover(hoveredItemId))) }}
                </span>
              </div>
            </div>
            <div class="separator"></div>
          </div>

          <div
            v-if="activeMode !== 'leftover' && studentUsageForMaterial.length > 0"
            class="student-icons-grid"
          >
            <div
              v-for="(usage, i) in studentUsageForMaterial"
              :key="`usage-${i}`"
              class="student-usage-item"
            >
              <img
                :src="getStudentIconUrl(usage.student.Id)"
                :alt="usage.student.Name"
                class="student-icon"
              />
              <span class="usage-quantity">
                {{ formatUsageQuantity(usage.quantity, hoveredItemId) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Student -> Gifts Tooltip (for Gifts tab) -->
        <div
          v-if="hoveredStudentId !== null && giftsForHoveredStudent.length > 0"
          class="material-tooltip"
          :style="{
            left: tooltipPosition.left,
            top: tooltipPosition.top,
            '--grid-columns': giftTooltipGridColumns,
            pointerEvents: 'none',
          }"
        >
          <div class="gift-icons-grid">
            <div
              v-for="(giftItem, i) in giftsForHoveredStudent"
              :key="`gift-${i}`"
              class="gift-usage-item"
            >
              <img
                :src="getItemIconUrl(giftItem.gift?.Icon ?? '', 'item')"
                :alt="giftItem.gift?.Name || 'Gift'"
                class="gift-icon"
              />
              <span class="usage-quantity">
                {{ formatLargeNumber(giftItem.quantity) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Only keep component-specific styles */
.resource-summary {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
}

.resources-content {
  flex: 1;
  background: var(--card-background);
  border-radius: 8px;
  padding: 5px;
}

.summary-groups.continuous {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

/* Per-student list layout */
.per-student-list {
  overflow-y: auto;
  flex: 1;
}

.student-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--border-color);
}
.student-row:last-child {
  border-bottom: none;
}

.student-info {
  flex-shrink: 0;
  width: 65px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 0;
}

.per-student-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
}

.per-student-name {
  font-size: 0.62em;
  text-align: center;
  color: var(--text-secondary);
  line-height: 1.2;
  word-break: break-word;
}

.student-materials {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
}

.per-student-mat-item {
  width: 65px;
  height: 65px;
  flex-shrink: 0;
}

.no-resources-msg {
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 20px;
  margin: 0;
}
</style>
