// database.ts - Dexie IndexedDB schema definition

import Dexie, { Table } from 'dexie';
import type { StudentProps } from '../../types/student';
import type { ResourceProps } from '../../types/resource';

// Database interfaces
export interface StudentRecord extends StudentProps {
  Id: number; // Primary key
}

export interface ItemRecord extends ResourceProps {
  Id: number; // Primary key
}

export interface EquipmentRecord extends ResourceProps {
  Id: number; // Primary key
}

export interface MetadataRecord {
  key: string; // Primary key
  value: any;
}

export interface FormRecord {
  studentId: number; // Primary key
  bondDetailData?: {
    currentBond: number;
  };
  characterLevels?: {
    current: number;
    target: number;
  };
  skillLevels?: {
    Ex: { current: number; target: number };
    Public: { current: number; target: number };
    Passive: { current: number; target: number };
    ExtraPassive: { current: number; target: number };
  };
  potentialLevels?: {
    attack: { current: number; target: number };
    maxhp: { current: number; target: number };
    healpower: { current: number; target: number };
  };
  equipmentLevels?: Record<string, { current: number; target: number }>;
  gradeLevels?: {
    current: number;
    target: number;
  };
  gradeInfos?: {
    owned: number;
    price: number;
    purchasable: number;
  };
  giftFormData?: Record<string, number>;
  boxFormData?: Record<string, number>;
}

export interface ResourceInventoryRecord {
  id: number; // Primary key
  QuantityOwned: number;
}

export interface EquipmentInventoryRecord {
  id: number; // Primary key
  QuantityOwned: number;
}

// Define the database class
export class EriduOpsDatabase extends Dexie {
  // Declare tables
  students!: Table<StudentRecord, number>;
  items!: Table<ItemRecord, number>;
  equipment!: Table<EquipmentRecord, number>;
  metadata!: Table<MetadataRecord, string>;
  forms!: Table<FormRecord, number>;
  resources!: Table<ResourceInventoryRecord, number>;
  equipments_inventory!: Table<EquipmentInventoryRecord, number>;

  constructor() {
    super('eridu-ops-db');

    // Define schema version 1
    this.version(1).stores({
      students: 'Id, Name, DefaultOrder, StarGrade',
      items: 'Id, Name, Category, Rarity',
      equipment: 'Id, Name, Category, Tier',
      metadata: 'key',
      forms: 'studentId',
      resources: 'id',
      equipments_inventory: 'id'
    });
  }
}

// Export singleton instance
export const db = new EriduOpsDatabase();

// Helper function to convert array to record keyed by Id
export function arrayToRecord<T extends { Id: number }>(
  array: T[]
): Record<number, T> {
  return array.reduce((acc, item) => {
    acc[item.Id] = item;
    return acc;
  }, {} as Record<number, T>);
}

// Helper function to check if database is accessible
export async function isDatabaseAccessible(): Promise<boolean> {
  try {
    await db.open();
    return true;
  } catch (error) {
    console.error('Database is not accessible:', error);
    return false;
  }
}
