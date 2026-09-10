import { computed, ref } from 'vue';
import { useGearCalculation } from '@/lib/hooks/useGearCalculation';
import { EQUIPMENT_FARM_STAGES, type FarmStage } from '@/lib/constants/equipmentDrops';
import {
  getGeneralBlueprintCategory,
  getGeneralBlueprintCost,
} from '@/lib/utils/equipmentBlueprintUtils';

export type FarmMultiplier = 1 | 2 | 3;

interface FarmCover {
  equipId: number;
  name: string;
  category: string;
  icon: string; // equipment Icon name (for getItemIconUrl piece art)
  tier: number;
  need: number; // original missing quantity
  expected: number; // ~pieces obtained from this stage's runs
}

export interface FarmStagePlan {
  id: number;
  area: number;
  stage: number;
  ap: number;
  runs: number; // expected runs to clear this stage's primary need
  covers: FarmCover[]; // every missing piece this stage yields (primary + byproducts)
}

interface MissingPiece {
  qty: number;
  tier: number;
  name: string;
  category: string;
  icon: string;
}

/**
 * Equipment farming suggestions for the /students "Equipment Farming" tool.
 *
 * Reads the MISSING equipment (Tier >= 2) from the gear calc and recommends
 * which normal campaign stages to farm. Algorithm (set-cover, run-minimizing;
 * AP is a flat 10 per farmable stage, so runs are the only cost):
 *
 *   while a missing piece remains:
 *     target = highest-tier still-missing piece
 *     stage  = the normal stage with the best drop *rate* for `target`
 *              (its main-drop stage, which also carries lower-tier byproducts)
 *     runs   = ceil(remaining / rate); credit ALL of that stage's drops
 *              against the remaining needs (the free lower tiers)
 *
 * `rate` is expected pieces *per run* (guaranteed 1.0 + bonus chances, summed,
 * so it can exceed 1). 2x / 3x event multipliers scale that rate (BA drop events
 * multiply the dropped quantity, so 1.2 x 3 = 3.6 pieces/run, NOT capped at 1),
 * which shrinks the runs proportionally.
 * Pieces that drop in no normal stage are dropped (hard-only / craft-only).
 */
