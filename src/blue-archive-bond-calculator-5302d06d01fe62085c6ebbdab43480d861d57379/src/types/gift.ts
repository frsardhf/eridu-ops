export interface GiftDataProps {
  gift: any;
  exp: number;
  grade: number;
  quantity?: number;
}

export interface BoxDataProps {
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
