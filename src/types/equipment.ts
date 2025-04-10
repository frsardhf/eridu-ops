// Define equipment types
export type EquipmentType = 'Hat' | 'Gloves' | 'Shoes' | 'Bag' | 'Badge' | 
  'Hairpin' | 'Charm' | 'Watch' | 'Necklace';

export interface EquipmentMaterial {
  material: Record<string, any> | null;
  credits?: Record<string, any> | null;
  materialQuantity: number;
  creditsQuantity?: number;
  equipmentType: EquipmentType;
}

export interface EquipmentLevel {
  current: number;
  target: number;
}

export type EquipmentLevels = {
  [key in EquipmentType]?: EquipmentLevel;
};

export interface EquipmentSettings {
  current: number;
  target: number;
  icon: string;
  name: string;
}