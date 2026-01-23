// storageUtils.ts - Now using IndexedDB via dbService

import { ResourceProps } from "../../types/resource";
import {
  getFormData as dbGetFormData,
  saveFormData as dbSaveFormData,
  getAllResourceInventories,
  getAllEquipmentInventories,
  setResourceInventory,
  setEquipmentInventory,
  saveResourceInventories,
  saveEquipmentInventories,
  getAllItemsAsRecord,
  getAllEquipmentAsRecord,
  getAllStudents,
  getAllItems,
  getAllEquipment,
  getAllFormData,
  getMetadata,
  setMetadata,
  getAllStudentsAsRecord
} from '../services/dbService';
import type { ResourceInventoryRecord, EquipmentInventoryRecord } from '../db/database';
import { getSettings, saveSettings } from './settingsStorage';
import { db } from '../db/database';

/**
 * Saves student-specific form data to IndexedDB
 * @param studentId The ID of the student
 * @param data The data to save
 * @returns Promise<boolean> indicating success or failure
 */
export async function saveFormData(studentId: string | number, data: Record<string, any>): Promise<any | null> {
  if (!studentId) return null;

  try {
    const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
    return await dbSaveFormData(numericId, data);
  } catch (error) {
    console.error('Error saving form data to IndexedDB:', error);
    return null;
  }
}


/**
 * Retrieves resources data with inventory from IndexedDB
 * @returns Promise<Record> The resources data with QuantityOwned
 */
export async function getResources(): Promise<Record<string, any> | null> {
  try {
    const [items, inventories] = await Promise.all([
      getAllItemsAsRecord(),
      getAllResourceInventories()
    ]);

    // Merge item data with inventory quantities
    const result: Record<string, any> = {};
    for (const [id, item] of Object.entries(items)) {
      result[id] = {
        ...item,
        QuantityOwned: inventories[Number(id)] || 0
      };
    }

    return result;
  } catch (error) {
    console.error('Error retrieving resources from IndexedDB:', error);
    return null;
  }
}

/**
 * Retrieves equipment data with inventory from IndexedDB
 * @returns Promise<Record> The equipment data with QuantityOwned
 */
export async function getEquipments(): Promise<Record<string, any> | null> {
  try {
    const [equipment, inventories] = await Promise.all([
      getAllEquipmentAsRecord(),
      getAllEquipmentInventories()
    ]);

    // Merge equipment data with inventory quantities
    const result: Record<string, any> = {};
    for (const [id, item] of Object.entries(equipment)) {
      result[id] = {
        ...item,
        QuantityOwned: inventories[Number(id)] || 0
      };
    }

    return result;
  } catch (error) {
    console.error('Error retrieving equipment from IndexedDB:', error);
    return null;
  }
}

/**
 * Retrieves a single student's form data from IndexedDB
 * @param studentId The ID of the student
 * @returns Promise<Record> The student form data or null if not found
 */
export async function getFormData(studentId: string | number): Promise<Record<string, any> | null> {
  if (!studentId) return null;

  try {
    const numericId = typeof studentId === 'string' ? parseInt(studentId) : studentId;
    const formData = await dbGetFormData(numericId);
    return formData || null;
  } catch (error) {
    console.error('Error retrieving form data from IndexedDB:', error);
    return null;
  }
}

/**
 * Loads stored values into reactive refs for a student with proper deep merging
 * @param studentId The ID of the student
 * @param refs Object containing reactive refs to update with keys matching storage keys
 * @param defaultValues Default values to use if stored values don't exist
 * @returns Promise<boolean> indicating if data was successfully loaded
 */
