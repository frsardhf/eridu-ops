<script setup lang="ts">
import { computed, ref } from 'vue';
import { $t } from '@/locales';
import ItemsGrid from './ItemsGrid.vue';
import EquipmentGrid from './EquipmentGrid.vue';
import ResourceSummary from './ResourceSummary.vue';

const props = defineProps<{
  resourceFormData: Record<string, number>,
  equipmentFormData: Record<string, number>
}>();

const emit = defineEmits<{
  (e: 'close'): void,
  (e: 'update-resource', id: string, event: Event): void,
  (e: 'update-equipment', id: string, event: Event): void
}>();

type InventoryTab = 'items' | 'equipment';
type SummaryTab = 'materials' | 'equipment' | 'gifts';
type SummaryViewMode = 'needed' | 'missing' | 'leftover';

const INVENTORY_TAB_ORDER: Record<InventoryTab, number> = {
  items: 0,
  equipment: 1
};

const SUMMARY_TAB_ORDER: Record<SummaryTab, number> = {
  materials: 0,
  equipment: 1,
  gifts: 2
};

const SUMMARY_MODE_ORDER: Record<SummaryViewMode, number> = {
  needed: 0,
  missing: 1,
  leftover: 2
};

const activeTab = ref<InventoryTab>('items');
const summaryMode = ref(false);
const summaryTab = ref<SummaryTab>('materials');
const summaryViewMode = ref<SummaryViewMode>('needed');
const contentDirection = ref<'forward' | 'backward'>('forward');

const contentTransitionName = computed(() =>
  contentDirection.value === 'forward' ? 'inventory-pane-forward' : 'inventory-pane-backward'
);

const contentTransitionKey = computed(() =>
  summaryMode.value
    ? `summary-${summaryTab.value}-${summaryViewMode.value}`
    : `inventory-${activeTab.value}`
);

function setInventoryTab(nextTab: InventoryTab) {
  if (nextTab === activeTab.value) return;
  contentDirection.value = INVENTORY_TAB_ORDER[nextTab] >= INVENTORY_TAB_ORDER[activeTab.value]
    ? 'forward'
    : 'backward';
  activeTab.value = nextTab;
}

function setSummaryTab(nextTab: SummaryTab) {
  if (nextTab === summaryTab.value) return;
  contentDirection.value = SUMMARY_TAB_ORDER[nextTab] >= SUMMARY_TAB_ORDER[summaryTab.value]
    ? 'forward'
    : 'backward';
  summaryTab.value = nextTab;
}

function setSummaryViewMode(nextMode: SummaryViewMode) {
  if (nextMode === summaryViewMode.value) return;
  contentDirection.value = SUMMARY_MODE_ORDER[nextMode] >= SUMMARY_MODE_ORDER[summaryViewMode.value]
    ? 'forward'
    : 'backward';
  summaryViewMode.value = nextMode;
}

const toggleSummaryMode = () => {
  const previousIndex = summaryMode.value ? 2 : INVENTORY_TAB_ORDER[activeTab.value];
  const next = !summaryMode.value;

  if (next) {
    if (activeTab.value === 'equipment') {
      summaryTab.value = 'equipment';
    } else if (summaryTab.value === 'equipment') {
      summaryTab.value = 'materials';
    }
  }

  const nextIndex = next ? 2 : INVENTORY_TAB_ORDER[activeTab.value];
  contentDirection.value = nextIndex >= previousIndex ? 'forward' : 'backward';
  summaryMode.value = next;
};
</script>

<template>
  <div class="inventory-backdrop" @click.self="emit('close')">
    <div class="inventory-modal">
      <!-- Header row (above tabs) -->
      <div class="inventory-header">
        <div class="inventory-title">{{ $t('inventory') }}</div>
        <div class="inventory-header-actions">
          <button
            class="inventory-summary-toggle"
            :class="{ active: summaryMode }"
            @click="toggleSummaryMode"
            :title="$t('summary')"
            :aria-pressed="summaryMode"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M4 19h4V9H4v10zm6 0h4V5h-4v14zm6 0h4v-7h-4v7z"/>
            </svg>
            <span>{{ $t('summary') }}</span>
          </button>
          <button class="inventory-close" @click="emit('close')" :title="$t('close')">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Tab bar -->
      <div class="inventory-tabs">
        <template v-if="!summaryMode">
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
        </template>
        <template v-else>
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
              :class="['inventory-mode-btn', 'inventory-mode-needed', { active: summaryViewMode === 'needed' }]"
              @click="setSummaryViewMode('needed')"
            >
              {{ $t('needed') }}
            </button>
            <button
              type="button"
              :class="['inventory-mode-btn', 'inventory-mode-missing', { active: summaryViewMode === 'missing' }]"
              @click="setSummaryViewMode('missing')"
            >
              {{ $t('missing') }}
            </button>
            <button
              type="button"
              :class="['inventory-mode-btn', 'inventory-mode-leftover', { active: summaryViewMode === 'leftover' }]"
              @click="setSummaryViewMode('leftover')"
            >
              {{ $t('leftover') }}
            </button>
          </div>
        </template>
      </div>

      <!-- Content -->
      <div class="inventory-content">
        <Transition :name="contentTransitionName" mode="out-in">
          <div :key="contentTransitionKey" class="inventory-tab-content">
            <ItemsGrid
              v-if="!summaryMode && activeTab === 'items'"
              :resource-form-data="resourceFormData"
              @update-resource="(id, e) => emit('update-resource', id, e)"
            />

            <EquipmentGrid
              v-else-if="!summaryMode && activeTab === 'equipment'"
              :equipment-form-data="equipmentFormData"
              @update-equipment="(id, e) => emit('update-equipment', id, e)"
            />

            <ResourceSummary
              v-else
              :active-tab-external="summaryTab"
              :active-mode-external="summaryViewMode"
              :show-category-tabs="false"
              :show-mode-tabs="false"
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

.inventory-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.inventory-summary-toggle {
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

.inventory-summary-toggle:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.inventory-summary-toggle.active {
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
  transition: transform var(--motion-duration-medium) var(--motion-ease-standard),
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
  transition: transform var(--motion-duration-fast) var(--motion-ease-standard),
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

  .inventory-summary-toggle span {
    display: none;
  }

  .inventory-summary-toggle {
    padding: 6px;
  }

  .inventory-mode-btn {
    padding: 5px 8px;
    font-size: 0.74rem;
  }
}
</style>
