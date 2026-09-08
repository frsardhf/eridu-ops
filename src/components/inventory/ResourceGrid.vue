<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { $t } from '@/locales';
import ResourceCard from './ResourceCard.vue';
import { applyFilters } from '@/lib/utils/filterUtils';
import { MATERIAL, EQUIPMENT, type InventoryLayout, type ResourceProps } from '@/types/resource';
import { getAllItemsFromCache, getAllEquipmentFromCache } from '@/lib/stores/resourceCacheStore';
import { usePaginatedGrid } from '@/composables/usePaginatedGrid';
import {
  getInventoryGroupId,
  type InventoryGroupId,
  type InventoryResourceType,
} from '@/lib/utils/resourceGroupUtils';
import '@/styles/resourceDisplay.css';

const props = withDefaults(
  defineProps<{
    variant: 'all' | 'items' | 'equipment';
    formData: Record<string, number>;
    equipmentFormData?: Record<string, number>;
    activeGroup?: InventoryGroupId;
    layout?: InventoryLayout;
  }>(),
  {
    layout: 'paged',
  },
);

const emit = defineEmits<{
  (e: 'update', id: string, event: Event, itemType?: 'resource' | 'equipment'): void;
  (e: 'page-change'): void;
  (e: 'group-change', group: InventoryGroupId): void;
}>();

interface ResourceGroup {
  id: InventoryGroupId;
  labelKey: 'generalMaterials' | 'academyMaterials' | 'gifts' | 'equipment';
  tabLabelKey: 'general' | 'academy' | 'gifts' | 'equipment';
  items: ResourceProps[];
  itemType: InventoryResourceType;
}

const resourcesTabRef = ref<HTMLElement | null>(null);

const itemResources = computed(() => {
  const cache = getAllItemsFromCache();
  if (!cache || Object.keys(cache).length === 0) return [];
  return Object.values(applyFilters(cache, MATERIAL));
});

const equipmentResources = computed(() => {
  const cache = getAllEquipmentFromCache();
  return cache ? Object.values(applyFilters(cache, EQUIPMENT)) : [];
});

const resources = computed(() => {
  if (props.variant === 'items') return itemResources.value;
  if (props.variant === 'equipment') return equipmentResources.value;
  return [...itemResources.value, ...equipmentResources.value];
});

const itemResourceGroups = computed<ResourceGroup[]>(() => {
  if (props.variant === 'equipment') return [];

  const generalMaterials: ResourceProps[] = [];
  const schoolMaterials: ResourceProps[] = [];
  const gifts: ResourceProps[] = [];

  for (const item of itemResources.value) {
    const group = getInventoryGroupId(item, 'resource');
    if (group === 'gifts') gifts.push(item);
    else if (group === 'academy') schoolMaterials.push(item);
    else generalMaterials.push(item);
  }

  const groups: ResourceGroup[] = [
    {
      id: 'general',
      labelKey: 'generalMaterials',
      tabLabelKey: 'general',
      items: generalMaterials,
      itemType: 'resource',
    },
    {
      id: 'academy',
      labelKey: 'academyMaterials',
      tabLabelKey: 'academy',
      items: schoolMaterials,
      itemType: 'resource',
    },
    { id: 'gifts', labelKey: 'gifts', tabLabelKey: 'gifts', items: gifts, itemType: 'resource' },
  ];

  return groups.filter((group) => group.items.length > 0);
});

const resourceGroups = computed<ResourceGroup[]>(() => {
  if (props.variant === 'items') return itemResourceGroups.value;
  const equipmentGroup: ResourceGroup = {
    id: 'equipment',
    labelKey: 'equipment',
    tabLabelKey: 'equipment',
    items: equipmentResources.value,
    itemType: 'equipment',
  };
  if (props.variant === 'equipment') {
    return [equipmentGroup];
  }
  return [...itemResourceGroups.value, equipmentGroup].filter((group) => group.items.length > 0);
});

const pagedResources = computed(() => {
  const all = resources.value;
  if (all.length === 0) return [] as (typeof all)[];
  return resourceGroups.value.map((group) => group.items);
});

const { currentPage, sliderStyle, setPageRef, goToPage, handleBoundaryTab } =
  usePaginatedGrid(pagedResources);