export async function loadFormDataToRefs(
  studentId: string | number,
  refs: Record<string, { value: unknown }>,
  defaultValues: Record<string, unknown> = {}
): Promise<boolean> {
  if (!studentId) return false;

  try {
    const studentData = await getFormData(studentId);
    if (!studentData) return false;

    for (const key of Object.keys(refs)) {
      let mergedValue: unknown;

      if (key in studentData) {
        const storedValue = studentData[key];
        const defaultValue = defaultValues[key];

        if (
          typeof defaultValue === 'object' &&
          defaultValue !== null &&
          !Array.isArray(defaultValue) &&
          typeof storedValue === 'object' &&
          storedValue !== null
        ) {
          // Deep merge objects
          const base = { ...(defaultValue as Record<string, unknown>) };

          for (const nestedKey of Object.keys(base)) {
            if (nestedKey in (storedValue as Record<string, unknown>)) {
              const baseVal = base[nestedKey];
              const storedVal = (storedValue as Record<string, unknown>)[nestedKey];

              if (
                typeof baseVal === 'object' &&
                baseVal !== null &&
                typeof storedVal === 'object' &&
                storedVal !== null
              ) {
                base[nestedKey] = {
                  ...(baseVal as Record<string, unknown>),
                  ...(storedVal as Record<string, unknown>)
                };
              } else {
                base[nestedKey] = storedVal;
              }
            }
          }

          // Include extra keys from stored value
          for (const storedKey of Object.keys(storedValue as Record<string, unknown>)) {
            if (!(storedKey in base)) {
              base[storedKey] = (storedValue as Record<string, unknown>)[storedKey];
            }
          }

          mergedValue = base;
        } else {
          // Primitives / arrays
          mergedValue = storedValue;
        }
      } else if (key in defaultValues) {
        mergedValue = structuredClone(defaultValues[key]);
      }

      if (mergedValue !== undefined) {
        refs[key].value = mergedValue;
      }
    }

    return true;
  } catch (error) {
    console.error('Error loading form data to refs:', error);
    return false;
  }
}


/**
 * Saves resources inventory to IndexedDB
 * @param resources The resources data with QuantityOwned, or a function to transform existing resources
 * @returns Promise<boolean> indicating success or failure
 */
export async function saveResources(
  resources: Record<string, any> | ((existing: Record<string, any>) => Record<string, any>)
): Promise<boolean> {
  try {
    let resourcesData: Record<string, any>;

    // If resources is a function, apply it to existing resources
    if (typeof resources === 'function') {
      const existingResources = await getResources() || {};
      resourcesData = resources(existingResources);
    } else {
      resourcesData = resources;
    }

    // Extract inventory records (only QuantityOwned)
    const inventories: ResourceInventoryRecord[] = Object.entries(resourcesData).map(
      ([id, data]: [string, any]) => ({
        id: Number(id),
        QuantityOwned: data.QuantityOwned || 0
      })
    );

    return await saveResourceInventories(inventories);
  } catch (error) {
    console.error('Error saving resources to IndexedDB:', error);
    return false;
  }
}

/**
 * Saves resources inventory from student materials
 * @param student The student object containing materials
 * @param resourceFormData The form data with updated quantities
 * @returns Promise<boolean> indicating success or failure
 */
export async function saveResourcesFromStudent(
  student: { Materials?: Record<string, any> },
  resourceFormData: { value: Record<string, number> }
): Promise<boolean> {
  try {
    if (!student?.Materials) return false;

    const inventories: ResourceInventoryRecord[] = Object.values(student.Materials).map((material: any) => ({
      id: material.Id,
      QuantityOwned: resourceFormData.value[material.Id] || 0
    }));

    return await saveResourceInventories(inventories);
  } catch (error) {
    console.error('Error processing and saving resources to IndexedDB:', error);
    return false;
  }
}

/**
 * Saves equipment inventory to IndexedDB
 * @param equipments The equipment data with QuantityOwned, or a function to transform existing equipments
 * @returns Promise<boolean> indicating success or failure
 */
export async function saveEquipments(
  equipments: Record<string, any> | ((existing: Record<string, any>) => Record<string, any>)
): Promise<boolean> {
  try {
    let equipmentsData: Record<string, any>;

    // If equipments is a function, apply it to existing equipments
    if (typeof equipments === 'function') {
      const existingEquipments = await getEquipments() || {};
      equipmentsData = equipments(existingEquipments);
    } else {
      equipmentsData = equipments;
    }

    // Extract inventory records (only QuantityOwned)
    const inventories: EquipmentInventoryRecord[] = Object.entries(equipmentsData).map(
      ([id, data]: [string, any]) => ({
        id: Number(id),
        QuantityOwned: data.QuantityOwned || 0
      })
    );

    return await saveEquipmentInventories(inventories);
  } catch (error) {
    console.error('Error saving equipments to IndexedDB:', error);
    return false;
  }
}

/**
 * Saves equipment inventory from student equipment
 * @param student The student object containing equipment
 * @param equipmentFormData The form data with updated quantities
 * @returns Promise<boolean> indicating success or failure
 */
export async function saveEquipmentsFromStudent(
  student: { Equipments?: Record<string, any> },
  equipmentFormData: { value: Record<string, number> }
): Promise<boolean> {
  try {
    if (!student?.Equipments) return false;

    const inventories: EquipmentInventoryRecord[] = Object.values(student.Equipments).map((equipment: any) => ({
      id: equipment.Id,
      QuantityOwned: equipmentFormData.value[equipment.Id] || 0
    }));

    return await saveEquipmentInventories(inventories);
  } catch (error) {
    console.error('Error processing and saving equipment to IndexedDB:', error);
    return false;
  }
}

