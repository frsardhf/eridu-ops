// useStudentData.ts - Load pipeline + facade. State lives elsewhere:
//   stores/masterDataStore  - SchaleDB data, gift derivations, sorted views, load flags
//   stores/uiPrefsStore     - search/sort/pins/filters/theme (settings-backed)
// This hook owns orchestration only (init, refresh, language switch, retry)
// and returns one combined API so components keep a single entry point.

import { watch } from 'vue'
import { StudentProps } from '../../types/student';
import {
  ResourceProps,
  GIFT_BOX_IDS
} from '../../types/resource';
import {
  searchQuery,
  pinnedStudentIds,
  currentTheme,
  currentSort,
  sortDirection,
  isPinnedMode,
  activeFilters,
  loadUiPrefs,
  syncPinnedStudents,
  setSortOption,
  toggleDirection,
  setTheme,
  updateSearchQuery,
  togglePinnedMode,
  setStudentFilters,
  clearStudentFilters,
  areFiltersEmpty,
} from '../stores/uiPrefsStore';
import {
  studentData,
  favoredGift,
  allGifts,
  giftBoxData,
  isLoading,
  isReady,
  loadError,
  availableSchools,
  ownedStudentsArray,
  unownedStudentsArray,
  sortedStudentsArray,
} from '../stores/masterDataStore';
import {
  getAllStudents,
  getAllItems,
  getAllFormData,
  saveStudents,
  saveItems,
  saveEquipment,
  needsRefresh,
  updateCacheMetadata
} from '../services/dbService';
import { migrateFromLocalStorageToIndexedDB } from '../utils/migration';
import { batchSetStudentData, studentDataStore } from '../stores/studentStore';
import { initializeAllCaches } from '../stores/resourceCacheStore';
import { currentLanguage, initializeLocalizationData, localizationData } from '../stores/localizationStore';
import { fetchAllData, fetchLocalizationData } from '../services/schaleDbFetchService';
import { filterByProperty } from '../utils/filterUtils';
import { SchaleLocalization } from '@/types/schaledb';
import { isSecondaryStudent } from '../constants/linkedStudents';
import { buildGiftsByStudent } from '../utils/giftUtils';
import { preloadAllStudentsData } from '../utils/materialUtils';
import {
  attachElephIcons,
  toRecordById
} from '../utils/studentDataHydrationUtils';

// --- One-shot lifecycle guards (shared across all hook calls) ---
let _langChangeTimer: ReturnType<typeof setTimeout> | null = null;
// Monotonic counter for language reinitializations; a reinit only applies its
// result if it's still the latest, so rapid toggling can't apply stale data.
let _langReqSeq = 0;
let _isInitialized = false;
let _initPromise: Promise<void> | null = null;

// --- Load pipeline (writes masterDataStore) ---

async function loadFromCache() {
  try {
    // Equipment isn't read here: processAndPopulateData only needs students +
    // items (gift derivations), and initializeAllCaches loads equipment itself.
    const [students, items] = await Promise.all([
      getAllStudents(),
      getAllItems()
    ]);

    await processAndPopulateData(toRecordById(students), toRecordById(items));
  } catch (error) {
    console.error('Error loading from cache:', error);
  }
}

async function refreshSchaleDBData() {
  try {
    console.log('Fetching fresh data from SchaleDB...');
    const { students, items, equipment } = await fetchAllData(currentLanguage.value);
    // A failed fetch returns empty objects; don't overwrite the cache with them.
    if (!students || Object.keys(students).length === 0) {
      markLoadErrorIfEmpty();
      return;
    }

    await Promise.all([
      saveStudents(Object.values(students)),
      saveItems(Object.values(items)),
      saveEquipment(Object.values(equipment))
    ]);

    await updateCacheMetadata();
    await processAndPopulateData(students, items);
    loadError.value = false;

    console.log('Background refresh completed successfully');
  } catch (error) {
    console.error('Background refresh failed:', error);
    markLoadErrorIfEmpty();
  }
}

// Only surface the error banner when the failure leaves the user with nothing:
// a stale-but-present cache is still a working app, not an error state.
function markLoadErrorIfEmpty() {
  if (Object.keys(studentData.value).length === 0) {
    loadError.value = true;
  }
}

async function processAndPopulateData(
  students: Record<string, StudentProps>,
  items: Record<string, ResourceProps>,
  localization?: SchaleLocalization
) {
  // Single item/equipment source: resourceCacheStore reads both tables merged
  // with inventory quantities here, and per-id updates keep it current after
  // inventory edits. Nothing else holds a copy.
  await initializeAllCaches();

  // On a language switch, swap localization in the same synchronous block as the
  // student/gift data so the grid and its school/club labels never render a mix
  // of languages (Vue batches both ref writes into one re-render).
  if (localization) localizationData.value = localization;
  studentData.value = attachElephIcons(students, items);

  // Gift metadata slices are pipeline locals; only the per-student maps persist.
  const gifts = filterByProperty(items, 'category', 'Favor');
  const boxes = filterByProperty(items, 'id', GIFT_BOX_IDS);

  favoredGift.value = buildGiftsByStudent(studentData.value, gifts);
  allGifts.value = buildGiftsByStudent(studentData.value, gifts, {
    includeAll: true,
  });
  giftBoxData.value = buildGiftsByStudent(studentData.value, boxes, {
    isGiftBox: true,
    favoredGiftByStudent: favoredGift.value
  });

  await preloadStudentStore();
  syncPinnedStudents();

  // Recompute the per-student materials/gears aggregates from the freshly
  // loaded forms. Running here covers init, imports (reinitializeData), and
  // language switches alike instead of only the first App.vue mount.
  preloadAllStudentsData(studentData.value, studentDataStore.value);
}

