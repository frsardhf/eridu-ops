import { ref, computed, watch, Ref, ComputedRef } from 'vue'
import { StudentProps } from '../../types/student';
import { SortOption, SortDirection } from '../../types/header';
import { GiftProps } from '../../types/gift';
import {
  ResourceProps,
  GIFT_BOX_IDS
} from '../../types/resource';
import {
  getSettings,
  getPinnedStudents,
  updateSetting,
  updateSortSettings
} from '../utils/settingsStorage';
import {
  getAllStudents,
  getAllItems,
  getAllEquipment,
  getAllFormData,
  saveStudents,
  saveItems,
  saveEquipment,
  needsRefresh,
  updateCacheMetadata
} from '../services/dbService';
import { migrateFromLocalStorageToIndexedDB } from '../utils/migration';
import { studentDataStore, batchSetStudentData } from '../stores/studentStore';
import { initializeAllCaches } from '../stores/resourceCacheStore';
import { currentLanguage, initializeLocalizationData, localizationData } from '../stores/localizationStore';
import { fetchAllData } from '../services/schaleDbFetchService';
import { filterByProperty } from '../utils/filterUtils';
import { resolveLocalized, fetchLocalizationData } from '../utils/localizationUtils';
import { SchaleLocalization } from '@/types/schaledb';
import { StudentFilters, EMPTY_FILTERS, isFiltersEmpty } from '../../types/filter';
import { splitAndSortStudents, StudentSplit } from '../utils/sortUtils';
import { filterSecondaryStudents, isSecondaryStudent } from '../constants/linkedStudents';
import { normalizeTheme } from '../utils/themeUtils';
import { ThemeId } from '@/types/theme';
import { buildGiftsByStudent } from '../utils/giftUtils';
import {
  attachElephIcons,
  hydrateItemsData,
  hydrateEquipmentData,
  toRecordById
} from '../utils/studentDataHydrationUtils';

// Singleton state (shared across all calls)
let _langChangeTimer: ReturnType<typeof setTimeout> | null = null;
// Monotonic counter for language reinitializations; a reinit only applies its
// result if it's still the latest, so rapid toggling can't apply stale data.
let _langReqSeq = 0;
let _studentData: Ref<{ [key: string]: StudentProps }>;
let _itemsData: Ref<Record<string, ResourceProps>>;
let _equipmentData: Ref<Record<string, ResourceProps>>;
let _giftData: Ref<Record<string, ResourceProps>>;
let _boxData: Ref<Record<string, ResourceProps>>;
let _favoredGift: Ref<Record<string, GiftProps[]>>;
let _allGifts: Ref<Record<string, GiftProps[]>>;
let _giftBoxData: Ref<Record<string, GiftProps[]>>;
let _searchQuery: Ref<string>;
let _pinnedStudentIds: Ref<string[]>;
let _currentTheme: Ref<ThemeId>;
let _currentSort: Ref<SortOption>;
let _sortDirection: Ref<SortDirection>;
let _sortedStudentsArray: ComputedRef<StudentProps[]>;
let _splitStudents: ComputedRef<StudentSplit>;
let _isPinnedMode: Ref<boolean>;
let _activeFilters: Ref<StudentFilters>;
let _availableSchools: ComputedRef<string[]>;
let _isLoading: Ref<boolean>;
let _isReady: Ref<boolean>;
let _isInitialized = false;
let _initPromise: Promise<void>;

// --- Module-level functions (operate on singleton refs) ---

function syncPinnedStudents() {
  _pinnedStudentIds.value = getPinnedStudents();
}

function loadSettings() {
  const settings = getSettings();

  const theme = normalizeTheme(settings.theme);
  _currentTheme.value = theme;
  _currentSort.value = settings.sort.option;
  _sortDirection.value = settings.sort.direction;
  _isPinnedMode.value = settings.isPinnedMode ?? false;
  if (settings.studentFilters) {
    _activeFilters.value = { ...EMPTY_FILTERS, ...settings.studentFilters };
  }
  syncPinnedStudents();

  document.documentElement.setAttribute('data-theme', theme);
}

function saveSortPreferences() {
  updateSortSettings(_currentSort.value, _sortDirection.value);
}

