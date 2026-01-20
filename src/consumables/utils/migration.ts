// migration.ts - localStorage to IndexedDB migration utilities

import { db } from '../db/database';
import type {
  StudentRecord,
  ItemRecord,
  EquipmentRecord,
  FormRecord,
  ResourceInventoryRecord,
  EquipmentInventoryRecord
} from '../db/database';
import {
  isMigrationCompleted,
  setMetadata,
  getAllStudents,
  getAllItems,
  getAllEquipment,
  getAllFormData
} from '../services/dbService';
import { saveSettings, getSettings, type AppSettings } from './settingsStorage';

// Legacy localStorage keys
const LEGACY_KEYS = [
  'students',
  'resources',
  'equipments',
  'forms',
  'materials',
  'gears',
  'pinned-students',
  'theme',
  'sort-option',
  'sort-direction',
  'language',
  'forms_migration_version'
];

/**
 * Main migration function - migrates data from localStorage to IndexedDB
 * This runs once and marks itself as completed in IndexedDB metadata
 */
export async function migrateFromLocalStorageToIndexedDB(): Promise<boolean> {
  try {
    // Check if migration already completed
    const completed = await isMigrationCompleted();
    if (completed) {
      console.log('Migration already completed, skipping...');
      return true;
    }

    console.log('Starting migration from localStorage to IndexedDB...');

    // Check if there's any legacy data to migrate
    const hasLegacyData = LEGACY_KEYS.some(key => localStorage.getItem(key) !== null);

    if (!hasLegacyData) {
      console.log('No legacy data found, marking as fresh install...');
      await markMigrationComplete(true); // Mark as completed, will fetch from API
      return true;
    }

    // Migrate students data
    await migrateStudents();

    // Migrate items (resources) inventory
    await migrateResourceInventories();

    // Migrate equipment inventory
    await migrateEquipmentInventories();

    // Migrate forms (user progression)
    await migrateForms();

    // Consolidate settings
    consolidateSettings();

    // Mark migration as complete with metadata
    // Set dataSource='migration' and lastFetched=0 to force immediate refresh
    await setMetadata('schemaVersion', 1);
    await setMetadata('migrationCompleted', true);
    await setMetadata('dataSource', 'migration');
    await setMetadata('lastFetched', 0);

    console.log('Migration completed successfully');

    // Clean up legacy localStorage keys
    cleanupLegacyStorage();

    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

/**
 * Mark migration as complete for fresh installs
 */
async function markMigrationComplete(isFreshInstall: boolean): Promise<void> {
  await setMetadata('schemaVersion', 1);
  await setMetadata('migrationCompleted', true);

  if (isFreshInstall) {
    // Fresh install - will fetch from API
    await setMetadata('dataSource', 'api');
    await setMetadata('lastFetched', 0); // Force initial fetch
  }
}

/**
 * Migrate students data from localStorage to IndexedDB
 */
async function migrateStudents(): Promise<void> {
  try {
    const studentsJson = localStorage.getItem('students');
    if (!studentsJson) {
      console.log('No students data to migrate');
      return;
    }

    const studentsData = JSON.parse(studentsJson);
    const studentsArray: StudentRecord[] = Object.values(studentsData);

    if (studentsArray.length > 0) {
      await db.students.bulkPut(studentsArray);
      console.log(`Migrated ${studentsArray.length} students`);
    }
  } catch (error) {
    console.error('Error migrating students:', error);
  }
}

/**
 * Migrate resource inventories from localStorage to IndexedDB
 */
async function migrateResourceInventories(): Promise<void> {
  try {
    const resourcesJson = localStorage.getItem('resources');
    if (!resourcesJson) {
      console.log('No resources data to migrate');
      return;
    }

    const resourcesData = JSON.parse(resourcesJson);
    const inventories: ResourceInventoryRecord[] = Object.entries(resourcesData).map(
      ([id, data]: [string, any]) => ({
        id: Number(id),
        QuantityOwned: data.QuantityOwned || 0
      })
    );

    if (inventories.length > 0) {
      await db.resources.bulkPut(inventories);
      console.log(`Migrated ${inventories.length} resource inventories`);

      // Also save full item data to items table
      const items: ItemRecord[] = Object.values(resourcesData);
      await db.items.bulkPut(items);
      console.log(`Migrated ${items.length} items`);
    }
  } catch (error) {
    console.error('Error migrating resources:', error);
  }
}

/**
 * Migrate equipment inventories from localStorage to IndexedDB
 */
async function migrateEquipmentInventories(): Promise<void> {
  try {
    const equipmentsJson = localStorage.getItem('equipments');
    if (!equipmentsJson) {
      console.log('No equipments data to migrate');
      return;
    }

    const equipmentsData = JSON.parse(equipmentsJson);
    const inventories: EquipmentInventoryRecord[] = Object.entries(equipmentsData).map(
      ([id, data]: [string, any]) => ({
        id: Number(id),
        QuantityOwned: data.QuantityOwned || 0
      })
    );

    if (inventories.length > 0) {
      await db.equipments_inventory.bulkPut(inventories);
      console.log(`Migrated ${inventories.length} equipment inventories`);

      // Also save full equipment data to equipment table
      const equipment: EquipmentRecord[] = Object.values(equipmentsData);
      await db.equipment.bulkPut(equipment);
      console.log(`Migrated ${equipment.length} equipment items`);
    }
  } catch (error) {
    console.error('Error migrating equipments:', error);
  }
}

/**
 * Migrate forms (user progression) from localStorage to IndexedDB
 */
async function migrateForms(): Promise<void> {
  try {
    const formsJson = localStorage.getItem('forms');
    if (!formsJson) {
      console.log('No forms data to migrate');
      return;
    }

    const formsData = JSON.parse(formsJson);
    const formsArray: FormRecord[] = Object.entries(formsData).map(
      ([studentId, data]: [string, any]) => ({
        studentId: Number(studentId),
        ...data
      })
    );

    if (formsArray.length > 0) {
      await db.forms.bulkPut(formsArray);
      console.log(`Migrated ${formsArray.length} student forms`);
    }
  } catch (error) {
    console.error('Error migrating forms:', error);
  }
}

/**
 * Consolidate scattered localStorage settings into single settings object
 */
function consolidateSettings(): void {
  try {
    // Check if settings already exist (avoid overwriting)
    const existingSettings = getSettings();

    // Only migrate if settings don't exist or are defaults
    const hasCustomSettings = JSON.stringify(existingSettings) !== JSON.stringify({
      theme: 'dark',
      language: 'en',
      sort: { option: 'id', direction: 'asc' },
      pinnedStudents: []
    });

    if (hasCustomSettings) {
      console.log('Settings already exist, skipping consolidation');
      return;
    }

    // Gather legacy settings
    const theme = localStorage.getItem('theme') || 'dark';
    const language = localStorage.getItem('language') || 'en';
    const sortOption = localStorage.getItem('sort-option') || 'id';
    const sortDirection = localStorage.getItem('sort-direction') || 'asc';
    const pinnedStudentsJson = localStorage.getItem('pinned-students');
    const pinnedStudents = pinnedStudentsJson ? JSON.parse(pinnedStudentsJson) : [];

    const consolidatedSettings: AppSettings = {
      theme: theme as 'dark' | 'light',
      language: language as 'en' | 'jp',
      sort: {
        option: sortOption as any,
        direction: sortDirection as any
      },
      pinnedStudents
    };

    saveSettings(consolidatedSettings);
    console.log('Settings consolidated successfully');
  } catch (error) {
    console.error('Error consolidating settings:', error);
  }
}

/**
 * Remove legacy localStorage keys after successful migration
 */
function cleanupLegacyStorage(): void {
  try {
    console.log('Cleaning up legacy localStorage keys...');

    LEGACY_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('Legacy localStorage cleaned up');
  } catch (error) {
    console.error('Error cleaning up legacy storage:', error);
  }
}

/**
 * Export all data from IndexedDB (for backup/transfer)
 */
export async function exportAllData(): Promise<{
  version: string;
  timestamp: number;
  settings: AppSettings;
  data: {
    students: StudentRecord[];
    items: ItemRecord[];
    equipment: EquipmentRecord[];
    forms: FormRecord[];
    resources: ResourceInventoryRecord[];
    equipments: EquipmentInventoryRecord[];
  };
}> {
  const [students, items, equipment, forms, resources, equipments] = await Promise.all([
    db.students.toArray(),
    db.items.toArray(),
    db.equipment.toArray(),
    db.forms.toArray(),
    db.resources.toArray(),
    db.equipments_inventory.toArray()
  ]);

  const settings = getSettings();

  return {
    version: '2.0',
    timestamp: Date.now(),
    settings,
    data: {
      students,
      items,
      equipment,
      forms,
      resources,
      equipments
    }
  };
}

/**
 * Triggers download of all data as a JSON file
 */
export async function downloadExportData(): Promise<void> {
  try {
    const exportData = await exportAllData();
    const exportString = JSON.stringify(exportData, null, 2);

    const blob = new Blob([exportString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `eridu-ops-export-${timestamp}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 100);

    console.log('Export downloaded successfully');
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
}

/**
 * Import data from exported JSON file
 */
export async function importData(fileContent: string): Promise<boolean> {
  try {
    const importData = JSON.parse(fileContent);

    // Validate format
    if (!importData.version || !importData.data) {
      throw new Error('Invalid import data format');
    }

    // Import data
    const { students, items, equipment, forms, resources, equipments } = importData.data;

    await Promise.all([
      students && db.students.bulkPut(students),
      items && db.items.bulkPut(items),
      equipment && db.equipment.bulkPut(equipment),
      forms && db.forms.bulkPut(forms),
      resources && db.resources.bulkPut(resources),
      equipments && db.equipments_inventory.bulkPut(equipments)
    ]);

    // Import settings if present
    if (importData.settings) {
      saveSettings(importData.settings);
    }

    // Update metadata
    await setMetadata('lastFetched', Date.now());
    await setMetadata('dataSource', 'api');

    console.log('Import completed successfully');
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

/**
 * Import data from file
 */
export function importDataFromFile(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string;
        const success = await importData(fileContent);
        resolve(success);
      } catch (error) {
        console.error('Error reading import file:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      reject(error);
    };

    reader.readAsText(file);
  });
}
