import type { ResourceProps } from './resource';

export type SkillType = 'Ex' | 'Public' | 'Passive' | 'ExtraPassive';

export type SkillTypeName = 'Ex' | 'Basic' | 'Enhanced' | 'Sub';

export type PotentialType = 'attack' | 'maxhp' | 'healpower';

export type MaterialType = 'materials' | 'special' | 'equipments' | 'credits' | 'xp';

export interface Material {
  material: ResourceProps;
  materialQuantity: number;
  type?: MaterialType;
}

export interface CharacterLevels {
  current: number;
  target: number;
}

export interface SkillLevels {
  [key: string]: { current: number; target: number };
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

export interface PotentialLevels {
  [key: string]: { current: number; target: number };
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

export interface SkillSettings extends PotentialSettings {
  maxLevel: number;
}

export interface PotentialSettings {
  current: number;
  target: number;
  icon: string;
  name: string;
}

// Re-export CREDITS_ID from centralized synthetic entities
export { CREDITS_ID } from '../consumables/constants/syntheticEntities';

export const EXP_REPORT_ID = [10, 11, 12, 13];

export const ELIGMAS_ID = 23;

export const WORKBOOK_ID = [2000, 2001, 2002];

export const SECRET_TECH_NOTE_ID = 9999;

export const DEFAULT_CHARACTER_LEVELS: CharacterLevels = {
  current: 1,
  target: 1,
};

export const DEFAULT_POTENTIAL_LEVELS: PotentialLevels = {
  attack: { current: 0, target: 0 },
  maxhp: { current: 0, target: 0 },
  healpower: { current: 0, target: 0 }
};

export const DEFAULT_SKILL_LEVELS: SkillLevels = {
  Ex: { current: 1, target: 1 },
  Public: { current: 1, target: 1 },
  Passive: { current: 1, target: 1 },
  ExtraPassive: { current: 1, target: 1 }
};
