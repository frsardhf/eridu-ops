<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue';
import { $t } from '@/locales';
import { useStudentItems } from '@/lib/hooks/useStudentItems';
import { useStudentEquipment } from '@/lib/hooks/useStudentEquipment';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import ResourceGrid from './ResourceGrid.vue';
import ResourceSummary from './ResourceSummary.vue';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { useInventoryLayout } from '@/lib/hooks/useInventoryLayout';
import type { InventoryLayout } from '@/types/resource';

const props = withDefaults(
  defineProps<{
    initialTab?: InventoryTab;
  }>(),
  {
    initialTab: 'items',
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();
const { track } = useAnalytics();
const { inventoryLayout, setInventoryLayout: persistInventoryLayout } = useInventoryLayout();

// Modal mounts only when visible (v-if), so isVisible is always true here.
const { itemFormData, handleItemInput, loadItems, flushPendingItems } = useStudentItems({
  isVisible: true,
});
const { equipmentFormData, handleEquipmentInput, loadEquipments, flushPendingEquipments } =
  useStudentEquipment({
    isVisible: true,
  });

onMounted(async () => {
  await Promise.all([loadItems(), loadEquipments()]);
});

type InventoryTab = 'items' | 'equipment';
type SummaryTab = 'materials' | 'equipment' | 'gifts';
type SummaryViewMode = 'needed' | 'missing' | 'leftover';

const INVENTORY_TAB_ORDER: Record<InventoryTab, number> = {
  items: 0,
  equipment: 1,
};

const SUMMARY_TAB_ORDER: Record<SummaryTab, number> = {
  materials: 0,
  equipment: 1,
  gifts: 2,
};

const SUMMARY_MODE_ORDER: Record<SummaryViewMode, number> = {
  needed: 0,
  missing: 1,
  leftover: 2,
};

const activeTab = ref<InventoryTab>(props.initialTab);
const summaryMode = ref(false);
const summaryTab = ref<SummaryTab>('materials');
const summaryViewMode = ref<SummaryViewMode>('needed');
const contentDirection = ref<'forward' | 'backward'>('forward');
const viewType = ref<'aggregate' | 'per-student'>('aggregate');
const isClosing = ref(false);
const saveError = ref('');
const inventoryContentRef = ref<HTMLElement | null>(null);

const contentTransitionName = computed(() =>
  contentDirection.value === 'forward' ? 'inventory-pane-forward' : 'inventory-pane-backward',
);

const contentTransitionKey = computed(() => {
  if (summaryMode.value && viewType.value === 'per-student') return 'summary-per-student';
  return summaryMode.value
    ? `summary-${summaryTab.value}-${summaryViewMode.value}`
    : `inventory-${activeTab.value}`;
});

async function setInventoryTab(nextTab: InventoryTab) {
  if (nextTab === activeTab.value) return;
  contentDirection.value =
    INVENTORY_TAB_ORDER[nextTab] >= INVENTORY_TAB_ORDER[activeTab.value] ? 'forward' : 'backward';
  activeTab.value = nextTab;
  await nextTick();
  resetInventoryScroll();
}

async function setSummaryTab(nextTab: SummaryTab) {
  if (nextTab === summaryTab.value) return;
  contentDirection.value =
    SUMMARY_TAB_ORDER[nextTab] >= SUMMARY_TAB_ORDER[summaryTab.value] ? 'forward' : 'backward';
  summaryTab.value = nextTab;
  await nextTick();
  resetInventoryScroll();
}

async function setSummaryViewMode(nextMode: SummaryViewMode) {
  if (nextMode === summaryViewMode.value) return;
  contentDirection.value =
    SUMMARY_MODE_ORDER[nextMode] >= SUMMARY_MODE_ORDER[summaryViewMode.value]
      ? 'forward'
      : 'backward';
  summaryViewMode.value = nextMode;
  await nextTick();
  resetInventoryScroll();
}

const toggleSummaryMode = async () => {
  const previousIndex = summaryMode.value ? 2 : INVENTORY_TAB_ORDER[activeTab.value];
  const next = !summaryMode.value;

  if (next) {
    if (activeTab.value === 'equipment') {
      summaryTab.value = 'equipment';
    } else if (summaryTab.value === 'equipment') {
      summaryTab.value = 'materials';
    }
  } else {
    viewType.value = 'aggregate';
  }

  const nextIndex = next ? 2 : INVENTORY_TAB_ORDER[activeTab.value];
  contentDirection.value = nextIndex >= previousIndex ? 'forward' : 'backward';
  summaryMode.value = next;
  await nextTick();
  resetInventoryScroll();
};

async function setInventoryLayout(layout: InventoryLayout) {
  if (layout === inventoryLayout.value) return;
  persistInventoryLayout(layout);
  await nextTick();
  resetInventoryScroll();
}

function resetInventoryScroll() {
  if (inventoryContentRef.value) inventoryContentRef.value.scrollTop = 0;
}

function updateItem(id: string, event: Event): void {
  handleItemInput(id, event);
  track({ name: 'plan_action', feature: 'inventory', action: 'adjusted' });
}

function updateEquipment(id: string, event: Event): void {
  handleEquipmentInput(id, event);
  track({ name: 'plan_action', feature: 'inventory', action: 'adjusted' });
}

async function closeModal(): Promise<void> {
  if (isClosing.value) return;

  isClosing.value = true;
  saveError.value = '';
  try {
    await Promise.all([flushPendingItems(), flushPendingEquipments()]);
    emit('close');
  } catch (error) {
    console.error('Failed to save inventory before closing:', error);
    saveError.value = $t('saveChangesFailed');
    isClosing.value = false;
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  void closeModal();
}

useDocumentListener('keydown', handleKeyDown);
</script>

<template>
  <div class="inventory-backdrop" @click.self="closeModal">
    <div class="inventory-modal">
      <!-- Header row (above tabs) -->
      <div class="inventory-header">
        <div class="inventory-title">{{ $t('inventory') }}</div>
        <div class="inventory-header-actions">
          <div
            v-if="!summaryMode"
            class="inventory-layout-segmented"
            role="group"
            :aria-label="$t('inventoryLayout')"
          >
            <button
              type="button"
              class="inventory-layout-btn"
              :class="{ active: inventoryLayout === 'paged' }"
              :title="$t('pagedLayout')"
              :aria-pressed="inventoryLayout === 'paged'"
              @click="setInventoryLayout('paged')"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path fill="currentColor" d="M3 4h18v16H3V4zm2 2v12h14V6H5z" />
              </svg>
              <span>{{ $t('pagedLayout') }}</span>
            </button>
            <button
              type="button"
              class="inventory-layout-btn"
              :class="{ active: inventoryLayout === 'continuous' }"
              :title="$t('continuousLayout')"
              :aria-pressed="inventoryLayout === 'continuous'"
              @click="setInventoryLayout('continuous')"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M4 5h3v3H4V5zm5 0h11v3H9V5zM4 10.5h3v3H4v-3zm5 0h11v3H9v-3zM4 16h3v3H4v-3zm5 0h11v3H9v-3z"
                />
              </svg>
              <span>{{ $t('continuousLayout') }}</span>
            </button>
          </div>
          <button
            v-if="summaryMode"
            class="inventory-view-toggle"
            :class="{ active: viewType === 'per-student' }"
            @click="viewType = viewType === 'per-student' ? 'aggregate' : 'per-student'"
            :title="viewType === 'per-student' ? $t('aggregateView') : $t('perStudentView')"
            :aria-pressed="viewType === 'per-student'"
          >
            <!-- Person icon: shown when switching TO per-student -->
            <svg
              v-if="viewType === 'aggregate'"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              />
            </svg>
            <!-- Grid icon: shown when switching back TO aggregate -->
            <svg v-else viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" />
            </svg>
            <span>{{
              viewType === 'per-student' ? $t('aggregateView') : $t('perStudentView')
            }}</span>
          </button>
          <button
            class="inventory-summary-toggle"
            :class="{ active: summaryMode }"
            @click="toggleSummaryMode"
            :title="$t('summary')"
            :aria-pressed="summaryMode"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M4 19h4V9H4v10zm6 0h4V5h-4v14zm6 0h4v-7h-4v7z" />
            </svg>
            <span>{{ $t('summary') }}</span>
          </button>
          <button
            class="inventory-close"
            :disabled="isClosing"
            @click="closeModal"
            :title="$t('close')"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="saveError" class="inventory-save-error" role="alert">
        {{ saveError }}
      </div>

      <!-- Tab bar: hidden entirely in per-student view -->
      <div v-if="!summaryMode" class="inventory-tabs">
        <button
          :class="['inv-tab-btn', { active: activeTab === 'items' }]"
          @click="setInventoryTab('items')"
        >
          {{ $t('items') }}
        </button>
        <button
          :class="['inv-tab-btn', { active: activeTab === 'equipment' }]"
          @click="setInventoryTab('equipment')"
        >
          {{ $t('equipment') }}
        </button>
      </div>
      <div v-else-if="viewType !== 'per-student'" class="inventory-tabs">
        <div class="inventory-tab-group">
          <button
            :class="['inv-tab-btn', { active: summaryTab === 'materials' }]"
            @click="setSummaryTab('materials')"
          >
            {{ $t('items') }}
          </button>
          <button
            :class="['inv-tab-btn', { active: summaryTab === 'equipment' }]"
            @click="setSummaryTab('equipment')"
          >
            {{ $t('equipment') }}
          </button>
          <button
            :class="['inv-tab-btn', { active: summaryTab === 'gifts' }]"
            @click="setSummaryTab('gifts')"
          >
            {{ $t('gifts') }}
          </button>
        </div>

        <div class="inventory-mode-segmented" role="tablist" :aria-label="$t('summary')">
          <button
            type="button"
            :class="[
              'inventory-mode-btn',
              'inventory-mode-needed',
              { active: summaryViewMode === 'needed' },
            ]"
            @click="setSummaryViewMode('needed')"
          >
            {{ $t('needed') }}
          </button>
          <button
            type="button"
            :class="[
              'inventory-mode-btn',
              'inventory-mode-missing',
              { active: summaryViewMode === 'missing' },
            ]"
            @click="setSummaryViewMode('missing')"
          >
            {{ $t('missing') }}
          </button>
          <button
            type="button"
            :class="[
              'inventory-mode-btn',
              'inventory-mode-leftover',
              { active: summaryViewMode === 'leftover' },
            ]"
            @click="setSummaryViewMode('leftover')"
          >
            {{ $t('leftover') }}
          </button>
        </div>
      </div>

      <!-- Content -->
      <div ref="inventoryContentRef" class="inventory-content">
        <Transition :name="contentTransitionName" mode="out-in">
          <div :key="contentTransitionKey" class="inventory-tab-content inventory-pane-state">
            <ResourceGrid
              v-if="!summaryMode && activeTab === 'items'"
              variant="items"
              :form-data="itemFormData"
              :layout="inventoryLayout"
              @update="updateItem"
              @page-change="resetInventoryScroll"
            />

            <ResourceGrid
              v-else-if="!summaryMode && activeTab === 'equipment'"
              variant="equipment"
              :form-data="equipmentFormData"
              :layout="inventoryLayout"
              @update="updateEquipment"
              @page-change="resetInventoryScroll"
            />

            <ResourceSummary
              v-else
              :active-tab-external="summaryTab"
              :active-mode-external="summaryViewMode"
              :show-category-tabs="false"
              :show-mode-tabs="false"
              :view-type="viewType"
            />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inventory-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.inventory-modal {
  background: var(--background-primary);
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  max-width: 1100px;
  width: 87%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.inventory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.inventory-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.inventory-save-error {
  padding: 8px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-negative) 45%, var(--border-color));
  background: color-mix(in srgb, var(--color-negative) 10%, var(--background-primary));
  color: var(--color-negative);
  font-size: 0.85rem;
  text-align: center;
}

