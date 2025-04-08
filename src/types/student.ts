import { GiftDataProps, BoxDataProps } from "./gift";
import { ResourceProps } from "./resource";

export interface StudentProps {
  Id: number;
  Name: string;
  DefaultOrder: number;
  Gifts: GiftDataProps[];
  Boxes: BoxDataProps[];
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