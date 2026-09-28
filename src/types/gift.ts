import type { ResourceProps } from '@/types/resource';
import { DEFAULT_CAFE_TAPS_PER_DAY, DEFAULT_LESSON_EXP_RATE } from '@/lib/constants/gameConstants';

export interface GiftProps {
  gift: ResourceProps;
  exp: number;
  grade: number;
  quantity?: number;
}

export interface BondDetailDataProps {
  currentBond: number;
  currentBondExp: number;
  targetBond: number | null;
  targetBondExp: number;
}

export const DEFAULT_BOND_DETAIL: BondDetailDataProps = {
  currentBond: 1,
  currentBondExp: 0,
  targetBond: null,
  targetBondExp: 0,
};

/**
 * Other (non-gift) bond EXP sources, per-student.
 *   cafeTapsPerDay    : invites planned per day, 0..MAX_CAFE_TAPS_PER_DAY
 *   cafeStartDateIso  : YYYY-MM-DD; empty string => treat as today
 *   cafeTargetDateIso : YYYY-MM-DD end date from the picker
 *   cafeDateInclusive : whether to count end date in the day delta
 *   bonusExp          : manual catch-all (lessons, events, future sources)
 *   lessonExpRate     : selected lesson EXP used for helper estimates
 */
export interface OtherExpDataProps {
  cafeTapsPerDay: number;
  cafeStartDateIso: string;
  cafeTargetDateIso: string;
  cafeDateInclusive: boolean;
  bonusExp: number;
  lessonExpRate: number;
}

export const DEFAULT_OTHER_EXP: OtherExpDataProps = {
  cafeTapsPerDay: DEFAULT_CAFE_TAPS_PER_DAY,
  cafeStartDateIso: '',
  cafeTargetDateIso: '',
  cafeDateInclusive: false,
  bonusExp: 0,
  lessonExpRate: DEFAULT_LESSON_EXP_RATE,
};
