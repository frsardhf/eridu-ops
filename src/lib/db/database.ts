// database.ts - Dexie IndexedDB schema definition

import Dexie, { Table } from 'dexie';
import type { StudentProps } from '../../types/student';
import type { ResourceProps } from '../../types/resource';
import type {
  EquipmentLevels,
  GradeLevels,
  GradeInfos,
  ExclusiveGearLevel,
} from '../../types/gear';
import type { CharacterLevels, SkillLevels, PotentialLevels } from '../../types/upgrade';

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

interface MetadataRecord {
  key: string; // Primary key
  value: unknown;
}

export interface FormRecord {
  studentId: number; // Primary key
  bondDetailData?: {
    currentBond: number;
  };
  characterLevels?: CharacterLevels;
  skillLevels?: SkillLevels;
  potentialLevels?: PotentialLevels;
  equipmentLevels?: EquipmentLevels;
  gradeLevels?: GradeLevels;
  gradeInfos?: GradeInfos;
  giftFormData?: Record<string, number>;
  boxFormData?: Record<string, number>;
  nonFavorGiftsMap?: Record<string, number>;
  otherExpData?: {
    cafeTapsPerDay: number;
    cafeStartDateIso: string;
    cafeTargetDateIso: string;
    cafeDateInclusive: boolean;
    bonusExp: number;
  };
  exclusiveGearLevel?: ExclusiveGearLevel;
  isOwned?: boolean;
}

export interface ItemsInventoryRecord {
  Id: number; // Primary key
  QuantityOwned: number;
}

export interface EquipmentInventoryRecord {
  Id: number; // Primary key
  QuantityOwned: number;
}

export interface DeckTeam {
  units: (number | null)[];
}

export interface DeckRecord {
  id: number; // Primary key (1–5)
  name: string;
  teams: DeckTeam[];
  updatedAt: number;
}

// Define the database class (only the `db` singleton below is exported)
class EriduOpsDatabase extends Dexie {
  // Declare tables
  students!: Table<StudentRecord, number>;
  items!: Table<ItemRecord, number>;
  equipment!: Table<EquipmentRecord, number>;
  metadata!: Table<MetadataRecord, string>;
  forms!: Table<FormRecord, number>;
  items_inventory!: Table<ItemsInventoryRecord, number>;
  equipment_inventory!: Table<EquipmentInventoryRecord, number>;
  decks!: Table<DeckRecord, number>;

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
      equipments_inventory: 'id',
    });

    // Version 2: Rename stores and fix primary key casing
    this.version(2)
      .stores({
        items_inventory: 'Id',
        equipment_inventory: 'Id',
        resources: null,
        equipments_inventory: null,
      })
      .upgrade(async (tx) => {
        // Migrate resources -> items_inventory with id -> Id transform
        const resourceRows = await tx.table('resources').toArray();
        if (resourceRows.length > 0) {
          await tx.table('items_inventory').bulkAdd(
            resourceRows.map((row: { id: number; QuantityOwned?: number }) => ({
              Id: row.id,
              QuantityOwned: row.QuantityOwned,
            })),
          );
        }

        // Migrate equipments_inventory -> equipment_inventory with id -> Id transform
        const equipmentRows = await tx.table('equipments_inventory').toArray();
        if (equipmentRows.length > 0) {
          await tx.table('equipment_inventory').bulkAdd(
            equipmentRows.map((row: { id: number; QuantityOwned?: number }) => ({
              Id: row.id,
              QuantityOwned: row.QuantityOwned,
            })),
          );
        }

        // Clean ghost 'id' property from forms records
        const formRows = await tx.table('forms').toArray();
        const dirtyForms = formRows.filter((row: Record<string, unknown>) => 'id' in row);
        if (dirtyForms.length > 0) {
          const cleaned = dirtyForms.map((row: Record<string, unknown>) => {
            const { id, ...rest } = row;
            return rest;
          });
          await tx.table('forms').bulkPut(cleaned);
        }
      });

    // Version 3: Add decks table
    this.version(3).stores({
      decks: 'id, updatedAt',
    });
  }
}

// Export singleton instance
export const db = new EriduOpsDatabase();

// Helper function to convert array to record keyed by Id
export function arrayToRecord<T extends { Id: number }>(array: T[]): Record<number, T> {
  return array.reduce(
    (acc, item) => {
      acc[item.Id] = item;
      return acc;
    },
    {} as Record<number, T>,
  );
}
