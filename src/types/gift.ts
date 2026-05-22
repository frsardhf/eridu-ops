import type { ResourceProps } from '@/types/resource';
import { DEFAULT_CAFE_TAPS_PER_DAY } from '@/lib/constants/gameConstants';

export interface GiftProps {
  gift: ResourceProps;
  exp: number;
  grade: number;
  quantity?: number;
}

export interface BondDetailDataProps {
  currentBond: number;
}

export const DEFAULT_BOND_DETAIL: BondDetailDataProps = {
  currentBond: 1,
};

/**
 * Other (non-gift) bond EXP sources, per-student.
 *   cafeTapsPerDay     — invites planned per day, 0..MAX_CAFE_TAPS_PER_DAY
 *   cafeTargetDateIso  — YYYY-MM-DD string from the date picker
 *   cafeDateInclusive  — whether to count target date in the day delta
 *   bonusExp           — manual catch-all (lessons, events, future sources)
 */
export interface OtherExpDataProps {
  cafeTapsPerDay: number;
  cafeTargetDateIso: string;
  cafeDateInclusive: boolean;
  bonusExp: number;
}

export const DEFAULT_OTHER_EXP: OtherExpDataProps = {
  cafeTapsPerDay: DEFAULT_CAFE_TAPS_PER_DAY,
  cafeTargetDateIso: '',
  cafeDateInclusive: false,
  bonusExp: 0,
};