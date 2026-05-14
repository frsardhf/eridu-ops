import { ref, computed, watch } from 'vue';
import { getAllItemsFromCache } from '../stores/resourceCacheStore';
import { useMaterialCalculation } from './useMaterialCalculation';
import { applyFilters } from '../utils/filterUtils';
import { calculateLeftoverItems } from '../utils/materialUtils';
import { getSettings, updateSetting } from '../utils/settingsStorage';
import { MATERIAL, ALL_RARITIES } from '../../types/resource';
import type { MaterialWithRemaining } from '../../types/upgrade';

const CRAFTING_SUBCATEGORIES = ['Artifact', 'CDItem', 'BookItem'] as const;
const STAGE2_RARITIES: readonly string[] = ['SR', 'SSR'];
const CRAFT_QUALITY_THRESHOLD = 200;

const DEFAULT_THRESHOLDS: Record<string, Record<string, number>> = {
  Artifact: { N: 0, R: 0, SR: 0, SSR: 0 },
  CDItem:   { N: 0, R: 0, SR: 0, SSR: 0 },
  BookItem: { N: 0, R: 0, SR: 0, SSR: 0 },
};

export interface RecyclableMaterial extends MaterialWithRemaining {
  recyclableQty: number;
  craftCount: number;   // full crafts possible from recyclableQty
  excessItems: number;  // items left over after full crafts
}

function computeCraftStats(recyclableQty: number, craftQuality: number): { craftCount: number; excessItems: number } {
  if (craftQuality <= 0) return { craftCount: 0, excessItems: recyclableQty };
  const itemsPerCraft = Math.ceil(CRAFT_QUALITY_THRESHOLD / craftQuality);
  const craftCount = Math.floor(recyclableQty / itemsPerCraft);
  const excessItems = recyclableQty - craftCount * itemsPerCraft;
  return { craftCount, excessItems };
}

export function useCraftingFodder() {
  const { totalMaterialsNeeded } = useMaterialCalculation();

  const saved = getSettings().craftingFodder;
  const thresholds = ref<Record<string, Record<string, number>>>(
    saved?.thresholds ?? structuredClone(DEFAULT_THRESHOLDS)
  );
  // rarityFilter = the user's current Stage-1 rarity chip selection (persisted).
  const rarityFilter = ref<string[]>(saved?.rarityFilter ?? [...ALL_RARITIES]);
  const markedIds = ref<number[]>(saved?.markedIds ?? []);

  watch([thresholds, rarityFilter, markedIds], () => {
    updateSetting('craftingFodder', {
      thresholds: thresholds.value,
      rarityFilter: rarityFilter.value,
      markedIds: markedIds.value,
    });
  }, { deep: true });

  function toggleMark(id: number) {
    const idx = markedIds.value.indexOf(id);
    if (idx === -1) markedIds.value.push(id);
    else markedIds.value.splice(idx, 1);
  }

  const materialNeededById = computed(() => {
    const map = new Map<number, number>();
    totalMaterialsNeeded.value.forEach(item => {
      const id = item.material?.Id;
      if (id) map.set(id, (map.get(id) ?? 0) + item.materialQuantity);
    });
    return map;
  });

  // Catalog limited to crafting subcategories only.
  const craftingCatalog = computed(() => {
    const allItems = getAllItemsFromCache();
    return Object.values(applyFilters(allItems, MATERIAL)).filter(item =>
      (CRAFTING_SUBCATEGORIES as readonly string[]).includes(item.SubCategory ?? '')
    );
  });

  // Items with actual surplus (remaining > 0).
  const surplusMaterials = computed(() =>
    calculateLeftoverItems(
      craftingCatalog.value,
      id => materialNeededById.value.get(id) ?? 0,
      'materials',
      () => false,
      () => 0
    )
  );

  // Map surplus to recyclable quantities respecting the threshold, with craft stats.
  function toRecyclable(items: MaterialWithRemaining[], filter: readonly string[]): RecyclableMaterial[] {
    return items
      .filter(m => filter.includes(m.material.Rarity ?? ''))
      .map(m => {
        const threshold = thresholds.value[m.material.SubCategory ?? '']?.[m.material.Rarity ?? ''] ?? 0;
        const recyclableQty = Math.max(0, m.remaining - threshold);
        const { craftCount, excessItems } = computeCraftStats(recyclableQty, m.material.CraftQuality ?? 0);
        return { ...m, recyclableQty, craftCount, excessItems };
      })
      .filter(m => m.recyclableQty > 0);
  }

  const recyclableStage1 = computed(() =>
    toRecyclable(surplusMaterials.value, rarityFilter.value)
  );

  const recyclableStage2 = computed(() =>
    toRecyclable(surplusMaterials.value, STAGE2_RARITIES)
  );

  const markedIdSet = computed(() => new Set(markedIds.value));

  function toggleRarity(rarity: string) {
    const idx = rarityFilter.value.indexOf(rarity);
    if (idx === -1) rarityFilter.value.push(rarity);
    else rarityFilter.value.splice(idx, 1);
  }

  return {
    thresholds,
    rarityFilter,
    markedIdSet,
    allRarities: ALL_RARITIES,
    subcategories: CRAFTING_SUBCATEGORIES,
    recyclableStage1,
    recyclableStage2,
    toggleRarity,
    toggleMark,
  };
}
