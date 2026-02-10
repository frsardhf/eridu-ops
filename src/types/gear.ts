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

export interface ExclusiveGearLevel {
  current?: number;  // 0 = locked, 1 = T1, 2 = T2
  target?: number;
}

export interface StudentGear {
  Released: number[];        // [0] = JP release, [1] = Global release
  StatType: string[];        // e.g., ["AttackPower", "MaxHP"]
  StatValue: number[][];     // Stats per tier [[T1 values], [T2 values]]
  TierUpMaterial: number[];  // [giftId, itemId1, itemId2]
  TierUpMaterialAmount: number[]; // [giftQty, itemQty1, itemQty2]
  Name: string;              // Gear name
  Desc: string;              // Gear description
  Icon: string;              // Icon name
}