function setSortOption(option: SortOption) {
  if (_currentSort.value === option) {
    _sortDirection.value = _sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    _currentSort.value = option;
  }

  saveSortPreferences();
}

function toggleDirection() {
  _sortDirection.value = _sortDirection.value === 'asc' ? 'desc' : 'asc';
  saveSortPreferences();
}

function setTheme(theme: ThemeId) {
  _currentTheme.value = theme;
  document.documentElement.setAttribute('data-theme', theme);
  updateSetting('theme', theme);
}

function updateSearchQuery(query: string) {
  _searchQuery.value = query;
}

async function loadFromCache() {
  try {
    const [students, items, equipment] = await Promise.all([
      getAllStudents(),
      getAllItems(),
      getAllEquipment()
    ]);

    const studentRecord = toRecordById(students);
    const itemRecord = toRecordById(items);
    const equipmentRecord = toRecordById(equipment);

    await processAndPopulateData(studentRecord, itemRecord, equipmentRecord);
  } catch (error) {
    console.error('Error loading from cache:', error);
  }
}

async function refreshSchaleDBData() {
  try {
    console.log('Fetching fresh data from SchaleDB...');
    const { students, items, equipment } = await fetchAllData();
    // A failed fetch returns empty objects; don't overwrite the cache with them.
    if (!students || Object.keys(students).length === 0) return;

    await Promise.all([
      saveStudents(Object.values(students)),
      saveItems(Object.values(items)),
      saveEquipment(Object.values(equipment))
    ]);

    await updateCacheMetadata();
    await processAndPopulateData(students, items, equipment);

    console.log('Background refresh completed successfully');
  } catch (error) {
    console.error('Background refresh failed:', error);
  }
}

async function processAndPopulateData(
  students: Record<string, StudentProps>,
  items: Record<string, ResourceProps>,
  equipment: Record<string, ResourceProps>,
  localization?: SchaleLocalization
) {
  await initializeAllCaches();

  // On a language switch, swap localization in the same synchronous block as the
  // student/gift data so the grid and its school/club labels never render a mix
  // of languages (Vue batches both ref writes into one re-render).
  if (localization) localizationData.value = localization;
  _studentData.value = attachElephIcons(students, items);

  _giftData.value = filterByProperty(items, 'category', 'Favor');
  _boxData.value = filterByProperty(items, 'id', GIFT_BOX_IDS);

  _favoredGift.value = buildGiftsByStudent(_studentData.value, _giftData.value);
  _allGifts.value = buildGiftsByStudent(_studentData.value, _giftData.value, {
    includeAll: true,
  });
  _giftBoxData.value = buildGiftsByStudent(_studentData.value, _boxData.value, {
    isGiftBox: true,
    favoredGiftByStudent: _favoredGift.value
  });

  _itemsData.value = await hydrateItemsData(items);
  _equipmentData.value = await hydrateEquipmentData(equipment);

  await preloadStudentStore();
  syncPinnedStudents();
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
    _isLoading.value = true;

    await Promise.all([
      migrateFromLocalStorageToIndexedDB(),
      initializeLocalizationData()
    ]);

    loadSettings();
    await loadFromCache();

    _isReady.value = true;
    _isLoading.value = false;

    const shouldRefresh = await needsRefresh(7);
    if (shouldRefresh) {
      console.log('Cache is stale, triggering background refresh...');
      refreshSchaleDBData();
    }
  } catch (error) {
    console.error('Error initializing data:', error);
    _isLoading.value = false;
    _isReady.value = true;
  }
}

// Reload the in-memory caches from IndexedDB after an import or inventory update.
// No network and no SchaleDB re-fetch: the master data is unchanged, only the
// user's forms/inventory differ, so re-reading IndexedDB and reprocessing is
// enough (and far cheaper than the old full refresh).
async function reinitializeData() {
  _isLoading.value = true;
  try {
    await loadFromCache();
  } catch (error) {
    console.error('Data reload failed:', error);
  } finally {
    _isLoading.value = false;
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
  _isLoading.value = true;
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
    await processAndPopulateData(data.students, data.items, data.equipment, localization);
  } catch (error) {
    console.error('Language load failed:', error);
  } finally {
    if (seq === _langReqSeq) _isLoading.value = false;
  }
}

