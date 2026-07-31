import { computed, ref, watch } from 'vue';
import { getAllItemsFromCache } from '../stores/resourceCacheStore';
import { useMaterialCalculation } from './useMaterialCalculation';
import { applyFilters } from '../utils/filterUtils';
import { calculateLeftoverItems } from '../utils/materialUtils';
import { createCraftingStagePlan } from '../utils/craftingUtils';
import { getSettings, updateSetting } from '../utils/settingsStorage';
import { getItemIconUrl } from '../utils/iconUtils';
import { MATERIAL, ALL_RARITIES } from '../../types/resource';
import type { ResourceProps } from '../../types/resource';
import type { MaterialWithRemaining } from '../../types/upgrade';
import type {
  CraftingFodderSession,
  CraftingFodderSessionEntry,
  CraftingFodderStage,
  CraftingFodderStageProgress,
} from '../../types/crafting';

const CRAFTING_SUBCATEGORIES = ['Artifact', 'CDItem', 'BookItem'] as const;
const STAGE2_RARITIES: readonly string[] = ['SR', 'SSR'];
const CRAFT_QUALITY_THRESHOLD = 200;
const RARITY_PRIORITY: Record<string, number> = { N: 0, R: 1, SR: 2, SSR: 3 };

const DEFAULT_THRESHOLDS: Record<string, Record<string, number>> = {
  Artifact: { N: 0, R: 0, SR: 0, SSR: 0 },
  CDItem: { N: 0, R: 0, SR: 0, SSR: 0 },
  BookItem: { N: 0, R: 0, SR: 0, SSR: 0 },
};

interface CraftStats {
  craftCount: number;
  excessItems: number;
  itemsPerCraft: number;
}

interface RecyclableMaterial extends MaterialWithRemaining, CraftStats {
  recyclableQty: number;
}

export interface CraftingFodderDisplayMaterial {
  material: ResourceProps;
  iconUrl: string;
  plannedCrafts: number;
  remainingCrafts: number;
  recyclableQty: number;
  excessItems: number;
}

function computeCraftStats(recyclableQty: number, craftQuality: number): CraftStats {
  if (craftQuality <= 0) {
    return { craftCount: 0, excessItems: recyclableQty, itemsPerCraft: 0 };
  }

  const itemsPerCraft = Math.ceil(CRAFT_QUALITY_THRESHOLD / craftQuality);
  const craftCount = Math.floor(recyclableQty / itemsPerCraft);
  const excessItems = recyclableQty - craftCount * itemsPerCraft;
  return { craftCount, excessItems, itemsPerCraft };
}

function cloneThresholds(
  thresholds?: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const next = structuredClone(DEFAULT_THRESHOLDS);
  if (!thresholds) return next;

  for (const subcategory of CRAFTING_SUBCATEGORIES) {
    for (const rarity of ALL_RARITIES) {
      next[subcategory][rarity] = Math.max(0, thresholds[subcategory]?.[rarity] ?? 0);
    }
  }
  return next;
}

function isStageProgress(value: unknown): value is CraftingFodderStageProgress {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Record<string, unknown>;
  return (
    typeof progress.plannedCrafts === 'number' &&
    Number.isFinite(progress.plannedCrafts) &&
    typeof progress.remainingCrafts === 'number' &&
    Number.isFinite(progress.remainingCrafts)
  );
}

function cloneSession(session?: unknown): CraftingFodderSession | null {
  if (!session || typeof session !== 'object') return null;
  const saved = session as Record<string, unknown>;
  const isVersion2 = saved.version === 2;
  const isVersion3 = saved.version === 3;
  if (
    (!isVersion2 && !isVersion3) ||
    typeof saved.sourceSignature !== 'string' ||
    !saved.entries ||
    typeof saved.entries !== 'object'
  ) {
    return null;
  }
  if (
    isVersion3 &&
    (typeof saved.stage1Capacity !== 'number' ||
      !Number.isFinite(saved.stage1Capacity) ||
      typeof saved.stage2Capacity !== 'number' ||
      !Number.isFinite(saved.stage2Capacity))
  ) {
    return null;
  }

  const entries: Record<number, CraftingFodderSessionEntry> = {};
  for (const value of Object.values(saved.entries)) {
    if (!value || typeof value !== 'object') return null;
    const entry = value as Record<string, unknown>;
    if (
      typeof entry.materialId !== 'number' ||
      typeof entry.excessItems !== 'number' ||
      typeof entry.itemsPerCraft !== 'number' ||
      !isStageProgress(entry.stage1) ||
      !isStageProgress(entry.stage2)
    ) {
      return null;
    }

    entries[entry.materialId] = {
      materialId: entry.materialId,
      excessItems: entry.excessItems,
      itemsPerCraft: entry.itemsPerCraft,
      stage1: { ...entry.stage1 },
      stage2: { ...entry.stage2 },
    };
  }

  return {
    version: 3,
    sourceSignature: saved.sourceSignature,
    stage1Capacity: isVersion3
      ? (saved.stage1Capacity as number)
      : Object.values(entries).reduce((sum, entry) => sum + entry.stage1.plannedCrafts, 0),
    stage2Capacity: isVersion3
      ? (saved.stage2Capacity as number)
      : Object.values(entries).reduce((sum, entry) => sum + entry.stage2.plannedCrafts, 0),
    entries,
  };
}

