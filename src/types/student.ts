import { EquipmentType, StudentGear } from '@/types/gear';
import { GiftProps } from '@/types/gift';
import { ResourceProps } from '@/types/resource';

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
  Skills: Record<string, {
    Parameters: number[][];
    Icon?: string;
    Name?: string;
    Desc?: string;
    Cost?: number[];
    Effects?: { Type: string; [key: string]: unknown }[];
    ExtraSkills?: {
      Icon?: string;
      Name?: string;
      Desc?: string;
      Cost?: number[];
      Parameters?: number[][];
      Effects?: { Type: string; [key: string]: unknown }[];
    }[];
  }>;
}

export interface FetchedData {
  students: Record<string, StudentProps>;
  items: Record<string, ResourceProps>;
  equipment: Record<string, ResourceProps>;
}
