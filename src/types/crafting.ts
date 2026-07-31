export type CraftingFodderStage = 'stage1' | 'stage2';

export interface CraftingFodderStageProgress {
  plannedCrafts: number;
  remainingCrafts: number;
}

export interface CraftingFodderSessionEntry {
  materialId: number;
  excessItems: number;
  itemsPerCraft: number;
  stage1: CraftingFodderStageProgress;
  stage2: CraftingFodderStageProgress;
}

export interface CraftingFodderSession {
  version: 3;
  sourceSignature: string;
  stage1Capacity: number;
  stage2Capacity: number;
  entries: Record<number, CraftingFodderSessionEntry>;
}
