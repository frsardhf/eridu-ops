import { GiftDataProps, BoxDataProps, BondFormDataProps } from "./gift";
import { ResourceProps } from "./resource";

export interface StudentProps {
  Id: number;
  Name: string;
  Gifts: GiftDataProps[];
  Boxes: BoxDataProps[];
  Materials: ResourceProps[];
  BondFormData: BondFormDataProps;
}