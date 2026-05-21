/**
 * Bond EXP aggregator.
 *
 * Currently sources EXP from per-student gift + box allocations. Future EXP
 * contributors (alternate gift modals, fruit/affection panels, etc.) should
 * be added to `computeStudentBondExpTotal` so that every caller (the bond
 * editor's reactive total, the BondsPage sort key, any downstream summaries)
 * picks them up automatically.
 */

import type { GiftProps } from '@/types/gift';

function getItemExpValue(item: GiftProps | undefined): number {
  if (!item) return 0;
  if (typeof item.exp === 'number') return item.exp;
  // Defensive: some legacy callers handed in raw resources wrapped one extra
  // level deep. Keep the fallback to mirror the original hook behaviour.
  const nested = (item as unknown as { gift?: { exp?: number } }).gift;
  if (nested && typeof nested.exp === 'number') return nested.exp;
  return 0;
}

/**
 * Total EXP contribution from one stack of gift items (favored OR box) given
 * the user's allocated quantities. Pure — no store reads.
 */
export function calculateGiftStackExp(
  items: GiftProps[] | undefined,
  formData: Record<string, number> | undefined,
): number {
  if (!items?.length || !formData) return 0;

  const itemMap = new Map<string, GiftProps>();
  for (const g of items) itemMap.set(String(g.gift.Id), g);

  let total = 0;
  for (const [itemId, quantity] of Object.entries(formData)) {
    if (!quantity || quantity <= 0) continue;
    const item = itemMap.get(itemId);
    if (!item) continue;
    const expValue = getItemExpValue(item);
    if (expValue <= 0) continue;
    total += expValue * quantity;
  }
  return total;
}

export interface BondExpSources {
  favoredGifts?: GiftProps[];
  giftBoxes?: GiftProps[];
  giftFormData?: Record<string, number>;
  boxFormData?: Record<string, number>;
  // Add future EXP-source fields here (e.g. fruits, affection items).
}

/**
 * Aggregate total cumulative bond EXP for one student from every known
 * contributor. Pure function — call it from any context (hook, computed,
 * sort key) by handing it the relevant data.
 */
export function computeStudentBondExpTotal(sources: BondExpSources): number {
  const giftsExp = calculateGiftStackExp(sources.favoredGifts, sources.giftFormData);
  const boxesExp = calculateGiftStackExp(sources.giftBoxes, sources.boxFormData);
  // Future contributors compose here:
  //   const fruitsExp = calculateFruitExp(sources.fruits, sources.fruitFormData);
  //   return giftsExp + boxesExp + fruitsExp;
  return giftsExp + boxesExp;
}
