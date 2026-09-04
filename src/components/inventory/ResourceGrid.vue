<script setup lang="ts">
import { computed, ref } from 'vue';
import { $t } from '@/locales';
import ResourceCard from './ResourceCard.vue';
import { applyFilters } from '@/lib/utils/filterUtils';
import {
  MATERIAL,
  EQUIPMENT,
  GIFT_CATEGORY,
  SECRET_TECH_NOTE_ID,
  SCHOOL_MATERIAL_SUBCATEGORIES,
  type InventoryLayout,
  type ResourceProps,
} from '@/types/resource';
import { getAllItemsFromCache, getAllEquipmentFromCache } from '@/lib/stores/resourceCacheStore';
import { usePaginatedGrid } from '@/composables/usePaginatedGrid';
import '@/styles/resourceDisplay.css';

const props = withDefaults(
  defineProps<{
    variant: 'items' | 'equipment';
    formData: Record<string, number>;
    layout?: InventoryLayout;
  }>(),
  {
    layout: 'paged',
  },
);

const emit = defineEmits<{
  (e: 'update', id: string, event: Event): void;
  (e: 'page-change'): void;
}>();

const schoolMaterialSubcategories = new Set<string>(SCHOOL_MATERIAL_SUBCATEGORIES);

type ItemGroupId = 'general' | 'academy' | 'gifts';
type ItemGroupLabel = 'generalMaterials' | 'academyMaterials' | 'gifts';
type ItemGroupTabLabel = 'general' | 'academy' | 'gifts';

interface ItemResourceGroup {
  id: ItemGroupId;
  labelKey: ItemGroupLabel;
  tabLabelKey: ItemGroupTabLabel;
  items: ResourceProps[];
}

const resourcesTabRef = ref<HTMLElement | null>(null);

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

const itemResourceGroups = computed<ItemResourceGroup[]>(() => {
  if (props.variant !== 'items') return [];

  const generalMaterials: ResourceProps[] = [];
  const schoolMaterials: ResourceProps[] = [];
  const gifts: ResourceProps[] = [];

  for (const item of resources.value) {
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

  const groups: ItemResourceGroup[] = [
    {
      id: 'general',
      labelKey: 'generalMaterials',
      tabLabelKey: 'general',
      items: generalMaterials,
    },
    {
      id: 'academy',
      labelKey: 'academyMaterials',
      tabLabelKey: 'academy',
      items: schoolMaterials,
    },
    { id: 'gifts', labelKey: 'gifts', tabLabelKey: 'gifts', items: gifts },
  ];

  return groups.filter((group) => group.items.length > 0);
});

const pagedResources = computed(() => {
  const all = resources.value;
  if (all.length === 0) return [] as (typeof all)[];

  if (props.variant === 'equipment') {
    return [all];
  }

  return itemResourceGroups.value.map((group) => group.items);
});

const { currentPage, sliderStyle, setPageRef, goToPage, handleBoundaryTab } =
  usePaginatedGrid(pagedResources);

async function selectPage(pageIndex: number) {
  await goToPage(pageIndex);
  emit('page-change');
}

async function selectGroup(group: ItemResourceGroup, groupIndex: number) {
  if (props.layout === 'paged') {
    await selectPage(groupIndex);
    return;
  }

  const section = resourcesTabRef.value?.querySelector<HTMLElement>(
    `#resource-continuous-section-${group.id}`,
  );
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section?.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}
</script>

<template>
  <div
    ref="resourcesTabRef"
    class="resources-tab"
    :class="{ 'is-continuous': layout === 'continuous' }"
  >
    <div
      v-if="variant === 'items'"
      class="resource-group-tabs"
      :role="layout === 'paged' ? 'tablist' : 'navigation'"
      :aria-label="$t('materialGroups')"
    >
      <button
        v-for="(group, groupIndex) in itemResourceGroups"
        :id="`resource-group-tab-${group.id}`"
        :key="group.id"
        type="button"
        :role="layout === 'paged' ? 'tab' : undefined"
        class="resource-group-tab"
        :class="{ active: layout === 'paged' && currentPage === groupIndex }"
        :aria-selected="layout === 'paged' ? currentPage === groupIndex : undefined"
        :aria-controls="
          layout === 'paged'
            ? `resource-group-panel-${group.id}`
            : `resource-continuous-section-${group.id}`
        "
        @click="selectGroup(group, groupIndex)"
      >
        <span>{{ $t(group.tabLabelKey) }}</span>
        <span class="resource-group-count">{{ group.items.length }}</span>
      </button>
    </div>

    <div v-if="layout === 'paged'" class="resources-container">
      <div class="resources-slider" :style="sliderStyle">
        <div
          v-for="(pageItems, pageIndex) in pagedResources"
          :id="
            variant === 'items' && itemResourceGroups[pageIndex]
              ? `resource-group-panel-${itemResourceGroups[pageIndex].id}`
              : undefined
          "
          :key="`page-${pageIndex}`"
          :ref="(el) => setPageRef(el, pageIndex)"
          class="resources-page"
          :role="variant === 'items' ? 'tabpanel' : undefined"
          :aria-labelledby="
            variant === 'items' && itemResourceGroups[pageIndex]
              ? `resource-group-tab-${itemResourceGroups[pageIndex].id}`
              : undefined
          "
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

    <div v-else class="resources-continuous">
      <template v-if="variant === 'items'">
        <section
          v-for="group in itemResourceGroups"
          :id="`resource-continuous-section-${group.id}`"
          :key="group.id"
          class="resource-section"
          :aria-labelledby="`resource-group-tab-${group.id}`"
        >
          <header class="resource-section-header">
            <h3>{{ $t(group.labelKey) }}</h3>
            <span class="resource-section-count">{{ group.items.length }}</span>
          </header>
          <div class="resources-grid">
            <ResourceCard
              v-for="item in group.items"
              :key="`cell-${item.Id}`"
              :item="item"
              :value="formData[item.Id]"
              :item-type="itemType"
              :input-tab-index="0"
              @update:value="(e) => emit('update', item.Id.toString(), e)"
            />
          </div>
        </section>
      </template>

      <div v-else class="resources-grid">
        <ResourceCard
          v-for="item in resources"
          :key="`cell-${item.Id}`"
          :item="item"
          :value="formData[item.Id]"
          :item-type="itemType"
          :input-tab-index="0"
          @update:value="(e) => emit('update', item.Id.toString(), e)"
        />
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
  min-height: 0;
}

.resources-tab.is-continuous {
  height: auto;
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

.resource-group-tabs {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 0 4px 12px;
  background: var(--background-primary);
  overflow-x: auto;
  flex: 0 0 auto;
}

.resource-group-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-background);
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.resource-group-tab:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
}

.resource-group-tab.active {
  color: var(--text-primary);
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 14%, var(--card-background));
}

.resource-group-tab:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.resource-group-count,
.resource-section-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-color) 12%, var(--background-primary));
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
}

.resource-group-tab.active .resource-group-count {
  color: var(--accent-color);
  background: var(--background-primary);
}

.resources-continuous {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.resource-section {
  overflow: hidden;
  scroll-margin-top: 68px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-background);
}

.resource-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--accent-color) 5%, var(--card-background));
}

.resource-section-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 700;
}

@media (max-width: 600px) {
  .resource-group-tabs {
    justify-content: center;
  }

  .resource-group-tab {
    padding-inline: 8px;
  }
}
</style>
