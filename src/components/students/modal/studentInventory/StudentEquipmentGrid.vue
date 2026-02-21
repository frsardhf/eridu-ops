<script setup lang="ts">
import { ref, computed, nextTick, type ComponentPublicInstance } from 'vue';
import StudentResourceCard from './StudentResourceCard.vue';
import { formatLargeNumber } from '../../../../consumables/utils/materialUtils';
import { applyFilters } from '../../../../consumables/utils/filterUtils';
import { EQUIPMENT } from '../../../../types/resource';
import { getAllEquipmentFromCache } from '../../../../consumables/stores/resourceCacheStore';
import '../../../../styles/resourceDisplay.css';

const ITEMS_PER_PAGE = 98;

const props = defineProps<{
  equipmentFormData: Record<string, number>,
}>();

type EmitFn = {
  (e: 'update-equipment', id: string, event: Event): void;
}
const emit = defineEmits<EmitFn>();

const currentPage = ref(0);
const disableTransition = ref(false);
const pageRefs = ref<Array<HTMLElement | null>>([]);

const equipments = computed(() => {
  const allEquipments = getAllEquipmentFromCache();
  if (!allEquipments || Object.keys(allEquipments).length === 0) return [];
  return Object.values(applyFilters(allEquipments, EQUIPMENT));
});

const totalPages = computed(() => Math.ceil(equipments.value.length / ITEMS_PER_PAGE));

const sliderStyle = computed(() => ({
  transform: `translate3d(${-currentPage.value * 100}%, 0, 0)`,
  transition: disableTransition.value ? 'none' : 'transform 0.3s ease'
}));

function getPageResources(pageIndex: number) {
  const start = pageIndex * ITEMS_PER_PAGE;
  return equipments.value.slice(start, start + ITEMS_PER_PAGE);
}

function setPageRef(el: Element | ComponentPublicInstance | null, pageIndex: number) {
  const resolved =
    el instanceof Element
      ? (el as HTMLElement)
      : ((el as ComponentPublicInstance | null)?.$el as HTMLElement | undefined);
  pageRefs.value[pageIndex] = resolved ?? null;
}

function handleEquipmentInput(item: any, event: Event) {
  emit('update-equipment', item.Id.toString(), event);
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
</script>

<template>
  <div class="resources-tab">
    <div class="resources-container">
      <div
        class="resources-slider"
        :style="sliderStyle"
      >
        <div
          v-for="page in totalPages"
          :key="page"
          :ref="(el) => setPageRef(el, page - 1)"
          class="resources-page"
          :aria-hidden="currentPage !== page - 1"
        >
          <div class="resources-grid">
            <StudentResourceCard
              v-for="(item, itemIndex) in getPageResources(page - 1)"
              :key="`equipment-${item.Id}`"
              :item="item"
              :value="equipmentFormData[item.Id]"
              :format-quantity="formatLargeNumber"
              :item-type="'equipment'"
              :input-tab-index="currentPage === page - 1 ? 0 : -1"
              @update:value="(e) => handleEquipmentInput(item, e)"
              @keydown:input="(e) => handleBoundaryTab(e, page - 1, itemIndex, getPageResources(page - 1).length)"
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
