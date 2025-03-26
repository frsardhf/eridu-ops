import { GiftDataProps, BoxDataProps } from "./gift";
import { ResourceProps } from "./resource";

export interface StudentProps {
  Id: number;
  Name: string;
  Gifts: GiftDataProps[];
  Boxes: BoxDataProps[];
  Materials: ResourceProps[];
}