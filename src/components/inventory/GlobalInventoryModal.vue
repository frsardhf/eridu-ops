<script setup lang="ts">
import { ref } from 'vue';
import { $t } from '../../locales';
import StudentItemsGrid from '../students/modal/studentInventory/StudentItemsGrid.vue';
import StudentEquipmentGrid from '../students/modal/studentInventory/StudentEquipmentGrid.vue';
import StudentResourceSummary from '../students/modal/studentInventory/StudentResourceSummary.vue';

const props = defineProps<{
  resourceFormData: Record<string, number>,
  equipmentFormData: Record<string, number>
}>();

const emit = defineEmits<{
  (e: 'close'): void,
  (e: 'update-resource', id: string, event: Event): void,
  (e: 'update-equipment', id: string, event: Event): void
}>();

const activeTab = ref('items');

function handleResourceInput(id: string, event: Event) {
  emit('update-resource', id, event);
}

function handleEquipmentInput(id: string, event: Event) {
  emit('update-equipment', id, event);
}
</script>

<template>
  <div class="inventory-backdrop" @click.self="emit('close')">
    <div class="inventory-modal">
      <!-- Header row (above tabs) -->
      <div class="inventory-header">
        <div class="inventory-title">{{ $t('inventory') }}</div>
        <button class="inventory-close" @click="emit('close')" :title="$t('close')">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <!-- Tab bar -->
      <div class="inventory-tabs">
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
        <button
          :class="['inv-tab-btn', { active: activeTab === 'summary' }]"
          @click="activeTab = 'summary'"
        >
          {{ $t('summary') }}
        </button>
      </div>

      <!-- Content -->
      <div class="inventory-content">
        <div v-if="activeTab === 'items'" class="inventory-tab-content">
          <StudentItemsGrid
            :resource-form-data="resourceFormData"
            @update-resource="handleResourceInput"
          />
        </div>

        <div v-if="activeTab === 'equipment'" class="inventory-tab-content">
          <StudentEquipmentGrid
            :equipment-form-data="equipmentFormData"
            @update-equipment="handleEquipmentInput"
          />
        </div>

        <div v-if="activeTab === 'summary'" class="inventory-tab-content">
          <StudentResourceSummary />
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
  max-width: 1000px;
  width: 75%;
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
  border-bottom: 1px solid var(--border-color);
  padding: 0 20px;
  flex-shrink: 0;
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

.inventory-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.inventory-tab-content {
  width: 100%;
}

@media (max-width: 976px) {
  .inventory-modal {
    width: 90%;
  }
}
</style>
