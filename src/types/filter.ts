import type { EquipmentType } from '@/types/gear';

export interface StudentFilters {
  squadType: string[];          // 'Main' | 'Support'
  starGrade: number[];          // 1 | 2 | 3
  bulletType: string[];         // 'Explosion' | 'Pierce' | 'Mystic' | 'Sonic'
  armorType: string[];          // 'LightArmor' | 'HeavyArmor' | 'ElasticArmor' | 'Unarmed'
  school: string[];             // raw school keys from SchaleDB
  equipment: EquipmentType[];   // equipment slot types
  availability: number[];       // IsLimited[0]: 0=Regular, 1=Limited, 2=Unique, 3=Fest, 4=Perm 3★
}

export const EMPTY_FILTERS: StudentFilters = {
  squadType: [],
  starGrade: [],
  bulletType: [],
  armorType: [],
  school: [],
  equipment: [],
  availability: [],
};

export function isFiltersEmpty(f: StudentFilters): boolean {
  return Object.values(f).every(v => (v as unknown[]).length === 0);
}

export function countActiveFilters(f: StudentFilters): number {
  return Object.values(f).reduce((sum, v) => sum + (v as unknown[]).length, 0);
}
