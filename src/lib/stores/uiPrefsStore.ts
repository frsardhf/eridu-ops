// uiPrefsStore.ts - Settings-backed UI preference state: search, sort, pin
// mode, filters, theme. Extracted from useStudentData so presentation prefs
// live apart from data loading; useStudentData re-exports everything, so
// components keep consuming the hook unchanged.

import { computed, ref } from 'vue';
import {
  getSettings,
  getPinnedStudents,
  updateSetting,
  updateSortSettings,
} from '../utils/settingsStorage';
import { normalizeTheme } from '../utils/themeUtils';
import { ThemeId } from '@/types/theme';
import { SortOption, SortDirection } from '@/types/header';
import { StudentFilters, StudentFilterValue, EMPTY_FILTERS, isFiltersEmpty } from '@/types/filter';

export const searchQuery = ref<string>('');
export const pinnedStudentIds = ref<string[]>([]);
export const currentTheme = ref<ThemeId>('dark');
export const currentSort = ref<SortOption>('id');
export const sortDirection = ref<SortDirection>('asc');
export const isPinnedMode = ref<boolean>(false);
export const activeFilters = ref<StudentFilters>({ ...EMPTY_FILTERS });

/** O(1) membership view for per-card isPinned checks. */
export const pinnedIdSet = computed(() => new Set(pinnedStudentIds.value));

/**
 * Re-read the pinned list from settings (after imports replace the blob).
 * Copied on assign: the settings cache hands out the same array object it
 * holds, and assigning an identical reference to a ref is a reactivity no-op.
 */
export function syncPinnedStudents() {
  pinnedStudentIds.value = [...getPinnedStudents()];
}

/**
 * Toggle a student's pin. The ref is the source of truth: build a NEW array,
 * assign it (new identity, so every reader recomputes), then persist a copy.
 * Never mutate the settings-cache array in place; that bypasses Vue tracking
 * and re-assigning the same reference later won't trigger anything.
 */
export function togglePinned(studentId: string | number): boolean {
  const id = String(studentId);
  const wasPinned = pinnedIdSet.value.has(id);
  const next = wasPinned
    ? pinnedStudentIds.value.filter(sid => sid !== id)
    : [...pinnedStudentIds.value, id];
  pinnedStudentIds.value = next;
  updateSetting('pinnedStudents', [...next]);
  return !wasPinned;
}

/** Hydrate all prefs from the persisted settings blob (called once during init). */
export function loadUiPrefs() {
  const settings = getSettings();

  const theme = normalizeTheme(settings.theme);
  currentTheme.value = theme;
  currentSort.value = settings.sort.option;
  sortDirection.value = settings.sort.direction;
  isPinnedMode.value = settings.isPinnedMode ?? false;
  if (settings.studentFilters) {
    activeFilters.value = { ...EMPTY_FILTERS, ...settings.studentFilters };
  }
  syncPinnedStudents();

  document.documentElement.setAttribute('data-theme', theme);
}

function saveSortPreferences() {
  updateSortSettings(currentSort.value, sortDirection.value);
}

export function setSortOption(option: SortOption) {
  if (currentSort.value === option) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.value = option;
  }

  saveSortPreferences();
}

export function toggleDirection() {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  saveSortPreferences();
}

export function setTheme(theme: ThemeId) {
  currentTheme.value = theme;
  document.documentElement.setAttribute('data-theme', theme);
  updateSetting('theme', theme);
}

export function updateSearchQuery(query: string) {
  searchQuery.value = query;
}

export function togglePinnedMode() {
  isPinnedMode.value = !isPinnedMode.value;
  updateSetting('isPinnedMode', isPinnedMode.value);
}

export function setStudentFilters(key: keyof StudentFilters, value: StudentFilterValue) {
  // Replace the whole object so dependent computeds re-run
  activeFilters.value = { ...activeFilters.value, [key]: value };
  updateSetting('studentFilters', activeFilters.value);
}

export function clearStudentFilters() {
  activeFilters.value = { ...EMPTY_FILTERS };
  updateSetting('studentFilters', { ...EMPTY_FILTERS });
}

export function areFiltersEmpty(): boolean {
  return isFiltersEmpty(activeFilters.value);
}
