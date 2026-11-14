import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import type { CachedResource } from '@/types/resource';
import { useCraftingFodder } from '../useCraftingFodder';

const state = vi.hoisted(() => ({
  settings: {} as {
    craftingFodder?: {
      thresholds: Record<string, Record<string, number>>;
      rarityFilter: string[];
      session?: unknown;
    };
  },
  items: {} as Record<number, CachedResource>,
  update: vi.fn(),
}));

vi.mock('@/lib/utils/settingsStorage', () => ({
  getSettings: () => state.settings,
  updateSetting: state.update,
}));

vi.mock('@/lib/stores/resourceCacheStore', () => ({
  getAllItemsFromCache: () => state.items,
}));

vi.mock('../useMaterialCalculation', () => ({
  useMaterialCalculation: () => ({ totalMaterialsNeeded: ref([]) }),
}));

function createArtifact(Id: number, Rarity: string, QuantityOwned: number): CachedResource {
  return {
    Id,
    Name: `artifact-${Id}`,
    Rarity,
    Category: 'Material',
    SubCategory: 'Artifact',
    Quality: 1,
    CraftQuality: 20,
    QuantityOwned,
    Icon: `artifact-${Id}`,
    Tags: [],
  };
}

let scope: EffectScope;
beforeEach(() => {
  scope = effectScope();
  state.settings = {};
  state.items = { 101: createArtifact(101, 'N', 10), 102: createArtifact(102, 'SR', 30) };
  state.update.mockClear();
});
afterEach(() => scope.stop());

function useCrafting() {
  return scope.run(useCraftingFodder)!;
}

describe('crafting session safeguards', () => {
  it('normalizes reserve rules from settings and new edits', async () => {
    state.settings = {
      craftingFodder: {
        thresholds: { Artifact: { N: -100, R: 3.75, SR: Infinity, SSR: NaN } },
        rarityFilter: ['N', 'SR'],
      },
    };
    const crafting = useCrafting();

    expect(crafting.thresholds.value.Artifact).toEqual({ N: 0, R: 3, SR: 0, SSR: 0 });
    crafting.setThreshold('Artifact', 'N', -100);
    crafting.setThreshold('Artifact', 'R', NaN);
    crafting.setThreshold('Artifact', 'SR', 5.75);
    expect(crafting.thresholds.value.Artifact).toEqual({ N: 0, R: 0, SR: 5, SSR: 0 });
    expect(crafting.refreshSession()).toBe(true);
    expect(crafting.session.value?.entries[101].craftCapacity).toBe(1);
    expect(crafting.session.value?.entries[102].excessItems).toBe(5);

    await nextTick();
    expect(state.update).toHaveBeenCalledWith(
      'craftingFodder',
      expect.objectContaining({ thresholds: crafting.thresholds.value }),
    );
  });

  it('does not inflate craft capacity even if a live reserve bypasses the setter', () => {
    const crafting = useCrafting();
    crafting.thresholds.value.Artifact.N = -100;

    expect(crafting.refreshSession()).toBe(true);
    expect(crafting.session.value?.entries[101].craftCapacity).toBe(1);
  });

  it('preserves unpaired progress when refreshing the same plan', async () => {
    const crafting = useCrafting();
    expect(crafting.refreshSession()).toBe(true);
    crafting.setRemainingCrafts(102, 'stage2', 2);
    const activeSession = crafting.session.value;

    await nextTick();
    state.update.mockClear();
    expect(crafting.summary.value).toMatchObject({ completed: 0, hasProgress: true });
    expect(crafting.refreshSession()).toBe(false);
    expect(crafting.session.value).toBe(activeSession);
    expect(crafting.session.value?.entries[102].stage2Crafts).toBe(1);

    await nextTick();
    expect(state.update).not.toHaveBeenCalled();
  });

  it('retains a migrated legacy snapshot until explicitly refreshed', async () => {
    state.settings = {
      craftingFodder: {
        thresholds: {},
        rarityFilter: ['N', 'SR'],
        session: {
          version: 3,
          sourceSignature: 'legacy',
          stage1Capacity: 2,
          stage2Capacity: 1,
          entries: {
            102: {
              materialId: 102,
              excessItems: 0,
              itemsPerCraft: 10,
              stage1: { plannedCrafts: 1, remainingCrafts: 0 },
              stage2: { plannedCrafts: 1, remainingCrafts: 1 },
            },
          },
        },
      },
    };
    const crafting = useCrafting();

    expect(crafting.needsRefresh.value).toBe(true);
    expect(crafting.session.value?.entries[102]).toMatchObject({
      craftCapacity: 2,
      stage1Crafts: 1,
      stage2Crafts: 0,
    });
    await nextTick();
    expect(state.update).not.toHaveBeenCalled();

    expect(crafting.refreshSession()).toBe(true);
    expect(crafting.needsRefresh.value).toBe(false);
    expect(crafting.session.value?.entries[102]).toMatchObject({
      craftCapacity: 3,
      stage1Crafts: 0,
      stage2Crafts: 0,
    });
  });

  it('rejects invalid writes and keeps shared remaining limits stage-specific', () => {
    const crafting = useCrafting();
    crafting.refreshSession();
    const initialSession = crafting.session.value;
    crafting.setRemainingCrafts(101, 'stage2', 0);
    crafting.setRemainingCrafts(102, 'stage1', -1);
    crafting.setRemainingCrafts(102, 'stage1', NaN);
    crafting.setRemainingCrafts(102, 'stage1', 0.5);
    expect(crafting.session.value).toBe(initialSession);

    crafting.setRemainingCrafts(102, 'stage2', 2);
    expect(
      crafting.stage1Materials.value.find(({ material }) => material.Id === 102),
    ).toMatchObject({
      remainingCrafts: 2,
      maxRemainingCrafts: 2,
    });
    expect(crafting.stage2Materials.value[0]).toMatchObject({
      remainingCrafts: 2,
      maxRemainingCrafts: 3,
    });
    crafting.setRemainingCrafts(102, 'stage1', 3);
    expect(crafting.session.value?.entries[102].stage2Crafts).toBe(1);
  });
});