.inventory-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.inventory-layout-segmented {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-background);
}

.inventory-layout-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.inventory-layout-btn + .inventory-layout-btn {
  border-left: 1px solid var(--border-color);
}

.inventory-layout-btn:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
}

.inventory-layout-btn.active {
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 14%, var(--card-background));
}

.inventory-layout-btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: -2px;
}

.inventory-summary-toggle,
.inventory-view-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 600;
  font-size: 0.82rem;
}

.inventory-summary-toggle:hover,
.inventory-view-toggle:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.inventory-summary-toggle.active,
.inventory-view-toggle.active {
  border-color: var(--accent-color);
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-color) 16%, var(--background-primary));
}

.inventory-close {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.inventory-close:hover {
  background: rgba(255, 80, 80, 0.1);
  color: #ff5050;
}

.inventory-close:disabled {
  cursor: wait;
  opacity: 0.55;
}

.inventory-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-color);
  padding: 0 20px;
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.inventory-tab-group {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.inv-tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.inv-tab-btn.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent-color);
}

.inv-tab-btn:hover {
  background-color: var(--hover-bg);
}

.inventory-mode-segmented {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-background);
  flex: 0 0 auto;
}

.inventory-mode-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  padding: 5px 10px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  transition: all 0.2s ease;
}

