import { GiftProps } from "./gift";
import { ResourceProps } from "./resource";

export interface StudentProps {
  Id: number;
  Name: string;
  DefaultOrder: number;
  WeaponImg: string;
  StarGrade: number;
  Gifts: GiftProps[];
  Boxes: GiftProps[];
  Equipment: string[];
  FavorItemUniqueTags: string[];
  FavorItemTags: string[];
  PotentialMaterial: number;
  SkillExMaterial: number[][];
  SkillMaterial: number[][];
  SkillExMaterialAmount: number[][];
  SkillMaterialAmount: number[][];
}

export interface ModalProps extends StudentProps {
  Materials: ResourceProps[];
  Equipments: ResourceProps[];
}

export interface FetchedData {
  students: Record<string, StudentProps>;
  items: Record<string, ResourceProps>;
  equipment: Record<string, ResourceProps>;
}