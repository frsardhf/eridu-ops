export interface GiftDataProps {
  id: number;
  gift: any;
  exp: number;
  grade: number;
  quantity?: number;
}

export interface BoxDataProps {
  id: number;
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
