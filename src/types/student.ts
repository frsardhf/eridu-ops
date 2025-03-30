import { GiftDataProps, BoxDataProps, BondFormDataProps } from "./gift";
import { ResourceProps } from "./resource";

export interface StudentProps {
  Id: number;
  Name: string;
  Gifts: GiftDataProps[];
  Boxes: BoxDataProps[];
  Materials: ResourceProps[];
  FavorItemUniqueTags: string[];
  FavorItemTags: string[];
  PotentialMaterial: number;
}