.inventory-mode-btn + .inventory-mode-btn {
  border-left: 1px solid var(--border-color);
}

.inventory-mode-btn:hover {
  color: var(--text-primary);
}

.inventory-mode-btn.active {
  border-left-color: transparent;
}

.inventory-mode-btn.inventory-mode-needed.active {
  color: #1f4fd6;
  background: color-mix(in srgb, #1f4fd6 18%, var(--card-background));
}

.inventory-mode-btn.inventory-mode-missing.active {
  color: #c62828;
  background: color-mix(in srgb, #c62828 16%, var(--card-background));
}

.inventory-mode-btn.inventory-mode-leftover.active {
  color: #2e7d32;
  background: color-mix(in srgb, #2e7d32 18%, var(--card-background));
}

.inventory-mode-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 1px;
}

.inventory-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.inventory-tabs::-webkit-scrollbar {
  height: 6px;
}

.inventory-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.inventory-tabs::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 999px;
}

.inventory-tab-content {
  width: 100%;
}

.inventory-pane-state {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

:global(.inventory-modal-shell-enter-active),
:global(.inventory-modal-shell-leave-active) {
  transition: opacity var(--motion-duration-medium) var(--motion-ease-standard);
}

:global(.inventory-modal-shell-enter-from),
:global(.inventory-modal-shell-leave-to) {
  opacity: 0;
}

:global(.inventory-modal-shell-enter-active) .inventory-modal,
:global(.inventory-modal-shell-leave-active) .inventory-modal {
  transition:
    transform var(--motion-duration-medium) var(--motion-ease-standard),
    opacity var(--motion-duration-fast) var(--motion-ease-standard);
  will-change: transform, opacity;
}

:global(.inventory-modal-shell-enter-from) .inventory-modal {
  transform: translate3d(0, var(--motion-distance-sm), 0) scale(var(--motion-modal-fallback-scale));
  opacity: 0;
}

:global(.inventory-modal-shell-leave-to) .inventory-modal {
  transform: translate3d(0, 6px, 0) scale(0.995);
  opacity: 0;
}

.inventory-pane-forward-enter-active,
.inventory-pane-forward-leave-active,
.inventory-pane-backward-enter-active,
.inventory-pane-backward-leave-active {
  transition:
    transform var(--motion-duration-fast) var(--motion-ease-standard),
    opacity var(--motion-duration-fast) var(--motion-ease-standard);
  will-change: transform, opacity;
}

.inventory-pane-forward-enter-from,
.inventory-pane-backward-leave-to {
  opacity: 0;
  transform: translate3d(var(--motion-distance-sm), 0, 0);
}

.inventory-pane-forward-leave-to,
.inventory-pane-backward-enter-from {
  opacity: 0;
  transform: translate3d(calc(var(--motion-distance-sm) * -1), 0, 0);
}

@media (prefers-reduced-motion: reduce) {
  :global(.inventory-modal-shell-enter-active),
  :global(.inventory-modal-shell-leave-active),
  :global(.inventory-modal-shell-enter-active) .inventory-modal,
  :global(.inventory-modal-shell-leave-active) .inventory-modal,
  .inventory-pane-forward-enter-active,
  .inventory-pane-forward-leave-active,
  .inventory-pane-backward-enter-active,
  .inventory-pane-backward-leave-active {
    transition-duration: 1ms !important;
  }

  :global(.inventory-modal-shell-enter-from) .inventory-modal,
  :global(.inventory-modal-shell-leave-to) .inventory-modal,
  .inventory-pane-forward-enter-from,
  .inventory-pane-backward-leave-to,
  .inventory-pane-forward-leave-to,
  .inventory-pane-backward-enter-from {
    transform: none !important;
  }
}

@media (max-width: 976px) {
  .inventory-modal {
    width: 90%;
  }

  .inventory-summary-toggle span,
  .inventory-view-toggle span,
  .inventory-layout-btn span {
    display: none;
  }

  .inventory-summary-toggle,
  .inventory-view-toggle {
    padding: 6px;
  }

  .inventory-layout-btn {
    padding: 6px;
  }

  .inventory-mode-btn {
    padding: 5px 8px;
    font-size: 0.74rem;
  }
}
</style>
