<script setup lang="ts">
import { ref, computed, nextTick, watch, type ComponentPublicInstance } from 'vue';
import ResourceCard from './ResourceCard.vue';
import { formatLargeNumber } from '@/consumables/utils/materialUtils';
import { applyFilters } from '@/consumables/utils/filterUtils';
import { MATERIAL } from '@/types/resource';
import { getAllItemsFromCache } from '@/consumables/stores/resourceCacheStore';
import '@/styles/resourceDisplay.css';

const DEFAULT_ITEMS_PER_PAGE = 89;
// First pages use explicit sizing; remaining resources are grouped into one final page.
const PAGE_SIZE_PLAN: number[] = [89, 88];

const props = defineProps<{
  resourceFormData: Record<string, number>,
}>();

type EmitFn = {
  (e: 'update-resource', id: string, event: Event): void;
}
const emit = defineEmits<EmitFn>();

const currentPage = ref(0);
const disableTransition = ref(false);
const pageRefs = ref<Array<HTMLElement | null>>([]);

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

const totalPages = computed(() => pagedResources.value.length);

const sliderStyle = computed(() => ({
  transform: `translate3d(${-currentPage.value * 100}%, 0, 0)`,
  transition: disableTransition.value ? 'none' : 'transform 0.3s ease'
}));

function setPageRef(el: Element | ComponentPublicInstance | null, pageIndex: number) {
  const resolved =
    el instanceof Element
      ? (el as HTMLElement)
      : ((el as ComponentPublicInstance | null)?.$el as HTMLElement | undefined);
  pageRefs.value[pageIndex] = resolved ?? null;
}

function handleResourceInput(item: any, event: Event) {
  emit('update-resource', item.Id.toString(), event);
}

function focusPageBoundaryInput(pageIndex: number, target: 'first' | 'last') {
  const pageElement = pageRefs.value[pageIndex];
  if (!pageElement) return;

  const inputs = pageElement.querySelectorAll<HTMLInputElement>('input.resource-input');
  if (inputs.length === 0) return;

  const targetInput = target === 'first' ? inputs[0] : inputs[inputs.length - 1];
  targetInput.focus();
}

async function goToPage(pageIndex: number, focusTarget?: 'first' | 'last', instant = false) {
  const maxPage = Math.max(0, totalPages.value - 1);
  const safePage = Math.min(Math.max(pageIndex, 0), maxPage);

  disableTransition.value = instant;
  currentPage.value = safePage;

  await nextTick();

  if (focusTarget) {
    focusPageBoundaryInput(safePage, focusTarget);
  }

  if (instant) {
    requestAnimationFrame(() => {
      disableTransition.value = false;
    });
  }
}

function handleBoundaryTab(event: KeyboardEvent, pageIndex: number, itemIndex: number, pageLength: number) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
  if (pageIndex !== currentPage.value) return;

  if (!event.shiftKey && itemIndex === pageLength - 1 && pageIndex < totalPages.value - 1) {
    event.preventDefault();
    void goToPage(pageIndex + 1, 'first', true);
  }

  if (event.shiftKey && itemIndex === 0 && pageIndex > 0) {
    event.preventDefault();
    void goToPage(pageIndex - 1, 'last', true);
  }
}

watch(totalPages, (nextTotal) => {
  if (nextTotal === 0) {
    currentPage.value = 0;
    return;
  }
  if (currentPage.value > nextTotal - 1) {
    currentPage.value = nextTotal - 1;
  }
});
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
              :format-quantity="formatLargeNumber"
              :item-type="'resource'"
              :input-tab-index="currentPage === pageIndex ? 0 : -1"
              @update:value="(e) => handleResourceInput(item, e)"
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
