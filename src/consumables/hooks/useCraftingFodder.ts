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

const DEFAULT_THRESHOLDS: Record<string, Record<string, number>> = {
  Artifact: { N: 0, R: 0, SR: 0, SSR: 0 },
  CDItem:   { N: 0, R: 0, SR: 0, SSR: 0 },
  BookItem: { N: 0, R: 0, SR: 0, SSR: 0 },
};

export interface RecyclableMaterial extends MaterialWithRemaining {
  recyclableQty: number;
}

export function useCraftingFodder() {
  const { totalMaterialsNeeded } = useMaterialCalculation();

  const saved = getSettings().craftingFodder;
  const thresholds = ref<Record<string, Record<string, number>>>(
    saved?.thresholds ?? structuredClone(DEFAULT_THRESHOLDS)
  );
  // rarityFilter = the user's current Stage-1 rarity chip selection (persisted).
  const rarityFilter = ref<string[]>(saved?.rarityFilter ?? [...ALL_RARITIES]);

  watch([thresholds, rarityFilter], () => {
    updateSetting('craftingFodder', {
      thresholds: thresholds.value,
      rarityFilter: rarityFilter.value,
    });
  }, { deep: true });

  // Build a map of needed quantities from the material calculation store.
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

  // Map surplus to recyclable quantities respecting the threshold.
  function toRecyclable(items: MaterialWithRemaining[], filter: readonly string[]): RecyclableMaterial[] {
    return items
      .filter(m => filter.includes(m.material.Rarity ?? ''))
      .map(m => {
        const sub = m.material.SubCategory ?? '';
        const rar = m.material.Rarity ?? '';
        const threshold = thresholds.value[sub]?.[rar] ?? 0;
        return { ...m, recyclableQty: Math.max(0, m.remaining - threshold) };
      })
      .filter(m => m.recyclableQty > 0);
  }

  // Stage 1: filtered by user's rarity chip selection.
  const recyclableStage1 = computed(() =>
    toRecyclable(surplusMaterials.value, rarityFilter.value)
  );

  // Stage 2: always SR + SSR only.
  const recyclableStage2 = computed(() =>
    toRecyclable(surplusMaterials.value, STAGE2_RARITIES)
  );

  function toggleRarity(rarity: string) {
    const idx = rarityFilter.value.indexOf(rarity);
    if (idx === -1) rarityFilter.value.push(rarity);
    else rarityFilter.value.splice(idx, 1);
  }

  return {
    thresholds,
    rarityFilter,
    allRarities: ALL_RARITIES,
    subcategories: CRAFTING_SUBCATEGORIES,
    recyclableStage1,
    recyclableStage2,
    toggleRarity,
  };
}