export { togglePinnedStudent } from './settingsStorage';
export { isStudentPinned } from './settingsStorage';
export { getPinnedStudents } from './settingsStorage';

export async function getResourceDataById(id: string | number): Promise<Record<string, any> | null> {
  const resources = await getResources();
  return resources?.[id] ?? null;
}

export async function getEquipmentDataById(id: string | number): Promise<Record<string, any> | null> {
  const equipment = await getEquipments();
  return equipment?.[id] ?? null;
}

/**
 * Exports all IndexedDB data and settings to a downloadable JSON file
 * @returns Promise resolving to a Blob URL to download the exported data
 */
export async function exportLocalStorageData(): Promise<string> {
  try {
    // Export ONLY user data (v3.0 format)
    const [forms, resources, equipments] = await Promise.all([
      getAllFormData(),              // User progression
      getAllResourceInventories(),   // Resource quantities
      getAllEquipmentInventories()   // Equipment quantities
    ]);

    console.log('Export - Forms count:', Object.keys(forms).length);
    console.log('Export - Resources count:', Object.keys(resources).length);
    console.log('Export - Equipments count:', Object.keys(equipments).length);

    const settings = getSettings();

    const exportData = {
      version: '3.0',
      timestamp: Date.now(),
      settings,
      userData: {
        forms,
        resources,
        equipments
      }
    };

    console.log('Export - userData structure:', {
      formsKeys: Object.keys(exportData.userData.forms).length,
      resourcesKeys: Object.keys(exportData.userData.resources).length,
      equipmentsKeys: Object.keys(exportData.userData.equipments).length
    });

    // Create a JSON string of the data
    const exportString = JSON.stringify(exportData, null, 2);
    console.log('Export - JSON string length:', exportString.length);

    // Create a blob and return its URL
    const blob = new Blob([exportString], { type: 'application/json' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error exporting data:', error);
    return '';
  }
}

/**
 * Triggers download of IndexedDB data as a JSON file
 */
export async function downloadLocalStorageData(): Promise<void> {
  const url = await exportLocalStorageData();
  if (!url) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `eridu-ops-export-${timestamp}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Import v3.0 user-data-only format
 * @param importData The parsed v3.0 import data
 */
async function importV3Format(importData: any): Promise<void> {
  const { userData, settings } = importData;

  console.log('Importing v3.0 user data...');
  console.log('Forms:', userData.forms ? Object.keys(userData.forms).length : 0);
  console.log('Resources:', userData.resources ? Object.keys(userData.resources).length : 0);
  console.log('Equipments:', userData.equipments ? Object.keys(userData.equipments).length : 0);

  // Clear existing user data to prevent stale overlays
  await Promise.all([
    db.forms.clear(),
    db.resources.clear(),
    db.equipments_inventory.clear()
  ]);
  console.log('Cleared existing user data');

  // Convert forms from Record to Array
  let formsArray: any[] = [];
  if (userData.forms) {
    if (Array.isArray(userData.forms)) {
      formsArray = userData.forms;
    } else if (typeof userData.forms === 'object') {
      formsArray = Object.entries(userData.forms).map(([studentId, formData]) => ({
        studentId: Number(studentId),
        ...(formData as any)
      }));
    }
    console.log('Forms array to import:', formsArray.length, 'records');
  }

  // Import user data into IndexedDB
  await Promise.all([
    formsArray.length > 0 ? db.forms.bulkPut(formsArray) : Promise.resolve(),
    userData.resources ? db.resources.bulkPut(
      Object.entries(userData.resources).map(([id, quantity]) => ({
        id: Number(id),
        QuantityOwned: quantity as number
      }))
    ) : Promise.resolve(),
    userData.equipments ? db.equipments_inventory.bulkPut(
      Object.entries(userData.equipments).map(([id, quantity]) => ({
        id: Number(id),
        QuantityOwned: quantity as number
      }))
    ) : Promise.resolve()
  ]);

  console.log('Import completed, verifying forms...');
  const importedForms = await db.forms.toArray();
  console.log('Forms in database after import:', importedForms.length);

  // Merge settings with existing ones to preserve new/default keys
  if (settings) {
    saveSettings({
      ...getSettings(),
      ...settings
    });
  }
}

/**
 * Imports data from other sites format into IndexedDB
 * @param importText The text data to import
 * @returns Promise resolving to boolean indicating success
 */
export async function importFromOtherSite(importText: string): Promise<boolean> {
  try {
    const importData = JSON.parse(importText);

    if (!importData.characters || !Array.isArray(importData.characters)) {
      throw new Error('Invalid import data format: missing characters array');
    }

    // Get existing forms data and student data from IndexedDB
    const [existingForms, students] = await Promise.all([
      getAllFormData(),
      getAllStudentsAsRecord()
    ]);

    // Process each character
    const formDataArray: any[] = [];
    importData.characters.forEach((char: any) => {
      if (!char.id) return;

      // Get equipment data from student data
      const studentData = students[char.id];
      const equipmentTypes = studentData?.Equipment ?? ['gear1', 'gear2', 'gear3'];
      const starData = studentData?.StarGrade ?? 1;

      const formData = {
        studentId: char.id,
        bondDetailData: {
          currentBond: parseInt(char.current.bond) || 1
        },
        boxFormData: {},
        characterLevels: {
          current: parseInt(char.current.level) || 1,
          target: parseInt(char.target.level) || 1
        },
        equipmentLevels: {
          [equipmentTypes[0]]: {
            current: parseInt(char.current.gear1) || 1,
            target: parseInt(char.target.gear1) || 1
          },
          [equipmentTypes[1]]: {
            current: parseInt(char.current.gear2) || 1,
            target: parseInt(char.target.gear2) || 1
          },
          [equipmentTypes[2]]: {
            current: parseInt(char.current.gear3) || 1,
            target: parseInt(char.target.gear3) || 1
          }
        },
        giftFormData: {},
        gradeLevels: {
          current: (parseInt(char.current.star) || starData) + (parseInt(char.current.ue) || 0),
          target: (parseInt(char.target.star) || starData) + (parseInt(char.target.ue) || 0)
        },
        potentialLevels: {
          attack: { current: 0, target: 0 },
          maxhp: { current: 0, target: 0 },
          healpower: { current: 0, target: 0 }
        },
        skillLevels: {
          Ex: {
            current: parseInt(char.current.ex) || 0,
            target: parseInt(char.target.ex) || 0
          },
          Public: {
            current: parseInt(char.current.basic) || 0,
            target: parseInt(char.target.basic) || 0
          },
          Passive: {
            current: parseInt(char.current.passive) || 0,
            target: parseInt(char.target.passive) || 0
          },
          ExtraPassive: {
            current: parseInt(char.current.sub) || 0,
            target: parseInt(char.target.sub) || 0
          }
        },
        gradeInfos: {
          owned: parseInt(char.eleph.owned) || 0,
          price: parseInt(char.eleph.cost) || 1,
          purchasable: parseInt(char.eleph.purchasable) || 20
        }
      };

      // Merge with existing data
      const merged = {
        ...(existingForms[char.id] ?? {}),
        ...formData
      };
      formDataArray.push(merged);
    });

    // Save all form data to IndexedDB
    await db.forms.bulkPut(formDataArray);
    return true;
  } catch (error) {
    console.error('Error importing data from other site:', error);
    return false;
  }
}

/**
 * Imports data from a JSON file into IndexedDB
 * @param file The file to import data from
 * @returns Promise resolving to boolean indicating success
 */
export function importLocalStorageData(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string;
        const importData = JSON.parse(fileContent);

        if (typeof importData !== 'object' || importData === null) {
          reject(new Error('Invalid import data format'));
          return;
        }

        // PRIORITY 1: Check for SchaleDB format (KEEP)
        if (importData.characters && Array.isArray(importData.characters)) {
          const success = await importFromOtherSite(fileContent);
          resolve(success);
          return;
        }

        // PRIORITY 2: Check for v3.0 format (NEW)
        if (importData.version === '3.0' && importData.userData) {
          await importV3Format(importData);
          resolve(true);
          return;
        }

        // REMOVED: v2.0 format support (breaking change)
        if (importData.version === '2.0') {
          reject(new Error('Old format detected (v2.0). Please export your data again using the latest version.'));
          return;
        }

        // REMOVED: Legacy localStorage dump format (breaking change)
        if (importData.forms || importData.resources || importData.theme || importData.language) {
          reject(new Error('Old format detected. Please export your data again using the latest version.'));
          return;
        }

        reject(new Error('Unrecognized import format. Please use a valid export file.'));
      } catch (error) {
        console.error('Error importing data:', error);
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