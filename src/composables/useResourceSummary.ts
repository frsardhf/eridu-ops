import { computed, type Ref } from 'vue';
import type { MaterialWithRemaining } from '@/types/upgrade';
import { MATERIAL, EQUIPMENT } from '@/types/resource';
import { useMaterialCalculation } from '@/consumables/hooks/useMaterialCalculation';
import { useGearCalculation } from '@/consumables/hooks/useGearCalculation';
import { useGiftCalculation } from '@/consumables/hooks/useGiftCalculation';
import { getAllItemsFromCache, getAllEquipmentFromCache } from '@/consumables/stores/resourceCacheStore';
import { applyFilters } from '@/consumables/utils/filterUtils';
import {
  isExpReport,
  isExpBall,
  calculateMissingItems,
  calculateLeftoverItems,
  sortMaterials,
} from '@/consumables/utils/materialUtils';
import { $t } from '@/locales';

export type ViewTab = 'materials' | 'equipment' | 'gifts';
export type ViewMode = 'needed' | 'missing' | 'leftover';

const MATERIALS_PER_PAGE = 89;
const MATERIAL_PAGE_SIZE_PLAN: number[] = [89, 88];
const EQUIPMENT_PER_PAGE = 98;
const GIFTS_PER_PAGE = 89;

function paginateResources<T>(all: T[], pageSize: number, plannedFirstPages: number[] = []): T[][] {
  if (all.length === 0) return [];

  const pages: T[][] = [];
  let start = 0;

  for (const rawSize of plannedFirstPages) {
    const size = Math.max(1, Math.floor(rawSize));
    if (start >= all.length) break;
    pages.push(all.slice(start, start + size));
    start += size;
  }

  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  for (let i = start; i < all.length; i += normalizedPageSize) {
    pages.push(all.slice(i, i + normalizedPageSize));
  }

  return pages;
}

