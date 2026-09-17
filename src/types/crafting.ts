export type CraftingFodderStage = 'stage1' | 'stage2';

export interface CraftingFodderSessionEntry {
  materialId: number;
  craftCapacity: number;
  excessItems: number;
  itemsPerCraft: number;
  stage1Eligible: boolean;
  stage2Eligible: boolean;
  stage1Crafts: number;
  stage2Crafts: number;
}

export interface CraftingFodderSession {
  version: 4;
  sourceSignature: string;
  fullCraftCapacity: number;
  stage1Capacity: number;
  stage2Capacity: number;
  entries: Record<number, CraftingFodderSessionEntry>;
}