async function preloadStudentStore() {
  try {
    const allFormData = await getAllFormData();
    const numericKeyData: Record<number, any> = {};
    Object.entries(allFormData).forEach(([studentId, formData]) => {
      const id = Number(studentId);
      if (isSecondaryStudent(id)) return;
      numericKeyData[id] = formData;
    });
    batchSetStudentData(numericKeyData);
  } catch (error) {
    console.error('Error preloading student store:', error);
  }
}

async function initializeData() {
  try {
    isLoading.value = true;
    loadError.value = false;

    await Promise.all([
      migrateFromLocalStorageToIndexedDB(),
      initializeLocalizationData()
    ]);

    loadUiPrefs();
    await loadFromCache();

    if (Object.keys(studentData.value).length === 0) {
      // Empty cache (first visit): the fetch IS the initial load, so run it in
      // the foreground; on failure markLoadErrorIfEmpty surfaces the banner.
      await refreshSchaleDBData();
    } else {
      const shouldRefresh = await needsRefresh(7);
      if (shouldRefresh) {
        console.log('Cache is stale, triggering background refresh...');
        refreshSchaleDBData();
      }
    }

    isReady.value = true;
    isLoading.value = false;
  } catch (error) {
    console.error('Error initializing data:', error);
    isLoading.value = false;
    isReady.value = true;
    markLoadErrorIfEmpty();
  }
}

// Banner retry: rerun the full initialization (failed fetches are evicted from
// the per-language caches, so this really refetches).
async function retryDataLoad() {
  await initializeData();
}

// Reload the in-memory caches from IndexedDB after an import or inventory update.
// No network and no SchaleDB re-fetch: the master data is unchanged, only the
// user's forms/inventory differ, so re-reading IndexedDB and reprocessing is
// enough (and far cheaper than the old full refresh).
async function reinitializeData() {
  isLoading.value = true;
  try {
    await loadFromCache();
  } catch (error) {
    console.error('Data reload failed:', error);
  } finally {
    isLoading.value = false;
  }
}

// Coordinated language switch: fetch the target language's student data and
// localization together (both cached per language), then commit them in one tick
// via processAndPopulateData so labels and the grid switch atomically. Latest-
// wins: a newer switch supersedes an in-flight one, and an empty (failed) fetch
// leaves the current language untouched rather than wiping the UI.
async function applyLanguage() {
  const seq = ++_langReqSeq;
  const targetLang = currentLanguage.value;
  isLoading.value = true;
  try {
    const [data, localization] = await Promise.all([
      fetchAllData(targetLang),
      fetchLocalizationData(targetLang),
    ]);
    if (seq !== _langReqSeq) return;
    if (!data.students || Object.keys(data.students).length === 0) return;

    await Promise.all([
      saveStudents(Object.values(data.students)),
      saveItems(Object.values(data.items)),
      saveEquipment(Object.values(data.equipment)),
    ]);
    await updateCacheMetadata();

    if (seq !== _langReqSeq) return;
    await processAndPopulateData(data.students, data.items, localization);
  } catch (error) {
    console.error('Language load failed:', error);
  } finally {
    if (seq === _langReqSeq) isLoading.value = false;
  }
}

// --- Composable entry point ---

export function useStudentData() {
  if (!_isInitialized && !_initPromise) {
    // Watch for language changes and load the new language (only once).
    // Debounced 200ms so a rapid toggle burst only triggers one coordinated load.
    watch(
      () => currentLanguage.value,
      () => {
        if (_langChangeTimer) clearTimeout(_langChangeTimer);
        _langChangeTimer = setTimeout(() => {
          _langChangeTimer = null;
          applyLanguage();
        }, 200);
      }
    );

    // Initialize data only once
    _initPromise = initializeData().then(() => {
      _isInitialized = true;
    });
  }

  return {
    studentData,
    favoredGift,
    allGifts,
    giftBoxData,
    sortedStudentsArray,
    ownedStudentsArray,
    unownedStudentsArray,
    availableSchools,
    reinitializeData,
    isLoading,
    isReady,
    loadError,
    retryDataLoad,
    // UI preference state/actions, re-exported from uiPrefsStore so existing
    // consumers keep their single useStudentData() entry point.
    searchQuery,
    currentTheme,
    setTheme,
    setSortOption,
    currentSort,
    sortDirection,
    updateSearchQuery,
    toggleDirection,
    syncPinnedStudents,
    isPinnedMode,
    togglePinnedMode,
    activeFilters,
    setStudentFilters,
    clearStudentFilters,
    isFiltersEmpty: areFiltersEmpty,
  }
}
