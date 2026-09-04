<script setup lang="ts">
import { computed } from 'vue';
import ResourceCard from './ResourceCard.vue';
import { applyFilters } from '@/lib/utils/filterUtils';
import {
  MATERIAL,
  EQUIPMENT,
  GIFT_CATEGORY,
  SECRET_TECH_NOTE_ID,
  SCHOOL_MATERIAL_SUBCATEGORIES,
} from '@/types/resource';
import { getAllItemsFromCache, getAllEquipmentFromCache } from '@/lib/stores/resourceCacheStore';
import { usePaginatedGrid } from '@/composables/usePaginatedGrid';
import '@/styles/resourceDisplay.css';

/**
 * Paginated inventory grid for either items or equipment: the consolidation of
 * the former ItemsGrid + EquipmentGrid (identical apart from the cache source,
 * filter category, card item-type, and page plan).
 */
const props = defineProps<{
  variant: 'items' | 'equipment';
  formData: Record<string, number>;
}>();

const emit = defineEmits<{
  (e: 'update', id: string, event: Event): void;
}>();

const EQUIPMENT_PER_PAGE = 98;
const schoolMaterialSubcategories = new Set<string>(SCHOOL_MATERIAL_SUBCATEGORIES);

const itemType = computed(() => (props.variant === 'equipment' ? 'equipment' : 'resource'));

const resources = computed(() => {
  if (props.variant === 'equipment') {
    const cache = getAllEquipmentFromCache();
    if (!cache) return [];
    return Object.values(applyFilters(cache, EQUIPMENT));
  }
  const cache = getAllItemsFromCache();
  if (!cache || Object.keys(cache).length === 0) return [];
  return Object.values(applyFilters(cache, MATERIAL));
});

const pagedResources = computed(() => {
  const all = resources.value;
  if (all.length === 0) return [] as (typeof all)[];
  const pages: (typeof all)[] = [];

  if (props.variant === 'equipment') {
    for (let i = 0; i < all.length; i += EQUIPMENT_PER_PAGE) {
      pages.push(all.slice(i, i + EQUIPMENT_PER_PAGE));
    }
    return pages;
  }

  const generalMaterials: typeof all = [];
  const schoolMaterials: typeof all = [];
  const gifts: typeof all = [];

  for (const item of all) {
    if (item.Category === GIFT_CATEGORY) {
      gifts.push(item);
    } else if (
      item.Id !== SECRET_TECH_NOTE_ID &&
      schoolMaterialSubcategories.has(item.SubCategory ?? '')
    ) {
      schoolMaterials.push(item);
    } else {
      generalMaterials.push(item);
    }
  }

  return [generalMaterials, schoolMaterials, gifts].filter((page) => page.length > 0);
});

const { currentPage, totalPages, sliderStyle, setPageRef, goToPage, handleBoundaryTab } =
  usePaginatedGrid(pagedResources);
</script>

<template>
  <div class="resources-tab">
    <div class="resources-container">
      <div class="resources-slider" :style="sliderStyle">
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
              :key="`cell-${item.Id}`"
              :item="item"
              :value="formData[item.Id]"
              :item-type="itemType"
              :input-tab-index="currentPage === pageIndex ? 0 : -1"
              @update:value="(e) => emit('update', item.Id.toString(), e)"
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
/* .page-indicator / .page-dot live in styles/resourceDisplay.css (shared) */
</style>
