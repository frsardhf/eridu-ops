// settingsStorage.ts - Consolidated localStorage settings management

import type { SortOption, SortDirection } from '../../types/header';
import type { ThemeId } from '@/types/theme';
import { DEFAULT_THEME } from './themeUtils';

const SETTINGS_KEY = 'eridu-ops-settings';

export interface AppSettings {
  theme: ThemeId;
  language: 'en' | 'jp';
  sort: {
    option: SortOption;
    direction: SortDirection;
  };
  pinnedStudents: string[];
  manualOrder: number[];
}

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  theme: DEFAULT_THEME,
  language: 'en',
  sort: {
    option: 'id',
    direction: 'asc'
  },
  pinnedStudents: [],
  manualOrder: []
};

/**
 * Get consolidated settings from localStorage
 * @returns AppSettings object or default settings if not found
 */
export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(data);

    // Merge with defaults to ensure all properties exist
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      sort: {
        ...DEFAULT_SETTINGS.sort,
        ...parsed.sort
      }
    };
  } catch (error) {
    console.error('Error reading settings from localStorage:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save consolidated settings to localStorage
 * @param settings The settings object to save
 * @returns True if successful, false otherwise
 */
export function saveSettings(settings: AppSettings): boolean {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
    return false;
  }
}

/**
 * Update a single setting field
 * @param key The setting key to update
 * @param value The new value
 * @returns True if successful, false otherwise
 */
export function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): boolean {
  try {
    const currentSettings = getSettings();
    currentSettings[key] = value;
    return saveSettings(currentSettings);
  } catch (error) {
    console.error('Error updating setting:', error);
    return false;
  }
}

/**
 * Update sort settings
 * @param option Sort option
 * @param direction Sort direction
 * @returns True if successful, false otherwise
 */
export function updateSortSettings(
  option: SortOption,
  direction: SortDirection
): boolean {
  try {
    const currentSettings = getSettings();
    currentSettings.sort = { option, direction };
    return saveSettings(currentSettings);
  } catch (error) {
    console.error('Error updating sort settings:', error);
    return false;
  }
}

/**
 * Get theme setting
 * @returns Current theme
 */
export function getTheme(): ThemeId {
  return getSettings().theme;
}

/**
 * Set theme setting
 * @param theme New theme value
 * @returns True if successful, false otherwise
 */
export function setTheme(theme: ThemeId): boolean {
  return updateSetting('theme', theme);
}

/**
 * Get language setting
 * @returns Current language
 */
export function getLanguage(): 'en' | 'jp' {
  return getSettings().language;
}

/**
 * Set language setting
 * @param language New language value
 * @returns True if successful, false otherwise
 */
export function setLanguage(language: 'en' | 'jp'): boolean {
  return updateSetting('language', language);
}

/**
 * Get pinned students
 * @returns Array of pinned student IDs
 */
export function getPinnedStudents(): string[] {
  return getSettings().pinnedStudents;
}

/**
 * Set pinned students
 * @param studentIds Array of student IDs
 * @returns True if successful, false otherwise
 */
export function setPinnedStudents(studentIds: string[]): boolean {
  return updateSetting('pinnedStudents', studentIds);
}

/**
 * Get manual order
 * @returns Array of student IDs in manual order
 */
export function getManualOrder(): number[] {
  return getSettings().manualOrder;
}

/**
 * Set manual order
 * @param ids Array of student IDs in desired order
 * @returns True if successful, false otherwise
 */
export function setManualOrder(ids: number[]): boolean {
  return updateSetting('manualOrder', ids);
}

/**
 * Toggle a student's pinned status
 * @param studentId The ID of the student to toggle
 * @returns The new pinned status (true if pinned, false if unpinned)
 */
export function togglePinnedStudent(studentId: string | number): boolean {
  try {
    const pinnedStudents = getPinnedStudents();
    const id = studentId.toString();
    const isCurrentlyPinned = pinnedStudents.includes(id);

    if (isCurrentlyPinned) {
      const updatedPinned = pinnedStudents.filter(sid => sid !== id);
      setPinnedStudents(updatedPinned);
      return false;
    } else {
      pinnedStudents.push(id);
      setPinnedStudents(pinnedStudents);
      return true;
    }
  } catch (error) {
    console.error('Error toggling pinned student:', error);
    return false;
  }
}

/**
 * Check if a student is pinned
 * @param studentId The ID of the student to check
 * @returns True if pinned, false otherwise
 */
export function isStudentPinned(studentId: string | number): boolean {
  try {
    const pinnedStudents = getPinnedStudents();
    return pinnedStudents.includes(studentId.toString());
  } catch (error) {
    console.error('Error checking if student is pinned:', error);
    return false;
  }
}

/**
 * Get sort settings
 * @returns Current sort option and direction
 */
export function getSortSettings(): { option: SortOption; direction: SortDirection } {
  return getSettings().sort;
}

/**
 * Reset settings to defaults
 * @returns True if successful, false otherwise
 */
export function resetSettings(): boolean {
  return saveSettings({ ...DEFAULT_SETTINGS });
}
