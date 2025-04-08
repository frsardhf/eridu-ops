import { GiftDataProps, BoxDataProps } from "./gift";
import { ResourceProps } from "./resource";

export interface StudentProps {
  Id: number;
  Name: string;
  DefaultOrder: number;
  Gifts: GiftDataProps[];
  Boxes: BoxDataProps[];
  Materials: ResourceProps[];
  Equipments: ResourceProps[];
  FavorItemUniqueTags: string[];
  FavorItemTags: string[];
  PotentialMaterial: number;
  SkillExMaterial: number[][];
  SkillMaterial: number[][];
  SkillExMaterialAmount: number[][];
  SkillMaterialAmount: number[][];
}