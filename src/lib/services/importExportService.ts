// importExportService.ts - Full-account data export/import: the native v3.0
// JSON format plus the third-party justin163 planner format.
// (Moved from utils/studentStorage.)

import { EquipmentLevels, EquipmentType } from '../../types/gear';
import {
  getAllItemsInventories,
  getAllEquipmentInventories,
  getAllFormData,
  getAllStudentsAsRecord
} from './dbService';
import type { ItemsInventoryRecord, FormRecord } from '../db/database';
import { getSettings, saveSettings } from '../utils/settingsStorage';
import { db } from '../db/database';

/**
 * Schema for the third-party "other site" (justin163) JSON import format.
 * Numeric fields are strings in the source JSON; parseInt handles both.
 */
interface OtherSiteCharacterState {
  bond?: string;
  level?: string;
  ex?: string;
  basic?: string;
  passive?: string;
  sub?: string;
  gear1?: string;
  gear2?: string;
  gear3?: string;
  bond_gear?: string;
  star?: string;
  ue?: string;
  book_atk?: string;
  book_hp?: string;
  book_heal?: string;
}

interface OtherSiteCharacter {
  id: string | number;
  enabled?: boolean;
  current: OtherSiteCharacterState;
  target: OtherSiteCharacterState;
  eleph?: {
    owned?: string;
    cost?: string;
    purchasable?: string;
  };
}

interface OtherSiteImport {
  characters: OtherSiteCharacter[];
  disabled_characters?: string[];
  owned_materials?: Record<string, number>;
}

/** parseInt with explicit radix and a fallback for missing / non-numeric input. */
function parseIntOr(value: string | number | undefined, fallback: number): number {
  return parseInt(String(value ?? ''), 10) || fallback;
}

/**
 * True if an imported `current` state shows real in-game progress — i.e. the
 * student is owned. justin163's `enabled` flag is a "show in planner" toggle,
 * NOT an ownership flag: players routinely disable students they own (e.g. ones
 * they've finished), which would otherwise import as Not Recruited and hide all
 * their level/skill/gear tracking. You can't level or bond a student you don't
 * own, so any progress above the default base = owned, regardless of `enabled`.
 */
function hasImportedProgress(state: OtherSiteCharacterState | undefined): boolean {
  if (!state) return false;
  const n = (v: string | number | undefined) => parseInt(String(v ?? ''), 10) || 0;
  return (
    n(state.level) > 1 || n(state.bond) > 1 ||
    n(state.ex) > 1 || n(state.basic) > 1 || n(state.passive) > 1 || n(state.sub) > 1 ||
    n(state.gear1) > 1 || n(state.gear2) > 1 || n(state.gear3) > 1 ||
    n(state.bond_gear) > 0 || n(state.book_atk) > 0 || n(state.book_hp) > 0 || n(state.book_heal) > 0
  );
}

/**
 * Exports all IndexedDB data and settings to a downloadable JSON file
 * @returns Promise resolving to a Blob URL to download the exported data
 */
