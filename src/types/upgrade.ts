// Define potential types
export type PotentialType = 'attack' | 'maxhp' | 'healpower';

export interface PotentialMaterial {
  material: Record<string, any> | null;
  workbook: Record<string, any> | null;
  materialQuantity: number;
  workbookQuantity: number;
  levelsInBlock: number;
  blockStart: number;
  blockEnd: number;
  potentialType: PotentialType;
}

export interface PotentialLevels {
  attack: {
    current: number;
    target: number;
  };
  maxhp: {
    current: number;
    target: number;
  };
  healpower: {
    current: number;
    target: number;
  };
}

export interface PotentialSettings {
  current: number;
  target: number;
  icon: string;
  name: string;
}

// Define skill types
export type SkillType = 'Ex' | 'Public' | 'Passive' | 'ExtraPassive';

export interface SkillMaterial {
  material: Record<string, any> | null;
  materialQuantity: number;
  level: number;
  blockStart?: number;
  blockEnd?: number;
  potentialType: PotentialType | SkillType;
}

export interface SkillLevels {
  Ex: {
    current: number;
    target: number;
  };
  Public: {
    current: number;
    target: number;
  };
  Passive: {
    current: number;
    target: number;
  };
  ExtraPassive: {
    current: number;
    target: number;
  };
}

export interface SkillSettings {
  current: number;
  target: number;
  icon: string;
  name: string;
  maxLevel: number;
}

// Constants
export const WORKBOOK_ID = [2000, 2001, 2002];

export const SECRET_TECH_NOTE_ID = 9999;
