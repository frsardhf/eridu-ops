/**
 * Bond EXP aggregator.
 *
 * Currently sources EXP from per-student gift + box allocations. Future EXP
 * contributors (alternate gift modals, fruit/affection panels, etc.) should
 * be added to `computeStudentBondExpTotal` so that every caller (the bond
 * editor's reactive total, the BondsPage sort key, any downstream summaries)
 * picks them up automatically.
 */

import type { GiftProps, OtherExpDataProps } from '@/types/gift';
import { CAFE_TAP_EXP } from '@/lib/constants/gameConstants';

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
  /** Cafe taps + manual bonus EXP (lessons, events). */
  otherExp?: OtherExpDataProps;
  // Add future EXP-source fields here (e.g. fruits, affection items).
}

/**
 * Parse a YYYY-MM-DD string into a Date at local midnight. Returns null
 * for empty input or invalid dates so callers don't get NaN-time Dates.
 */
export function isoToDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inverse of `isoToDate` — local-date components formatted as YYYY-MM-DD. */
export function dateToIso(d: Date | null): string {
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Days from local midnight today until `targetDateIso` (YYYY-MM-DD).
 * Past or invalid dates → 0. If `inclusive`, the target date counts as
 * one of the days (so today→today inclusive = 1, today→today exclusive = 0).
 */
export function computeCafeDays(targetDateIso: string, inclusive: boolean): number {
  if (!targetDateIso) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${targetDateIso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const diffMs = target.getTime() - today.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 0) return 0;
  return inclusive ? days + 1 : days;
}

/** Total EXP from `taps × days × CAFE_TAP_EXP`, clamped to ≥ 0. */
export function computeCafeExp(tapsPerDay: number, days: number): number {
  const t = Math.max(0, tapsPerDay || 0);
  const d = Math.max(0, days || 0);
  return t * d * CAFE_TAP_EXP;
}

/** Combined cafe + manual bonus EXP. Pure — no clock read. */
export function computeOtherExpTotal(other: OtherExpDataProps | undefined): number {
  if (!other) return 0;
  const days = computeCafeDays(other.cafeTargetDateIso, other.cafeDateInclusive);
  return computeCafeExp(other.cafeTapsPerDay, days) + Math.max(0, other.bonusExp || 0);
}

/**
 * Aggregate total cumulative bond EXP for one student from every known
 * contributor. Pure function — call it from any context (hook, computed,
 * sort key) by handing it the relevant data.
 */
export function computeStudentBondExpTotal(sources: BondExpSources): number {
  const giftsExp = calculateGiftStackExp(sources.favoredGifts, sources.giftFormData);
  const boxesExp = calculateGiftStackExp(sources.giftBoxes, sources.boxFormData);
  const otherExp = computeOtherExpTotal(sources.otherExp);
  // Future contributors compose here:
  //   const fruitsExp = calculateFruitExp(sources.fruits, sources.fruitFormData);
  return giftsExp + boxesExp + otherExp;
}
