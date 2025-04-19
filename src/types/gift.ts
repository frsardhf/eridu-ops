export interface GiftProps {
  gift: any;
  exp: number;
  grade: number;
  quantity?: number;
}

export interface BondDetailDataProps { 
  currentBond: number;
  convertBox: boolean;
  originalYellowStoneQuantity: number;
  originalSrGiftQuantity: number;
  originalSelectorBoxQuantity: number;
}

export const DEFAULT_BOND_DETAIL: BondDetailDataProps = {
  currentBond: 1,
  convertBox: false,
  originalYellowStoneQuantity: 0,
  originalSrGiftQuantity: 0,
  originalSelectorBoxQuantity: 0
};