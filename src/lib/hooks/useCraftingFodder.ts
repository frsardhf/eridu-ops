import { computed, ref, watch } from 'vue';
import { getAllItemsFromCache } from '../stores/resourceCacheStore';
import { useMaterialCalculation } from './useMaterialCalculation';
import { applyFilters } from '../utils/filterUtils';
import { calculateLeftoverItems } from '../utils/materialUtils';
import { createCraftingFodderSession } from '../utils/craftingUtils';
import { getSettings, updateSetting } from '../utils/settingsStorage';
import { getItemIconUrl } from '../utils/iconUtils';
import { MATERIAL, ALL_RARITIES } from '../../types/resource';
import type { ResourceProps } from '../../types/resource';
import type { MaterialWithRemaining } from '../../types/upgrade';
import type {
  CraftingFodderSession,
  CraftingFodderSessionEntry,
  CraftingFodderStage,
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
  canUndo: boolean;
  canReset: boolean;
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

interface LegacyStageProgress {
  plannedCrafts: number;
  remainingCrafts: number;
}

function isStageProgress(value: unknown): value is LegacyStageProgress {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Record<string, unknown>;
  return (
    typeof progress.plannedCrafts === 'number' &&
    Number.isFinite(progress.plannedCrafts) &&
    typeof progress.remainingCrafts === 'number' &&
    Number.isFinite(progress.remainingCrafts)
  );
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function clampCrafts(value: number, capacity: number): number {
  return Math.min(capacity, Math.max(0, Math.round(value)));
}

function cloneSession(session?: unknown): CraftingFodderSession | null {
  if (!session || typeof session !== 'object') return null;
  const saved = session as Record<string, unknown>;
  const isVersion2 = saved.version === 2;
  const isVersion3 = saved.version === 3;
  const isVersion4 = saved.version === 4;
  if (
    (!isVersion2 && !isVersion3 && !isVersion4) ||
    typeof saved.sourceSignature !== 'string' ||
    !saved.entries ||
    typeof saved.entries !== 'object'
  ) {
    return null;
  }
  if (
    (isVersion3 || isVersion4) &&
    (!isNonNegativeFiniteNumber(saved.stage1Capacity) ||
      !isNonNegativeFiniteNumber(saved.stage2Capacity))
  ) {
    return null;
  }
  if (isVersion4 && !isNonNegativeFiniteNumber(saved.fullCraftCapacity)) return null;

  const entries: Record<number, CraftingFodderSessionEntry> = {};
  for (const value of Object.values(saved.entries)) {
    if (!value || typeof value !== 'object') return null;
    const entry = value as Record<string, unknown>;
    if (!isNonNegativeFiniteNumber(entry.materialId)) return null;

    if (isVersion4) {
      if (
        !isNonNegativeFiniteNumber(entry.craftCapacity) ||
        !isNonNegativeFiniteNumber(entry.excessItems) ||
        !isNonNegativeFiniteNumber(entry.itemsPerCraft) ||
        typeof entry.stage1Eligible !== 'boolean' ||
        typeof entry.stage2Eligible !== 'boolean' ||
        !isNonNegativeFiniteNumber(entry.stage1Crafts) ||
        !isNonNegativeFiniteNumber(entry.stage2Crafts)
      ) {
        return null;
      }

      const craftCapacity = Math.round(entry.craftCapacity);
      const stage1Crafts = clampCrafts(entry.stage1Crafts, craftCapacity);
      const stage2Crafts = clampCrafts(entry.stage2Crafts, craftCapacity - stage1Crafts);
      entries[entry.materialId] = {
        materialId: entry.materialId,
        craftCapacity,
        excessItems: entry.excessItems,
        itemsPerCraft: entry.itemsPerCraft,
        stage1Eligible: entry.stage1Eligible,
        stage2Eligible: entry.stage2Eligible,
        stage1Crafts,
        stage2Crafts,
      };
      continue;
    }

    if (
      !isNonNegativeFiniteNumber(entry.excessItems) ||
      !isNonNegativeFiniteNumber(entry.itemsPerCraft) ||
      !isStageProgress(entry.stage1) ||
      !isStageProgress(entry.stage2)
    ) {
      return null;
    }

    const plannedCrafts = entry.stage1.plannedCrafts + entry.stage2.plannedCrafts;
    const recyclableQty = entry.excessItems + plannedCrafts * entry.itemsPerCraft;
    const craftCapacity =
      entry.itemsPerCraft > 0 ? Math.floor(recyclableQty / entry.itemsPerCraft) : 0;
    const stage1Crafts = clampCrafts(
      entry.stage1.plannedCrafts - entry.stage1.remainingCrafts,
      craftCapacity,
    );
    const stage2Crafts = clampCrafts(
      entry.stage2.plannedCrafts - entry.stage2.remainingCrafts,
      craftCapacity - stage1Crafts,
    );
    entries[entry.materialId] = {
      materialId: entry.materialId,
      craftCapacity,
      excessItems: recyclableQty - craftCapacity * entry.itemsPerCraft,
      itemsPerCraft: entry.itemsPerCraft,
      stage1Eligible: entry.stage1.plannedCrafts > 0,
      stage2Eligible: entry.stage2.plannedCrafts > 0,
      stage1Crafts,
      stage2Crafts,
    };
  }

  const legacyStage1Planned = Object.values(saved.entries).reduce((sum, value) => {
    if (!value || typeof value !== 'object') return sum;
    const progress = (value as Record<string, unknown>).stage1;
    return sum + (isStageProgress(progress) ? progress.plannedCrafts : 0);
  }, 0);
  const legacyStage2Planned = Object.values(saved.entries).reduce((sum, value) => {
    if (!value || typeof value !== 'object') return sum;
    const progress = (value as Record<string, unknown>).stage2;
    return sum + (isStageProgress(progress) ? progress.plannedCrafts : 0);
  }, 0);

  return {
    version: 4,
    sourceSignature: saved.sourceSignature,
    fullCraftCapacity: isVersion4
      ? (saved.fullCraftCapacity as number)
      : Math.min(legacyStage1Planned, legacyStage2Planned),
    stage1Capacity:
      isVersion3 || isVersion4 ? (saved.stage1Capacity as number) : legacyStage1Planned,
    stage2Capacity:
      isVersion3 || isVersion4 ? (saved.stage2Capacity as number) : legacyStage2Planned,
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
      .filter((item) => item.craftCount > 0);
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

  const currentSourceSignature = computed(() =>
    JSON.stringify([
      4,
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
    session.value = createCraftingFodderSession(
      currentSourceSignature.value,
      currentSource.value.map(({ item, stage1, stage2 }) => ({
        materialId: item.material.Id,
        craftCapacity: item.craftCount,
        excessItems: item.excessItems,
        itemsPerCraft: item.itemsPerCraft,
        stage1Eligible: stage1,
        stage2Eligible: stage2,
      })),
      legacyMarkedIds,
    );

    legacyMarkedIds.clear();
  }

  function setRemainingCrafts(materialId: number, stage: CraftingFodderStage, value: number) {
    const currentSession = session.value;
    const entry = currentSession?.entries[materialId];
    if (!currentSession || !entry) return;

    const stageKey = stage === 'stage1' ? 'stage1Crafts' : 'stage2Crafts';
    const currentRemaining = entry.craftCapacity - entry.stage1Crafts - entry.stage2Crafts;
    const desiredRemaining = clampCrafts(value || 0, entry.craftCapacity);
    const difference = desiredRemaining - currentRemaining;
    const currentStageCrafts = entry[stageKey];
    const nextStageCrafts =
      difference < 0
        ? currentStageCrafts + Math.min(-difference, currentRemaining)
        : currentStageCrafts - Math.min(difference, currentStageCrafts);
    session.value = {
      ...currentSession,
      entries: {
        ...currentSession.entries,
        [materialId]: {
          ...entry,
          [stageKey]: nextStageCrafts,
        },
      },
    };
  }

  function resetMaterial(materialId: number, stage: CraftingFodderStage) {
    const currentSession = session.value;
    const entry = currentSession?.entries[materialId];
    if (!currentSession || !entry) return;

    const stageKey = stage === 'stage1' ? 'stage1Crafts' : 'stage2Crafts';
    session.value = {
      ...currentSession,
      entries: {
        ...currentSession.entries,
        [materialId]: { ...entry, [stageKey]: 0 },
      },
    };
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
            stage1Crafts: 0,
            stage2Crafts: 0,
          },
        ]),
      ),
    };
  }

  function getStageMaterials(stage: CraftingFodderStage) {
    return Object.values(session.value?.entries ?? {})
      .filter((entry) => (stage === 'stage1' ? entry.stage1Eligible : entry.stage2Eligible))
      .map((entry): CraftingFodderDisplayMaterial | undefined => {
        const material = catalogById.value.get(entry.materialId);
        if (!material) return undefined;

        const remainingCrafts = entry.craftCapacity - entry.stage1Crafts - entry.stage2Crafts;
        const stageCrafts = stage === 'stage1' ? entry.stage1Crafts : entry.stage2Crafts;
        return {
          material,
          iconUrl: getItemIconUrl(material.Icon, 'item', material.Tier),
          plannedCrafts: entry.craftCapacity,
          remainingCrafts,
          recyclableQty: entry.excessItems + remainingCrafts * entry.itemsPerCraft,
          excessItems: entry.excessItems,
          canUndo: stageCrafts > 0,
          canReset: stageCrafts > 0,
        };
      })
      .filter((item): item is CraftingFodderDisplayMaterial => Boolean(item));
  }

  const stage1Materials = computed(() => getStageMaterials('stage1'));
  const stage2Materials = computed(() => getStageMaterials('stage2'));

  const summary = computed(() => {
    const entries = Object.values(session.value?.entries ?? {});
    const stage1Completed = entries.reduce((sum, entry) => sum + entry.stage1Crafts, 0);
    const stage2Completed = entries.reduce((sum, entry) => sum + entry.stage2Crafts, 0);
    const completed = Math.min(stage1Completed, stage2Completed);
    const remainingCapacity = entries.map((entry) => ({
      entry,
      remaining: entry.craftCapacity - entry.stage1Crafts - entry.stage2Crafts,
    }));
    const totalRemaining = remainingCapacity.reduce((sum, item) => sum + item.remaining, 0);
    const stage1RemainingCapacity = remainingCapacity.reduce(
      (sum, item) => sum + (item.entry.stage1Eligible ? item.remaining : 0),
      0,
    );
    const stage2RemainingCapacity = remainingCapacity.reduce(
      (sum, item) => sum + (item.entry.stage2Eligible ? item.remaining : 0),
      0,
    );
    const maximumCompleted = Math.min(
      stage1Completed + stage1RemainingCapacity,
      stage2Completed + stage2RemainingCapacity,
      Math.floor((stage1Completed + stage2Completed + totalRemaining) / 2),
    );

    return {
      remaining: Math.max(0, maximumCompleted - completed),
      completed,
      stage1Capacity: session.value?.stage1Capacity ?? 0,
      stage2Capacity: session.value?.stage2Capacity ?? 0,
      stage1Planned: session.value?.fullCraftCapacity ?? 0,
      stage2Planned: session.value?.fullCraftCapacity ?? 0,
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
