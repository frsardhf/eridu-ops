<script setup lang="ts">
import { computed } from 'vue';
import ResourceCard from './ResourceCard.vue';
import { applyFilters } from '@/consumables/utils/filterUtils';
import { MATERIAL } from '@/types/resource';
import { getAllItemsFromCache } from '@/consumables/stores/resourceCacheStore';
import { usePaginatedGrid } from '@/composables/usePaginatedGrid';
import '@/styles/resourceDisplay.css';

const DEFAULT_ITEMS_PER_PAGE = 89;
// First pages use explicit sizing; remaining resources are grouped into one final page.
const PAGE_SIZE_PLAN: number[] = [89, 88];

const props = defineProps<{
  resourceFormData: Record<string, number>,
}>();

const emit = defineEmits<{
  (e: 'update-resource', id: string, event: Event): void;
}>();

const resources = computed(() => {
  const allMaterials = getAllItemsFromCache();
  if (!allMaterials || Object.keys(allMaterials).length === 0) return [];
  return Object.values(applyFilters(allMaterials, MATERIAL));
});

const pagedResources = computed(() => {
  const all = resources.value;
  if (all.length === 0) return [] as typeof all[];

  const pages: typeof all[] = [];
  let start = 0;

  for (const rawSize of PAGE_SIZE_PLAN) {
    const size = Math.max(1, Math.floor(rawSize));
    if (start >= all.length) break;
    pages.push(all.slice(start, start + size));
    start += size;
  }

  if (start < all.length) {
    pages.push(all.slice(start));
  }

  if (pages.length === 0) {
    for (let i = 0; i < all.length; i += DEFAULT_ITEMS_PER_PAGE) {
      pages.push(all.slice(i, i + DEFAULT_ITEMS_PER_PAGE));
    }
  }

  return pages;
});

const { currentPage, totalPages, sliderStyle, setPageRef, goToPage, handleBoundaryTab } =
  usePaginatedGrid(pagedResources);
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
          :key="`page-${pageIndex}`"
          :ref="(el) => setPageRef(el, pageIndex)"
          class="resources-page"
          :aria-hidden="currentPage !== pageIndex"
        >
          <div class="resources-grid">
            <ResourceCard
              v-for="(item, itemIndex) in pageItems"
              :key="`resource-${item.Id}`"
              :item="item"
              :value="resourceFormData[item.Id]"
              :item-type="'resource'"
              :input-tab-index="currentPage === pageIndex ? 0 : -1"
              @update:value="(e) => emit('update-resource', item.Id.toString(), e)"
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
  padding-top: 16px;
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
