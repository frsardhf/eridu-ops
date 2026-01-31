import { EquipmentType } from "./gear";
import { GiftProps } from "./gift";
import { ResourceProps } from "./resource";

export interface StudentProps {
  Id: number;
  Name: string;
  DefaultOrder: number;
  WeaponImg: string;
  StarGrade: number;
  ElephIcon: string;
  Gifts: GiftProps[];
  Boxes: GiftProps[];
  Equipment: string[] | EquipmentType[];
  FavorItemUniqueTags: string[];
  FavorItemTags: string[];
  PotentialMaterial: number;
  SkillExMaterial: number[][];
  SkillMaterial: number[][];
  SkillExMaterialAmount: number[][];
  SkillMaterialAmount: number[][];
}

// ModalProps is now identical to StudentProps after removing Materials/Equipments
// (which are global data read from resourceCacheStore, not student-specific)
// Kept as alias for backward compatibility with existing component props
export type ModalProps = StudentProps;

export interface FetchedData {
  students: Record<string, StudentProps>;
  items: Record<string, ResourceProps>;
  equipment: Record<string, ResourceProps>;
}