<script setup lang="ts">
import { ref } from 'vue';
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
type SummaryViewMode = 'needed' | 'missing';

const activeTab = ref<InventoryTab>('items');
const summaryMode = ref(false);
const summaryTab = ref<SummaryTab>('materials');
const summaryViewMode = ref<SummaryViewMode>('needed');

function handleResourceInput(id: string, event: Event) {
  emit('update-resource', id, event);
}

function handleEquipmentInput(id: string, event: Event) {
  emit('update-equipment', id, event);
}

const toggleSummaryMode = () => {
  const next = !summaryMode.value;

  if (next) {
    if (activeTab.value === 'equipment') {
      summaryTab.value = 'equipment';
    } else if (summaryTab.value === 'equipment') {
      summaryTab.value = 'materials';
    }
  }

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
            @click="activeTab = 'items'"
          >
            {{ $t('items') }}
          </button>
          <button
            :class="['inv-tab-btn', { active: activeTab === 'equipment' }]"
            @click="activeTab = 'equipment'"
          >
            {{ $t('equipment') }}
          </button>
        </template>
        <template v-else>
          <div class="inventory-tab-group">
            <button
              :class="['inv-tab-btn', { active: summaryTab === 'materials' }]"
              @click="summaryTab = 'materials'"
            >
              {{ $t('items') }}
            </button>
            <button
              :class="['inv-tab-btn', { active: summaryTab === 'equipment' }]"
              @click="summaryTab = 'equipment'"
            >
              {{ $t('equipment') }}
            </button>
            <button
              :class="['inv-tab-btn', { active: summaryTab === 'gifts' }]"
              @click="summaryTab = 'gifts'"
            >
              {{ $t('gifts') }}
            </button>
          </div>

          <div class="inventory-mode-segmented" role="tablist" :aria-label="$t('summary')">
            <button
              type="button"
              class="inventory-mode-btn"
              :class="{ active: summaryViewMode === 'needed' }"
              @click="summaryViewMode = 'needed'"
            >
              {{ $t('needed') }}
            </button>
            <button
              type="button"
              class="inventory-mode-btn"
              :class="{ active: summaryViewMode === 'missing' }"
              @click="summaryViewMode = 'missing'"
            >
              {{ $t('missing') }}
            </button>
          </div>
        </template>
      </div>

      <!-- Content -->
      <div class="inventory-content">
        <div v-if="!summaryMode && activeTab === 'items'" class="inventory-tab-content">
          <ItemsGrid
            :resource-form-data="resourceFormData"
            @update-resource="handleResourceInput"
          />
        </div>

        <div v-if="!summaryMode && activeTab === 'equipment'" class="inventory-tab-content">
          <EquipmentGrid
            :equipment-form-data="equipmentFormData"
            @update-equipment="handleEquipmentInput"
          />
        </div>

        <div v-if="summaryMode" class="inventory-tab-content">
          <ResourceSummary
            :active-tab-external="summaryTab"
            :active-mode-external="summaryViewMode"
            :show-category-tabs="false"
            :show-mode-tabs="false"
          />
        </div>
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
}

.inventory-tab-group {
  display: inline-flex;
  align-items: center;
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
  background: var(--accent-color);
  color: #fff;
}

.inventory-mode-btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
}

.inventory-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.inventory-tab-content {
  width: 100%;
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
