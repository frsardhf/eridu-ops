// settingsStorage.ts - Consolidated localStorage settings management

import type { SortOption, SortDirection } from '../../types/header';
import type { ThemeId } from '@/types/theme';
import type { StudentFilters } from '@/types/filter';
import type { CardOverlayId } from '@/types/card';
import type { InventoryLayout } from '@/types/resource';
import type { Language } from '../stores/localizationStore';
import type { GameServer } from '@/types/server';
import type { CraftingFodderSession } from '../../types/crafting';
import { DEFAULT_THEME } from './themeUtils';

const SETTINGS_KEY = 'eridu-ops-settings';

let cachedSettings: { raw: string | null; value: AppSettings } | undefined;

export interface AppSettings {
  theme: ThemeId;
  language: Language;
  gameServer?: GameServer;
  sort: {
    option: SortOption;
    direction: SortDirection;
  };
  pinnedStudents: string[];
  isPinnedMode: boolean;
  craftingFodder?: {
    thresholds: Record<string, Record<string, number>>;
    rarityFilter: string[];
    session?: CraftingFodderSession;
    markedIds?: number[];
  };
  studentFilters?: StudentFilters;
  bondsTrackedStudents?: number[];
  bondsLayout: 'cards' | 'tabs';
  bondsGiftPlanningEnabled?: number[];
  bond100Sort?: 'default' | 'name' | 'bond100' | 'recent';
  bond100SortDirection?: SortDirection;
  /** /hall school filter: a raw SchaleDB School value, or 'all'. */
  bond100School?: string;
  /** /hall toggle to hide students with a 0 bond-100 count. */
  bond100HideEmpty?: boolean;
  /** /hall view: per-student wall grid (default) or the player leaderboard. */
  bond100View?: 'wall' | 'players';
  /** ID of the most recent CHANGELOG entry the user has seen / dismissed. */
  lastSeenChangelogId?: string;
  /** Card overlays pinned to always-display (undefined = all shown by default). */
  cardOverlays?: CardOverlayId[];
  /** Global inventory presentation: grouped pages or one continuous scroll. */
  inventoryLayout: InventoryLayout;
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: DEFAULT_THEME,
  language: 'en',
  gameServer: 'global',
  sort: {
    option: 'id',
    direction: 'asc',
  },
  pinnedStudents: [],
  isPinnedMode: false,
  bondsLayout: 'tabs',
  inventoryLayout: 'paged',
};

// Every key we currently persist. Anything else found in the stored blob is a
// leftover from an older version (e.g. bond100Layout, sortDirectionsByOption)
// and is pruned on load. Keep this in sync with the AppSettings interface.
const ALLOWED_KEYS: (keyof AppSettings)[] = [
  'theme',
  'language',
  'gameServer',
  'sort',
  'pinnedStudents',
  'isPinnedMode',
  'craftingFodder',
  'studentFilters',
  'bondsTrackedStudents',
  'bondsLayout',
  'bondsGiftPlanningEnabled',
  'bond100Sort',
  'bond100SortDirection',
  'bond100School',
  'bond100HideEmpty',
  'bond100View',
  'lastSeenChangelogId',
  'cardOverlays',
  'inventoryLayout',
];

function parseStoredSettings(raw: string | null) {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new TypeError('Expected a settings object.');
    }

    const entries = Object.entries(parsed);
    const allowed = entries.filter(([key]) => ALLOWED_KEYS.includes(key as keyof AppSettings));
    return {
      settings: Object.fromEntries(allowed) as Partial<AppSettings>,
      hadStale: allowed.length !== entries.length,
    };
  } catch (error) {
    console.error('Error parsing settings from localStorage:', error);
    return { settings: {}, hadStale: false };
  }
}

function writeStoredSettings(settings: Partial<AppSettings>): string | null {
  try {
    const raw = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_KEY, raw);
    return raw;
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
    return null;
  }
}

/** Get settings with defaults, reusing the parsed value only while storage is unchanged. */
export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (cachedSettings?.raw === raw) return cachedSettings.value;

    const { settings, hadStale } = parseStoredSettings(raw);
    const value = {
      ...DEFAULT_SETTINGS,
      ...settings,
      sort: { ...DEFAULT_SETTINGS.sort, ...settings.sort },
    };

    // Prune legacy keys without writing defaults or replacing a newer snapshot.
    const prunedRaw =
      hadStale && localStorage.getItem(SETTINGS_KEY) === raw ? writeStoredSettings(settings) : null;
    cachedSettings = { raw: prunedRaw ?? raw, value };

    return value;
  } catch (error) {
    console.error('Error reading settings from localStorage:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/** Replace the consolidated settings snapshot. */
export function saveSettings(settings: AppSettings): boolean {
  return writeStoredSettings(settings) !== null;
}

/** Update one key on the latest stored snapshot without replacing other tabs' changes. */
export function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): boolean {
  try {
    const { settings } = parseStoredSettings(localStorage.getItem(SETTINGS_KEY));
    return writeStoredSettings({ ...settings, [key]: value }) !== null;
  } catch (error) {
    console.error('Error updating setting:', error);
    return false;
  }
}

/** Update the sort option + direction. */
export function updateSortSettings(option: SortOption, direction: SortDirection): boolean {
  return updateSetting('sort', { option, direction });
}

/** Get the pinned student IDs. */
export function getPinnedStudents(): string[] {
  return getSettings().pinnedStudents;
}

/** Read the last changelog entry id the user dismissed (undefined => unseen). */
export function getLastSeenChangelogId(): string | undefined {
  return getSettings().lastSeenChangelogId;
}

/** Persist the id of the latest changelog entry the user has acknowledged. */
export function setLastSeenChangelogId(id: string): boolean {
  return updateSetting('lastSeenChangelogId', id);
}
