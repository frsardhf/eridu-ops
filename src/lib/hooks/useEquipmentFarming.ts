import { computed, ref } from 'vue';
import { useGearCalculation } from '@/lib/hooks/useGearCalculation';
import { EQUIPMENT_FARM_STAGES, type FarmStage } from '@/lib/constants/equipmentDrops';

export type FarmMultiplier = 1 | 2 | 3;

export interface FarmCover {
  equipId: number;
  name: string;
  category: string;
  icon: string;       // equipment Icon name (for getItemIconUrl piece art)
  tier: number;
  need: number;       // original missing quantity
  expected: number;   // ~pieces obtained from this stage's runs
}

export interface FarmStagePlan {
  id: number;
  area: number;
  stage: number;
  ap: number;
  runs: number;       // expected runs to clear this stage's primary need
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
 * which normal campaign stages to farm. Algorithm (set-cover, run-minimizing —
 * AP is a flat 10 per farmable stage, so runs are the only cost):
 *
 *   while a missing piece remains:
 *     target = highest-tier still-missing piece
 *     stage  = the normal stage with the best drop *rate* for `target`
 *              (its main-drop stage, which also carries lower-tier byproducts)
 *     runs   = ceil(remaining / rate); credit ALL of that stage's drops
 *              against the remaining needs (the free lower tiers)
 *
 * `rate` is expected pieces *per run* (guaranteed 1.0 + bonus chances, summed —
 * so it can exceed 1). 2x / 3x event multipliers scale that rate (BA drop events
 * multiply the dropped quantity, so 1.2 × 3 = 3.6 pieces/run, NOT capped at 1),
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

  // The raw missing pieces (deficit) — same data the GlobalInventory "missing"
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
    // Effective pieces per run = base rate × event multiplier. The stored rate is
    // already an expected count (guaranteed 1.0 + bonus chances, so it can exceed
    // 1), and a drop event multiplies the quantity per run — so we never cap. A
    // 1.2 stage under 3× yields ~3.6 pieces/run; capping would wrongly collapse
    // 2× and 3× for any rate >= 0.5.
    const eff = (r: number) => r * mult;

    // Best (highest effective rate) normal stage that drops a given piece;
    // ties broken toward the higher stage number ("farm the highest stage").
    const bestStageFor = (equipId: number): { stage: FarmStage; rate: number } | null => {
      let best: { stage: FarmStage; rate: number } | null = null;
      for (const s of EQUIPMENT_FARM_STAGES) {
        const d = s.drops.find(x => x.equipId === equipId);
        if (!d) continue;
        const r = eff(d.rate);
        const rank = s.area * 1000 + s.stage;
        if (!best || r > best.rate ||
            (r === best.rate && rank > best.stage.area * 1000 + best.stage.stage)) {
          best = { stage: s, rate: r };
        }
      }
      return best;
    };

    const remaining = new Map<number, number>([...want].map(([id, p]) => [id, p.qty]));
    const runsByStage = new Map<number, { stage: FarmStage; runs: number }>();

    for (let guard = 0; guard < 2000; guard++) {
      // highest-tier still-missing piece (tie-break: larger remaining qty)
      let target: number | null = null;
      let bestRank = -1;
      for (const [id, q] of remaining) {
        if (q <= 0) continue;
        const rank = (want.get(id)?.tier ?? 0) * 1_000_000 + q;
        if (rank > bestRank) { bestRank = rank; target = id; }
      }
      if (target == null) break;

      const pick = bestStageFor(target);
      if (!pick || pick.rate <= 0) { remaining.set(target, 0); continue; } // not farmable in normal

      const runs = Math.ceil(remaining.get(target)! / pick.rate);
      const acc = runsByStage.get(pick.stage.id) ?? { stage: pick.stage, runs: 0 };
      acc.runs += runs;
      runsByStage.set(pick.stage.id, acc);

      // credit this stage's drops (incl. lower-tier byproducts) against remaining needs
      for (const d of pick.stage.drops) {
        if (remaining.has(d.equipId)) {
          remaining.set(d.equipId, Math.max(0, remaining.get(d.equipId)! - runs * eff(d.rate)));
        }
      }
    }

    const result: FarmStagePlan[] = [];
    for (const { stage, runs } of runsByStage.values()) {
      const covers: FarmCover[] = [];
      for (const d of stage.drops) {
        const p = want.get(d.equipId);
        if (!p) continue;
        covers.push({
          equipId: d.equipId,
          name: p.name,
          category: p.category,
          icon: p.icon,
          tier: p.tier,
          need: p.qty,
          expected: Math.round(runs * eff(d.rate)),
        });
      }
      covers.sort((a, b) => b.tier - a.tier);
      result.push({ id: stage.id, area: stage.area, stage: stage.stage, ap: stage.ap, runs, covers });
    }
    // highest stages first (matches "farm the highest stage" mental model)
    result.sort((a, b) => (b.area * 1000 + b.stage) - (a.area * 1000 + a.stage));
    return result;
  });

  return { plan, multiplier, hasMissing, missingCount, missingList };
}