watch(
  [() => props.activeGroup, resourceGroups],
  async ([activeGroup]) => {
    if (!activeGroup || props.layout !== 'paged') return;
    const groupIndex = resourceGroups.value.findIndex((group) => group.id === activeGroup);
    if (groupIndex >= 0 && groupIndex !== currentPage.value) {
      await goToPage(groupIndex, undefined, true);
    }
  },
  { immediate: true },
);

watch(currentPage, (pageIndex) => {
  const group = resourceGroups.value[pageIndex];
  if (group && group.id !== props.activeGroup) {
    emit('group-change', group.id);
  }
});

async function selectPage(pageIndex: number) {
  await goToPage(pageIndex);
  emit('page-change');
}

async function selectGroup(group: ResourceGroup, groupIndex: number) {
  emit('group-change', group.id);
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

function getResourceValue(item: ResourceProps, source: InventoryResourceType): number | undefined {
  const formData =
    source === 'equipment' ? (props.equipmentFormData ?? props.formData) : props.formData;
  return formData[String(item.Id)];
}
</script>

<template>
  <div
    ref="resourcesTabRef"
    class="resources-tab"
    :class="{ 'is-continuous': layout === 'continuous' }"
  >
    <div
      v-if="variant !== 'equipment'"
      class="resource-group-tabs"
      :role="layout === 'paged' ? 'tablist' : 'navigation'"
      :aria-label="variant === 'all' ? $t('inventory') : $t('materialGroups')"
    >
      <button
        v-for="(group, groupIndex) in resourceGroups"
        :id="`resource-group-tab-${group.id}`"
        :key="group.id"
        type="button"
        :role="layout === 'paged' ? 'tab' : undefined"
        class="resource-group-tab"
        :class="{
          active: layout === 'paged' ? currentPage === groupIndex : props.activeGroup === group.id,
        }"
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
            variant !== 'equipment' && resourceGroups[pageIndex]
              ? `resource-group-panel-${resourceGroups[pageIndex].id}`
              : undefined
          "
          :key="`page-${pageIndex}`"
          :ref="(el) => setPageRef(el, pageIndex)"
          class="resources-page"
          :role="variant !== 'equipment' ? 'tabpanel' : undefined"
          :aria-labelledby="
            variant !== 'equipment' && resourceGroups[pageIndex]
              ? `resource-group-tab-${resourceGroups[pageIndex].id}`
              : undefined
          "
          :aria-hidden="currentPage !== pageIndex"
        >
          <div class="resources-grid">
            <ResourceCard
              v-for="(item, itemIndex) in pageItems"
              :key="`cell-${resourceGroups[pageIndex].itemType}-${item.Id}`"
              :item="item"
              :value="getResourceValue(item, resourceGroups[pageIndex].itemType)"
              :item-type="resourceGroups[pageIndex].itemType"
              :input-tab-index="currentPage === pageIndex ? 0 : -1"
              @update:value="
                (e) => emit('update', item.Id.toString(), e, resourceGroups[pageIndex].itemType)
              "
              @keydown:input="(e) => handleBoundaryTab(e, pageIndex, itemIndex, pageItems.length)"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="resources-continuous">
      <template v-if="resourceGroups.length > 1">
        <section
          v-for="group in resourceGroups"
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
              :key="`cell-${group.itemType}-${item.Id}`"
              :item="item"
              :value="getResourceValue(item, group.itemType)"
              :item-type="group.itemType"
              :input-tab-index="0"
              @update:value="(e) => emit('update', item.Id.toString(), e, group.itemType)"
            />
          </div>
        </section>
      </template>

      <div v-else class="resources-grid">
        <ResourceCard
          v-for="item in resources"
          :key="`cell-${resourceGroups[0]?.itemType ?? 'resource'}-${item.Id}`"
          :item="item"
          :value="getResourceValue(item, resourceGroups[0]?.itemType ?? 'resource')"
          :item-type="resourceGroups[0]?.itemType ?? 'resource'"
          :input-tab-index="0"
          @update:value="
            (e) => emit('update', item.Id.toString(), e, resourceGroups[0]?.itemType ?? 'resource')
          "
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
</style>
