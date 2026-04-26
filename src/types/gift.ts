import type { ResourceProps } from '@/types/resource';

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