export function useCraftingFodder() {
  const { totalMaterialsNeeded } = useMaterialCalculation();

  const saved = getSettings().craftingFodder;
  const thresholds = ref(cloneThresholds(saved?.thresholds));
  const rarityFilter = ref<string[]>([...(saved?.rarityFilter ?? ALL_RARITIES)]);
  const session = ref<CraftingFodderSession | null>(cloneSession(saved?.session));
  const legacyMarkedIds = new Set(saved?.markedIds ?? []);

  watch(
    [thresholds, rarityFilter, session],
    () => {
      updateSetting('craftingFodder', {
        thresholds: cloneThresholds(thresholds.value),
        rarityFilter: [...rarityFilter.value],
        session: cloneSession(session.value) ?? undefined,
      });
    },
    { deep: true },
  );

  const materialNeededById = computed(() => {
    const map = new Map<number, number>();
    totalMaterialsNeeded.value.forEach((item) => {
      const id = item.material?.Id;
      if (id) map.set(id, (map.get(id) ?? 0) + item.materialQuantity);
    });
    return map;
  });

  const craftingCatalog = computed(() => {
    const allItems = getAllItemsFromCache();
    return Object.values(applyFilters(allItems, MATERIAL)).filter((item) =>
      (CRAFTING_SUBCATEGORIES as readonly string[]).includes(item.SubCategory ?? ''),
    );
  });

  const catalogById = computed(
    () => new Map(craftingCatalog.value.map((material) => [material.Id, material])),
  );

  const surplusMaterials = computed(() =>
    calculateLeftoverItems(
      craftingCatalog.value,
      (id) => materialNeededById.value.get(id) ?? 0,
      'materials',
      () => false,
      () => 0,
    ),
  );

  function toRecyclable(
    items: MaterialWithRemaining[],
    filter: readonly string[],
  ): RecyclableMaterial[] {
    return items
      .filter((item) => filter.includes(item.material.Rarity ?? ''))
      .map((item) => {
        const threshold =
          thresholds.value[item.material.SubCategory ?? '']?.[item.material.Rarity ?? ''] ?? 0;
        const recyclableQty = Math.max(0, item.remaining - threshold);
        return {
          ...item,
          recyclableQty,
          ...computeCraftStats(recyclableQty, item.material.CraftQuality ?? 0),
        };
      })
      .filter((item) => item.recyclableQty > 0);
  }

  const currentStage1 = computed(() => toRecyclable(surplusMaterials.value, rarityFilter.value));
  const currentStage2 = computed(() => toRecyclable(surplusMaterials.value, STAGE2_RARITIES));

  const currentSource = computed(() => {
    const entries = new Map<
      number,
      {
        item: RecyclableMaterial;
        stage1: boolean;
        stage2: boolean;
      }
    >();

    for (const item of currentStage1.value) {
      entries.set(item.material.Id, { item, stage1: true, stage2: false });
    }
    for (const item of currentStage2.value) {
      const existing = entries.get(item.material.Id);
      if (existing) existing.stage2 = true;
      else entries.set(item.material.Id, { item, stage1: false, stage2: true });
    }

    return [...entries.values()].sort((a, b) => {
      const rarityDifference =
        (RARITY_PRIORITY[a.item.material.Rarity ?? ''] ?? Number.MAX_SAFE_INTEGER) -
        (RARITY_PRIORITY[b.item.material.Rarity ?? ''] ?? Number.MAX_SAFE_INTEGER);
      return rarityDifference || a.item.material.Id - b.item.material.Id;
    });
  });

  const currentPlan = computed(() =>
    createCraftingStagePlan(
      currentSource.value.map(({ item, stage1, stage2 }) => ({
        materialId: item.material.Id,
        craftCapacity: item.craftCount,
        stage1Eligible: stage1,
        stage2Eligible: stage2,
      })),
    ),
  );

  const currentSourceSignature = computed(() =>
    JSON.stringify([
      3,
      currentSource.value.map(({ item, stage1, stage2 }) => [
        item.material.Id,
        item.craftCount,
        item.recyclableQty,
        item.excessItems,
        item.itemsPerCraft,
        stage1,
        stage2,
      ]),
    ]),
  );

  function refreshSession() {
    const entries: Record<number, CraftingFodderSessionEntry> = {};

    for (const { item } of currentSource.value) {
      const allocation = currentPlan.value.allocations[item.material.Id];
      if (!allocation) continue;

      const plannedCrafts = allocation.stage1Crafts + allocation.stage2Crafts;
      const isLegacyComplete = legacyMarkedIds.has(item.material.Id);
      entries[item.material.Id] = {
        materialId: item.material.Id,
        excessItems: item.recyclableQty - plannedCrafts * item.itemsPerCraft,
        itemsPerCraft: item.itemsPerCraft,
        stage1: {
          plannedCrafts: allocation.stage1Crafts,
          remainingCrafts: isLegacyComplete ? 0 : allocation.stage1Crafts,
        },
        stage2: {
          plannedCrafts: allocation.stage2Crafts,
          remainingCrafts: isLegacyComplete ? 0 : allocation.stage2Crafts,
        },
      };
    }

    legacyMarkedIds.clear();
    session.value = {
      version: 3,
      sourceSignature: currentSourceSignature.value,
      stage1Capacity: currentPlan.value.stage1Capacity,
      stage2Capacity: currentPlan.value.stage2Capacity,
      entries,
    };
  }

  function setRemainingCrafts(materialId: number, stage: CraftingFodderStage, value: number) {
    const currentSession = session.value;
    const entry = currentSession?.entries[materialId];
    if (!currentSession || !entry) return;

    const progress = entry[stage];
    const remainingCrafts = Math.min(progress.plannedCrafts, Math.max(0, Math.round(value || 0)));
    session.value = {
      ...currentSession,
      entries: {
        ...currentSession.entries,
        [materialId]: {
          ...entry,
          [stage]: { ...progress, remainingCrafts },
        },
      },
    };
  }

  function resetMaterial(materialId: number, stage: CraftingFodderStage) {
    const entry = session.value?.entries[materialId];
    if (entry) setRemainingCrafts(materialId, stage, entry[stage].plannedCrafts);
  }

  function resetProgress() {
    const currentSession = session.value;
    if (!currentSession) return;

    session.value = {
      ...currentSession,
      entries: Object.fromEntries(
        Object.values(currentSession.entries).map((entry) => [
          entry.materialId,
          {
            ...entry,
            stage1: { ...entry.stage1, remainingCrafts: entry.stage1.plannedCrafts },
            stage2: { ...entry.stage2, remainingCrafts: entry.stage2.plannedCrafts },
          },
        ]),
      ),
    };
  }

  function getStageMaterials(stage: CraftingFodderStage) {
    return Object.values(session.value?.entries ?? {})
      .filter((entry) => entry[stage].plannedCrafts > 0)
      .map((entry): CraftingFodderDisplayMaterial | undefined => {
        const material = catalogById.value.get(entry.materialId);
        if (!material) return undefined;

        const totalRemainingCrafts = entry.stage1.remainingCrafts + entry.stage2.remainingCrafts;
        return {
          material,
          iconUrl: getItemIconUrl(material.Icon, 'item', material.Tier),
          plannedCrafts: entry[stage].plannedCrafts,
          remainingCrafts: entry[stage].remainingCrafts,
          recyclableQty: entry.excessItems + totalRemainingCrafts * entry.itemsPerCraft,
          excessItems: entry.excessItems,
        };
      })
      .filter((item): item is CraftingFodderDisplayMaterial => Boolean(item));
  }

  const stage1Materials = computed(() => getStageMaterials('stage1'));
  const stage2Materials = computed(() => getStageMaterials('stage2'));

  const summary = computed(() => {
    const entries = Object.values(session.value?.entries ?? {});
    const stage1Planned = entries.reduce((sum, entry) => sum + entry.stage1.plannedCrafts, 0);
    const stage2Planned = entries.reduce((sum, entry) => sum + entry.stage2.plannedCrafts, 0);
    const stage1Remaining = entries.reduce((sum, entry) => sum + entry.stage1.remainingCrafts, 0);
    const stage2Remaining = entries.reduce((sum, entry) => sum + entry.stage2.remainingCrafts, 0);
    const stage1Completed = stage1Planned - stage1Remaining;
    const stage2Completed = stage2Planned - stage2Remaining;
    const planned = Math.min(stage1Planned, stage2Planned);
    const completed = Math.min(stage1Completed, stage2Completed);

    return {
      remaining: planned - completed,
      completed,
      stage1Capacity: session.value?.stage1Capacity ?? 0,
      stage2Capacity: session.value?.stage2Capacity ?? 0,
      stage1Planned,
      stage2Planned,
      hasProgress: stage1Completed > 0 || stage2Completed > 0,
    };
  });

  function toggleRarity(rarity: string) {
    const index = rarityFilter.value.indexOf(rarity);
    if (index === -1) rarityFilter.value = [...rarityFilter.value, rarity];
    else rarityFilter.value = rarityFilter.value.filter((value) => value !== rarity);
  }

  function resetThresholds(subcategory: string) {
    thresholds.value = {
      ...thresholds.value,
      [subcategory]: { N: 0, R: 0, SR: 0, SSR: 0 },
    };
  }

  return {
    thresholds,
    rarityFilter,
    allRarities: ALL_RARITIES,
    subcategories: CRAFTING_SUBCATEGORIES,
    session,
    hasSession: computed(() => session.value !== null),
    needsRefresh: computed(
      () =>
        session.value !== null && session.value.sourceSignature !== currentSourceSignature.value,
    ),
    stage1Materials,
    stage2Materials,
    summary,
    toggleRarity,
    resetThresholds,
    refreshSession,
    resetProgress,
    resetMaterial,
    setRemainingCrafts,
  };
}
