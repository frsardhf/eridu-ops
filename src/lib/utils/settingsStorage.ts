// settingsStorage.ts - Consolidated localStorage settings management

import type { SortOption, SortDirection } from '../../types/header';
import type { ThemeId } from '@/types/theme';
import type { StudentFilters } from '@/types/filter';
import { DEFAULT_THEME } from './themeUtils';

const SETTINGS_KEY = 'eridu-ops-settings';

// Module-level cache so repeated getSettings() calls never re-parse localStorage.
// Invalidated on every saveSettings() call.
let _cachedSettings: AppSettings | null = null;

export interface AppSettings {
  theme: ThemeId;
  language: 'en' | 'jp';
  sort: {
    option: SortOption;
    direction: SortDirection;
  };
  pinnedStudents: string[];
  isPinnedMode: boolean;
  craftingFodder?: {
    thresholds: Record<string, Record<string, number>>; // thresholds[subcat][rarity]
    rarityFilter: string[]; // user's chip selection for Stage 1
    markedIds: number[];    // material IDs the user has marked as "used"
  };
  studentFilters?: StudentFilters;
  bondsTrackedStudents?: number[];
  bondsLayout: 'cards' | 'tabs';
  bondsGiftPlanningEnabled?: number[];
  bond100Sort?: 'default' | 'name' | 'bond100';
  /** ID of the most recent CHANGELOG entry the user has seen / dismissed. */
  lastSeenChangelogId?: string;
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: DEFAULT_THEME,
  language: 'en',
  sort: {
    option: 'id',
    direction: 'asc'
  },
  pinnedStudents: [],
  isPinnedMode: false,
  bondsLayout: 'tabs',
};

// Every key we currently persist. Anything else found in the stored blob is a
// leftover from an older version (e.g. bond100Layout, sortDirectionsByOption)
// and is pruned on load. Keep this in sync with the AppSettings interface.
const ALLOWED_KEYS: (keyof AppSettings)[] = [
  'theme', 'language', 'sort', 'pinnedStudents', 'isPinnedMode',
  'craftingFodder', 'studentFilters', 'bondsTrackedStudents', 'bondsLayout',
  'bondsGiftPlanningEnabled', 'bond100Sort', 'lastSeenChangelogId',
];

/**
 * Get consolidated settings from localStorage.
 * Result is cached in memory; re-parses localStorage only on first call
 * or after saveSettings() invalidates the cache.
 * @returns AppSettings object or default settings if not found
 */
export function getSettings(): AppSettings {
  if (_cachedSettings) return _cachedSettings;

  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) {
      const fresh: AppSettings = { ...DEFAULT_SETTINGS };
      _cachedSettings = fresh;
      return fresh;
    }

    const parsed = JSON.parse(data) as Record<string, unknown>;

    // Merge with defaults to ensure all properties exist
    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      sort: {
        ...DEFAULT_SETTINGS.sort,
        ...(parsed.sort as object),
      },
    } as AppSettings;

    // Drop stale fields left by older versions (the spread above keeps unknown
    // keys alive) — retain only the current allowlist.
    const clean = {} as AppSettings;
    const src = merged as unknown as Record<string, unknown>;
    const dst = clean as unknown as Record<string, unknown>;
    for (const key of ALLOWED_KEYS) {
      if (key in src) dst[key] = src[key];
    }
    _cachedSettings = clean;

    // If the stored blob actually had stale keys, rewrite it once so they're
    // gone from localStorage, not just ignored in memory.
    const hadStale = Object.keys(parsed).some(k => !ALLOWED_KEYS.includes(k as keyof AppSettings));
    if (hadStale) saveSettings(clean);

    return clean;
  } catch (error) {
    console.error('Error reading settings from localStorage:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save consolidated settings to localStorage and update the in-memory cache.
 * @param settings The settings object to save
 * @returns True if successful, false otherwise
 */
export function saveSettings(settings: AppSettings): boolean {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    _cachedSettings = settings; // keep cache in sync
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

/** Read the last changelog entry id the user dismissed (undefined ⇒ unseen). */
export function getLastSeenChangelogId(): string | undefined {
  return getSettings().lastSeenChangelogId;
}

/** Persist the id of the latest changelog entry the user has acknowledged. */
export function setLastSeenChangelogId(id: string): boolean {
  return updateSetting('lastSeenChangelogId', id);
}