export function useResourceSummary(activeTab: Ref<ViewTab>, activeMode: Ref<ViewMode>) {
  const { totalMaterialsNeeded, calculateExpNeeds } = useMaterialCalculation();
  const { totalEquipmentsNeeded, calculateExpNeeds: calculateEquipmentExpNeeds } = useGearCalculation();
  const { getStudentsWithGifts, getGiftNeededById } = useGiftCalculation();

  // --- Catalog filtering ---

  const materialCatalog = computed(() => {
    const allItems = getAllItemsFromCache();
    if (!allItems || Object.keys(allItems).length === 0) return [] as any[];
    return Object.values(applyFilters(allItems, MATERIAL)).filter(item =>
      item.Category !== 'Favor' && (!isExpReport(item.Id) || item.Id === 10)
    );
  });

  const giftCatalog = computed(() => {
    const allItems = getAllItemsFromCache();
    if (!allItems || Object.keys(allItems).length === 0) return [] as any[];
    return Object.values(applyFilters(allItems, MATERIAL)).filter(item => item.Category === 'Favor');
  });

  const equipmentCatalog = computed(() => {
    const allEquipments = getAllEquipmentFromCache();
    if (!allEquipments || Object.keys(allEquipments).length === 0) return [] as any[];
    return Object.values(applyFilters(allEquipments, EQUIPMENT)).filter(item =>
      !isExpBall(item.Id) || item.Id === 1
    );
  });

  // --- Needed aggregation maps ---

  const materialNeededById = computed(() => {
    const neededMap = new Map<number, number>();
    totalMaterialsNeeded.value.forEach(item => {
      const materialId = item.material?.Id;
      if (!materialId) return;
      neededMap.set(materialId, (neededMap.get(materialId) ?? 0) + (item.materialQuantity ?? 0));
    });
    return neededMap;
  });

  const equipmentNeededById = computed(() => {
    const neededMap = new Map<number, number>();
    totalEquipmentsNeeded.value.forEach(item => {
      const materialId = item.material?.Id;
      if (!materialId) return;
      neededMap.set(materialId, (neededMap.get(materialId) ?? 0) + (item.materialQuantity ?? 0));
    });
    return neededMap;
  });

  const giftNeededById = computed(() => getGiftNeededById());

  // --- XP surplus ---

  const materialXpRemaining = computed(() => {
    const { totalXpNeeded, ownedXp } = calculateExpNeeds();
    return Math.max(0, ownedXp - totalXpNeeded);
  });

  const equipmentXpRemaining = computed(() => {
    const { totalXpNeeded, ownedXp } = calculateEquipmentExpNeeds();
    return Math.max(0, ownedXp - totalXpNeeded);
  });

  // --- Missing (deficit) ---

  const missingMaterials = computed<MaterialWithRemaining[]>(() =>
    calculateMissingItems(
      totalMaterialsNeeded.value,
      getAllItemsFromCache,
      isExpReport,
      calculateExpNeeds
    )
  );

  const missingEquipments = computed<MaterialWithRemaining[]>(() =>
    calculateMissingItems(
      totalEquipmentsNeeded.value,
      getAllEquipmentFromCache,
      isExpBall,
      calculateEquipmentExpNeeds
    )
  );

  // --- Leftover (surplus) ---

  const leftoverMaterials = computed<MaterialWithRemaining[]>(() =>
    calculateLeftoverItems(
      materialCatalog.value,
      id => materialNeededById.value.get(id) ?? 0,
      'materials',
      isExpReport,
      () => materialXpRemaining.value
    )
  );

  const leftoverEquipments = computed<MaterialWithRemaining[]>(() =>
    calculateLeftoverItems(
      equipmentCatalog.value,
      id => equipmentNeededById.value.get(id) ?? 0,
      'equipments',
      isExpBall,
      () => equipmentXpRemaining.value
    )
  );

  const leftoverGifts = computed<MaterialWithRemaining[]>(() =>
    calculateLeftoverItems(
      giftCatalog.value,
      id => giftNeededById.value[id] ?? 0,
      'materials',
      () => false,
      () => 0
    )
  );

  // --- Gift students ---

  const studentsWithGifts = computed(() => getStudentsWithGifts(activeMode.value));

  // --- Display selection (tab × mode multiplexer) ---

  const displayResources = computed(() => {
    let resources: any[] = [];

    if (activeTab.value === 'materials') {
      if (activeMode.value === 'needed') {
        resources = totalMaterialsNeeded.value;
      } else if (activeMode.value === 'missing') {
        resources = missingMaterials.value;
      } else {
        resources = leftoverMaterials.value;
      }
    } else if (activeTab.value === 'equipment') {
      if (activeMode.value === 'needed') {
        resources = totalEquipmentsNeeded.value;
      } else if (activeMode.value === 'missing') {
        resources = missingEquipments.value;
      } else {
        resources = leftoverEquipments.value;
      }
    } else if (activeTab.value === 'gifts' && activeMode.value === 'leftover') {
      resources = leftoverGifts.value;
    }
    // Gifts needed/missing uses studentsWithGifts, not displayResources

    const filtered = activeMode.value === 'leftover'
      ? resources
      : resources.filter(r => (r.materialQuantity ?? 0) > 0);
    return filtered.sort((a, b) => sortMaterials(a, b));
  });

  const hasDisplayResources = computed(() => {
    if (activeTab.value === 'gifts' && activeMode.value !== 'leftover') {
      return studentsWithGifts.value.length > 0;
    }
    return displayResources.value.length > 0;
  });

  const noResourcesText = computed(() => {
    if (activeMode.value === 'needed') return $t('noResourcesNeeded');
    if (activeMode.value === 'missing') return $t('allMaterialsAvailable');
    return $t('noLeftoverResources');
  });

  // --- Leftover pagination ---

  const pagedLeftoverResources = computed(() => {
    if (activeMode.value !== 'leftover') return [] as MaterialWithRemaining[][];

    if (activeTab.value === 'materials') {
      return paginateResources(displayResources.value, MATERIALS_PER_PAGE, MATERIAL_PAGE_SIZE_PLAN);
    }

    if (activeTab.value === 'equipment') {
      return paginateResources(displayResources.value, EQUIPMENT_PER_PAGE);
    }

    return paginateResources(displayResources.value, GIFTS_PER_PAGE);
  });

  // --- Tooltip support ---

  const leftoverByMaterialId = computed(() => {
    const values = new Map<number, number>();
    if (activeMode.value !== 'leftover') return values;

    displayResources.value.forEach(item => {
      const materialId = item.material?.Id;
      if (!materialId) return;
      values.set(materialId, Math.max(0, item.remaining ?? item.materialQuantity ?? 0));
    });

    return values;
  });

  return {
    missingMaterials,
    missingEquipments,
    leftoverMaterials,
    leftoverEquipments,
    leftoverGifts,
    studentsWithGifts,
    displayResources,
    hasDisplayResources,
    noResourcesText,
    pagedLeftoverResources,
    leftoverByMaterialId,
  };
}