async function exportLocalStorageData(): Promise<string> {
  try {
    // Export ONLY user data (v3.0 format)
    const [forms, resources, equipments] = await Promise.all([
      getAllFormData(),              // User progression
      getAllItemsInventories(),      // Item quantities
      getAllEquipmentInventories()   // Equipment quantities
    ]);

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

    const exportString = JSON.stringify(exportData, null, 2);
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

  // Convert forms from Record to Array (before transaction — no DB access needed)
  let formsArray: any[] = [];
  if (userData.forms) {
    if (Array.isArray(userData.forms)) {
      formsArray = userData.forms;
    } else if (typeof userData.forms === 'object') {
      formsArray = Object.entries(userData.forms).map(([studentId, formData]) => {
        const { id, ...rest } = formData as any;
        return { studentId: Number(studentId), ...rest };
      });
    }
  }

  // Support both 'resources' (legacy key) and 'items' (canonical key) for items inventory
  const itemsSource = userData.items ?? userData.resources;

  // Wrap all DB operations in a single atomic transaction so a partial failure
  // never leaves the database in an inconsistent state.
  await db.transaction('rw', [db.forms, db.items_inventory, db.equipment_inventory], async () => {
    await Promise.all([
      db.forms.clear(),
      db.items_inventory.clear(),
      db.equipment_inventory.clear()
    ]);

    await Promise.all([
      formsArray.length > 0 ? db.forms.bulkPut(formsArray) : Promise.resolve(),
      itemsSource ? db.items_inventory.bulkPut(
        Object.entries(itemsSource).map(([id, quantity]) => ({
          Id: Number(id),
          QuantityOwned: quantity as number
        }))
      ) : Promise.resolve(),
      userData.equipments ? db.equipment_inventory.bulkPut(
        Object.entries(userData.equipments).map(([id, quantity]) => ({
          Id: Number(id),
          QuantityOwned: quantity as number
        }))
      ) : Promise.resolve()
    ]);
  });

  // Merge settings with existing ones to preserve new/default keys (localStorage, outside transaction)
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
    const importData = JSON.parse(importText) as OtherSiteImport;

    if (!importData.characters || !Array.isArray(importData.characters)) {
      throw new Error('Invalid import data format: missing characters array');
    }

    const [existingForms, students] = await Promise.all([
      getAllFormData(),
      getAllStudentsAsRecord()
    ]);

    // Enabled IDs are excluded from the disabled pass below.
    const enabledIds = new Set<number>(
      importData.characters.map(c => parseInt(String(c.id), 10)).filter(Boolean)
    );

    const formDataArray: FormRecord[] = [];

    importData.characters.forEach((char) => {
      if (!char.id) return;
      const studentId = parseInt(String(char.id), 10);
      // Reject IDs not present in the SchaleDB cache — prevents phantom form records
      // from a crafted import that would poison every later iteration over `forms`.
      if (!studentId || !students[studentId]) return;

      const studentData = students[studentId];
      const equipmentTypes = (studentData?.Equipment ?? []) as EquipmentType[];
      const starData = studentData?.StarGrade ?? 1;
      const equipmentLevels: EquipmentLevels = {};
      const importedGearValues = [
        { current: parseIntOr(char.current.gear1, 1), target: parseIntOr(char.target.gear1, 1) },
        { current: parseIntOr(char.current.gear2, 1), target: parseIntOr(char.target.gear2, 1) },
        { current: parseIntOr(char.current.gear3, 1), target: parseIntOr(char.target.gear3, 1) }
      ];
      equipmentTypes.forEach((type, idx) => {
        const imported = importedGearValues[idx];
        if (!imported) return;
        equipmentLevels[type] = imported;
      });

      const formData = {
        studentId,
        // `enabled` is justin163's planner-visibility toggle, not ownership —
        // also treat a student as owned if their current state shows progress.
        isOwned: char.enabled !== false || hasImportedProgress(char.current),
        bondDetailData: {
          currentBond: parseIntOr(char.current.bond, 1)
        },
        boxFormData: {},
        characterLevels: {
          current: parseIntOr(char.current.level, 1),
          target: parseIntOr(char.target.level, 1)
        },
        equipmentLevels,
        // exclusiveGearLevel = bond gear (unlocked at bond 15)
        exclusiveGearLevel: {
          current: parseIntOr(char.current.bond_gear, 0),
          target: parseIntOr(char.target.bond_gear, 0)
        },
        giftFormData: {},
        // gradeLevels = star grade + UE additions (e.g. ★5 + UE3 → 8)
        gradeLevels: {
          current: parseIntOr(char.current.star, starData) + parseIntOr(char.current.ue, 0),
          target:  parseIntOr(char.target.star,  starData) + parseIntOr(char.target.ue,  0)
        },
        // book_atk → attack, book_hp → maxhp, book_heal → healpower
        potentialLevels: {
          attack:    { current: parseIntOr(char.current.book_atk,  0), target: parseIntOr(char.target.book_atk,  0) },
          maxhp:     { current: parseIntOr(char.current.book_hp,   0), target: parseIntOr(char.target.book_hp,   0) },
          healpower: { current: parseIntOr(char.current.book_heal, 0), target: parseIntOr(char.target.book_heal, 0) }
        },
        skillLevels: {
          Ex:           { current: parseIntOr(char.current.ex,      1), target: parseIntOr(char.target.ex,      1) },
          Public:       { current: parseIntOr(char.current.basic,   1), target: parseIntOr(char.target.basic,   1) },
          Passive:      { current: parseIntOr(char.current.passive, 1), target: parseIntOr(char.target.passive, 1) },
          ExtraPassive: { current: parseIntOr(char.current.sub,     1), target: parseIntOr(char.target.sub,     1) }
        },
        gradeInfos: {
          owned:       parseIntOr(char.eleph?.owned,       0),
          price:       parseIntOr(char.eleph?.cost,        1),
          purchasable: parseIntOr(char.eleph?.purchasable, 20)
        }
      };

      // Merge with existing data (strip any ghost numeric 'id' key)
      const { id: _id, ...existingClean } = (existingForms[studentId] ?? {}) as any;
      formDataArray.push({ ...existingClean, ...formData });
    });

    // Mark disabled / unowned characters so they appear in the Not Recruited section
    const disabledIds: string[] = importData.disabled_characters ?? [];
    disabledIds.forEach((rawId: string) => {
      const studentId = parseInt(rawId, 10);
      // Same phantom-ID guard as the enabled pass — only persist IDs SchaleDB knows.
      if (!studentId || !students[studentId] || enabledIds.has(studentId)) return;
      const { id: _id, ...existingClean } = (existingForms[studentId] ?? {}) as any;
      formDataArray.push({ ...existingClean, studentId, isOwned: false });
    });

    await db.forms.bulkPut(formDataArray);

    // Import numeric-ID materials into items_inventory (skip string-keyed entries
    // like 'T6_Hat', 'Xp', etc. which use justin163's own naming scheme)
    const ownedMaterials: Record<string, number> = importData.owned_materials ?? {};
    const itemInventoryRows: ItemsInventoryRecord[] = Object.entries(ownedMaterials)
      .filter(([key]) => /^\d+$/.test(key))
      .map(([key, qty]) => ({ Id: parseInt(key, 10), QuantityOwned: Number(qty) || 0 }));

    if (itemInventoryRows.length > 0) {
      await db.items_inventory.bulkPut(itemInventoryRows);
    }

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

        // PRIORITY 1: Check for native v3.0 format first so a file that
        // somehow contains both keys uses the canonical format.
        if (importData.version === '3.0' && importData.userData) {
          await importV3Format(importData);
          resolve(true);
          return;
        }

        // PRIORITY 2: Check for SchaleDB / other-site format
        if (importData.characters && Array.isArray(importData.characters)) {
          const success = await importFromOtherSite(fileContent);
          resolve(success);
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