// --- Composable entry point ---

export function useStudentData() {
  // Initialize refs on first call only
  if (!_studentData) {
    _studentData = ref<{ [key: string]: StudentProps }>({});
    _itemsData = ref<Record<string, ResourceProps>>({});
    _equipmentData = ref<Record<string, ResourceProps>>({});
    _giftData = ref<Record<string, ResourceProps>>({});
    _boxData = ref<Record<string, ResourceProps>>({});
    _favoredGift = ref<Record<string, GiftProps[]>>({});
    _allGifts = ref<Record<string, GiftProps[]>>({});
    _giftBoxData = ref<Record<string, GiftProps[]>>({});
    _searchQuery = ref<string>('');
    _pinnedStudentIds = ref<string[]>([]);
    _currentTheme = ref<ThemeId>('dark');
    _currentSort = ref<SortOption>('id');
    _sortDirection = ref<SortDirection>('asc');
    _isPinnedMode = ref<boolean>(false);
    _activeFilters = ref<StudentFilters>({ ...EMPTY_FILTERS });
    _isLoading = ref<boolean>(true);
    _isReady = ref<boolean>(false);

    _availableSchools = computed(() => {
      const schools = new Set<string>();
      for (const s of Object.values(_studentData.value)) {
        if (s.School) schools.add(s.School);
      }
      return [...schools].sort((a, b) =>
        resolveLocalized('School', a).localeCompare(resolveLocalized('School', b))
      );
    });

    _splitStudents = computed(() => {
      return splitAndSortStudents({
        students: filterSecondaryStudents(Object.values(_studentData.value)),
        pinnedStudentIds: _pinnedStudentIds.value,
        searchQuery: _searchQuery.value,
        sortOption: _currentSort.value,
        sortDirection: _sortDirection.value,
        isPinnedMode: _isPinnedMode.value,
        studentStore: studentDataStore.value,
        resolveLocalized,
        filters: _activeFilters.value,
      });
    });

    // Concatenated owned + unowned for modal prev/next navigation
    _sortedStudentsArray = computed(() => [
      ..._splitStudents.value.owned,
      ..._splitStudents.value.unowned,
    ]);
  }

  // Watch for language changes and load the new language (only once).
  // Debounced 200ms so a rapid toggle burst only triggers one coordinated load.
  if (!_isInitialized) {
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
  }

  // Initialize data only once
  if (!_isInitialized && !_initPromise) {
    _initPromise = initializeData().then(() => {
      _isInitialized = true;
    });
  }

  return {
    studentData: _studentData,
    giftData: _giftData,
    boxData: _boxData,
    itemsData: _itemsData,
    equipmentData: _equipmentData,
    favoredGift: _favoredGift,
    allGifts: _allGifts,
    giftBoxData: _giftBoxData,
    searchQuery: _searchQuery,
    currentTheme: _currentTheme,
    sortedStudentsArray: _sortedStudentsArray,
    ownedStudentsArray:   computed(() => _splitStudents.value.owned),
    unownedStudentsArray: computed(() => _splitStudents.value.unowned),
    setTheme,
    setSortOption,
    currentSort: _currentSort,
    sortDirection: _sortDirection,
    updateSearchQuery,
    toggleDirection,
    syncPinnedStudents,
    reinitializeData,
    isPinnedMode: _isPinnedMode,
    togglePinnedMode: () => {
      _isPinnedMode.value = !_isPinnedMode.value;
      updateSetting('isPinnedMode', _isPinnedMode.value);
    },
    activeFilters: _activeFilters,
    availableSchools: _availableSchools,
    setStudentFilters: (key: keyof StudentFilters, value: StudentFilters[keyof StudentFilters]) => {
      // Replace the whole object so the _splitStudents computed re-runs
      _activeFilters.value = { ..._activeFilters.value, [key]: value };
      updateSetting('studentFilters', _activeFilters.value);
    },
    clearStudentFilters: () => {
      _activeFilters.value = { ...EMPTY_FILTERS };
      updateSetting('studentFilters', { ...EMPTY_FILTERS });
    },
    isFiltersEmpty: () => isFiltersEmpty(_activeFilters.value),
    isLoading: _isLoading,
    isReady: _isReady,
  }
}
