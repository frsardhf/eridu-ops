import { EquipmentType, StudentGear } from '@/types/gear';
import { GiftProps } from '@/types/gift';
import { ResourceProps } from '@/types/resource';

export interface StudentProps {
  Id: number;
  Name: string;
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
  [key: string]: any;
}

export interface FetchedData {
  students: Record<string, StudentProps>;
  items: Record<string, ResourceProps>;
  equipment: Record<string, ResourceProps>;
}