export function useEquipmentFarming() {
  const { equipmentsLeftover } = useGearCalculation();
  const multiplier = ref<FarmMultiplier>(1);

  const missing = computed(() => {
    const m = new Map<number, MissingPiece>();
    for (const it of equipmentsLeftover.value) {
      if (it.type === 'xp') continue;
      const mat = it.material;
      const tier = mat?.Tier ?? 0;
      if (!mat?.Id || tier < 2 || it.materialQuantity >= 0) continue;
      m.set(mat.Id, {
        qty: -it.materialQuantity,
        tier,
        name: mat.Name ?? String(mat.Id),
        category: mat.Category ?? '',
        icon: mat.Icon ?? '',
      });
    }
    return m;
  });

  const hasMissing = computed(() => missing.value.size > 0);
  const missingCount = computed(() => missing.value.size);

  // The raw missing pieces (deficit): same data the GlobalInventory "missing"
  // view shows, surfaced here so users don't have to switch modals. Highest tier
  // first, then by name.
  const missingList = computed(() =>
    [...missing.value.entries()]
      .map(([equipId, p]) => ({ equipId, ...p }))
      .sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name)),
  );

  const plan = computed<FarmStagePlan[]>(() => {
    const want = missing.value;
    if (!want.size) return [];

    const mult = multiplier.value;
    // Effective pieces per run = base rate x event multiplier. The stored rate is
    // already an expected count (guaranteed 1.0 + bonus chances, so it can exceed
    // 1), and a drop event multiplies the quantity per run, so we never cap. A
    // 1.2 stage under 3x yields ~3.6 pieces/run; capping would wrongly collapse
    // 2x and 3x for any rate >= 0.5.
    const eff = (r: number) => r * mult;

    // Best normal stage for a concrete piece. A matching general blueprint drop
    // contributes its concrete-piece equivalent at the target tier's exchange rate.
    // ties broken toward the higher stage number ("farm the highest stage").
    const bestStageFor = (equipId: number): { stage: FarmStage; rate: number } | null => {
      let best: { stage: FarmStage; rate: number } | null = null;
      const target = want.get(equipId);
      if (!target) return null;
      const generalCost = getGeneralBlueprintCost(target.tier);
      for (const s of EQUIPMENT_FARM_STAGES) {
        const directRate = s.drops.find((x) => x.equipId === equipId)?.rate ?? 0;
        const generalRate = generalCost
          ? s.generalDrops
              .filter((drop) => getGeneralBlueprintCategory(drop.blueprintId) === target.category)
              .reduce((sum, drop) => sum + drop.rate / generalCost, 0)
          : 0;
        const r = eff(directRate + generalRate);
        if (r <= 0) continue;
        const rank = s.area * 1000 + s.stage;
        if (
          !best ||
          r > best.rate ||
          (r === best.rate && rank > best.stage.area * 1000 + best.stage.stage)
        ) {
          best = { stage: s, rate: r };
        }
      }
      return best;
    };

    const remaining = new Map<number, number>([...want].map(([id, p]) => [id, p.qty]));
    const runsByStage = new Map<
      number,
      { stage: FarmStage; runs: number; creditedById: Map<number, number> }
    >();

    for (let guard = 0; guard < 2000; guard++) {
      // highest-tier still-missing piece (tie-break: larger remaining qty)
      let target: number | null = null;
      let bestRank = -1;
      for (const [id, q] of remaining) {
        if (q <= 0) continue;
        const rank = (want.get(id)?.tier ?? 0) * 1_000_000 + q;
        if (rank > bestRank) {
          bestRank = rank;
          target = id;
        }
      }
      if (target == null) break;

      const pick = bestStageFor(target);
      if (!pick || pick.rate <= 0) {
        remaining.set(target, 0);
        continue;
      } // not farmable in normal

      const runs = Math.ceil(remaining.get(target)! / pick.rate);
      const acc = runsByStage.get(pick.stage.id) ?? {
        stage: pick.stage,
        runs: 0,
        creditedById: new Map<number, number>(),
      };
      acc.runs += runs;
      runsByStage.set(pick.stage.id, acc);

      // credit this stage's drops (incl. lower-tier byproducts) against remaining needs
      for (const d of pick.stage.drops) {
        if (remaining.has(d.equipId)) {
          const before = remaining.get(d.equipId)!;
          const after = Math.max(0, before - runs * eff(d.rate));
          remaining.set(d.equipId, after);
          acc.creditedById.set(d.equipId, (acc.creditedById.get(d.equipId) ?? 0) + before - after);
        }
      }

      for (const drop of pick.stage.generalDrops) {
        const category = getGeneralBlueprintCategory(drop.blueprintId);
        if (!category) continue;
        let generalUnits = runs * eff(drop.rate);
        const candidates = [...remaining.keys()]
          .filter((id) => (remaining.get(id) ?? 0) > 0 && want.get(id)?.category === category)
          .sort((a, b) => {
            if (a === target) return -1;
            if (b === target) return 1;
            return (want.get(b)?.tier ?? 0) - (want.get(a)?.tier ?? 0);
          });

        for (const id of candidates) {
          const cost = getGeneralBlueprintCost(want.get(id)?.tier ?? 0);
          if (!cost || generalUnits <= 0) continue;
          const before = remaining.get(id) ?? 0;
          const covered = Math.min(before, generalUnits / cost);
          remaining.set(id, before - covered);
          generalUnits -= covered * cost;
          acc.creditedById.set(id, (acc.creditedById.get(id) ?? 0) + covered);
        }
      }
    }

    const result: FarmStagePlan[] = [];
    for (const { stage, runs, creditedById } of runsByStage.values()) {
      const covers: FarmCover[] = [];
      for (const [equipId, expected] of creditedById) {
        const p = want.get(equipId);
        if (!p) continue;
        covers.push({
          equipId,
          name: p.name,
          category: p.category,
          icon: p.icon,
          tier: p.tier,
          need: p.qty,
          expected: Math.round(expected),
        });
      }
      covers.sort((a, b) => b.tier - a.tier);
      result.push({
        id: stage.id,
        area: stage.area,
        stage: stage.stage,
        ap: stage.ap,
        runs,
        covers,
      });
    }
    // highest stages first (matches "farm the highest stage" mental model)
    result.sort((a, b) => b.area * 1000 + b.stage - (a.area * 1000 + a.stage));
    return result;
  });

  return { plan, multiplier, hasMissing, missingCount, missingList };
}
