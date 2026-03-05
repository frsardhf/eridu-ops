<script setup lang="ts">
import { computed } from 'vue';
import ResourceCard from './ResourceCard.vue';
import { applyFilters } from '@/consumables/utils/filterUtils';
import { EQUIPMENT } from '@/types/resource';
import { getAllEquipmentFromCache } from '@/consumables/stores/resourceCacheStore';
import { usePaginatedGrid } from '@/composables/usePaginatedGrid';
import '@/styles/resourceDisplay.css';

const ITEMS_PER_PAGE = 98;

const props = defineProps<{
  equipmentFormData: Record<string, number>,
}>();

type EmitFn = {
  (e: 'update-equipment', id: string, event: Event): void;
}
const emit = defineEmits<EmitFn>();

const pagedResources = computed(() => {
  const allEquipments = getAllEquipmentFromCache();
  if (!allEquipments || Object.keys(allEquipments).length === 0) return [] as any[][];
  const all = Object.values(applyFilters(allEquipments, EQUIPMENT));
  const pages: any[][] = [];
  for (let i = 0; i < all.length; i += ITEMS_PER_PAGE) {
    pages.push(all.slice(i, i + ITEMS_PER_PAGE));
  }
  return pages;
});

const { currentPage, totalPages, sliderStyle, setPageRef, goToPage, handleBoundaryTab } =
  usePaginatedGrid(pagedResources);

function handleEquipmentInput(item: any, event: Event) {
  emit('update-equipment', item.Id.toString(), event);
}
</script>

<template>
  <div class="resources-tab">
    <div class="resources-container">
      <div
        class="resources-slider"
        :style="sliderStyle"
      >
        <div
          v-for="(pageItems, pageIndex) in pagedResources"
          :key="pageIndex"
          :ref="(el) => setPageRef(el, pageIndex)"
          class="resources-page"
          :aria-hidden="currentPage !== pageIndex"
        >
          <div class="resources-grid">
            <ResourceCard
              v-for="(item, itemIndex) in pageItems"
              :key="`equipment-${item.Id}`"
              :item="item"
              :value="equipmentFormData[item.Id]"
              :item-type="'equipment'"
              :input-tab-index="currentPage === pageIndex ? 0 : -1"
              @update:value="(e) => handleEquipmentInput(item, e)"
              @keydown:input="(e) => handleBoundaryTab(e, pageIndex, itemIndex, pageItems.length)"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="resources-pagination">
      <div class="page-indicator">
        <button
          v-for="page in totalPages"
          :key="page"
          type="button"
          class="page-dot"
          :class="{ active: currentPage === page - 1 }"
          :aria-label="`Go to page ${page}`"
          :aria-current="currentPage === page - 1 ? 'page' : undefined"
          @click="goToPage(page - 1)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  height: 100%;
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
  display: flex;
  flex-direction: column;
}

.resources-pagination {
  padding-top: 20px;
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
</style>
