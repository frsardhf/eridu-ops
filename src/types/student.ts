import { GiftDataProps, BoxDataProps } from "./gift";

export interface StudentProps {
  Id: number;
  Name: string;
  Gifts: GiftDataProps[];
  Boxes: BoxDataProps[];
}