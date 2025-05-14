export interface GiftProps {
  gift: any;
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