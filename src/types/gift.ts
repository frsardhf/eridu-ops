export interface GiftProps {
  gift: any;
  exp: number;
  grade: number;
  quantity?: number;
}

export interface BondFormDataProps { 
  currentBond: number;
  convertBox: boolean;
  originalYellowStoneQuantity: number;
  originalSrGiftQuantity: number;
}
