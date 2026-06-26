import { EquipmentType, StudentGear } from '@/types/gear';
import { GiftProps } from '@/types/gift';
import { ResourceProps } from '@/types/resource';
import { SchaleSkill } from '@/types/schaledb';

export interface StudentProps {
  Id: number;
  Name: string;
  PathName?: string;
  DefaultOrder: number;
  WeaponImg: string;
  StarGrade: number;
  ElephIcon: string;
  Gifts: GiftProps[];
  Boxes: GiftProps[];
  Gear: StudentGear;
  Equipment: EquipmentType[];
  FavorItemUniqueTags: string[];
  FavorItemTags: string[];
  PotentialMaterial: number;
  SkillExMaterial: number[][];
  SkillMaterial: number[][];
  SkillExMaterialAmount: number[][];
  SkillMaterialAmount: number[][];
  School: string;
  CollectionBG: string;
  Club: string;
  SquadType: string;
  TacticRole: string;
  BulletType: string;
  ArmorType: string;
  IsLimited: number[];
  /** Per-region release flags from SchaleDB: [Japan, Global, China]. Index 1 is
   * Global; used by the Hall to drop JP-only students from a Global-only wall. */
  IsReleased?: boolean[];
  Skills: Record<string, SchaleSkill>;
}

export interface FetchedData {
  students: Record<string, StudentProps>;
  items: Record<string, ResourceProps>;
  equipment: Record<string, ResourceProps>;
}
