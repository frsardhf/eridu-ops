// Define equipment types
export type EquipmentType = 'Hat' | 'Gloves' | 'Shoes' | 'Bag' | 'Badge' | 
  'Hairpin' | 'Charm' | 'Watch' | 'Necklace';

export interface EquipmentItem {
  Id: number;
  Category: string;
  Tier: number;
  MaxLevel: number;
  Recipe: number[][];
}

export interface EquipmentMaterial {
  material: Record<string, any> | null;
  materialQuantity: number;
  equipmentType: EquipmentType;
}

export interface EquipmentLevel {
  current: number;
  target: number;
}

export interface GradeLevels {
  current?: number;
  target?: number;
}

export type EquipmentLevels = {
  [key in EquipmentType]?: EquipmentLevel;
};

export interface GradeInfos {
  owned?: number;
  price?: number;
  purchasable?: number;
}

export interface EquipmentSettings {
  current: number;
  target: number;
  icon: string;
  name: string;
}