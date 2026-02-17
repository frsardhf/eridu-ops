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
import { studentDataStore, studentDataVersion, batchSetStudentData } from '../stores/studentStore';
import { initializeAllCaches } from '../stores/resourceCacheStore';
import { currentLanguage, initializeLocalizationData } from '../stores/localizationStore';
import { fetchAllData } from '../services/schaleDbFetchService';
import { filterByProperty } from '../utils/filterUtils';
import { resolveLocalized } from '../utils/localizationUtils';
import { sortStudentsWithPins } from '../utils/sortUtils';
import { normalizeTheme } from '../utils/themeUtils';
import { ThemeId } from '@/types/theme';
import { buildGiftsByStudent } from '../utils/giftUtils';
import {
  attachElephIcons,
  hydrateResourceData,
  hydrateEquipmentData,
  toRecordById
} from '../utils/studentDataHydrationUtils';

// Singleton state (shared across all calls)
let _studentData: Ref<{ [key: string]: StudentProps }>;
let _resourceData: Ref<Record<string, ResourceProps>>;
let _equipmentData: Ref<Record<string, ResourceProps>>;
let _giftData: Ref<Record<string, ResourceProps>>;
let _boxData: Ref<Record<string, ResourceProps>>;
let _favoredGift: Ref<Record<string, GiftProps[]>>;
let _giftBoxData: Ref<Record<string, GiftProps[]>>;
let _searchQuery: Ref<string>;
let _pinnedStudentIds: Ref<string[]>;
let _currentTheme: Ref<ThemeId>;
let _currentSort: Ref<SortOption>;
let _sortDirection: Ref<SortDirection>;
let _sortedStudentsArray: ComputedRef<StudentProps[]>;
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
  equipment: Record<string, ResourceProps>
) {
  await initializeAllCaches();

  _studentData.value = attachElephIcons(students, items);

  _giftData.value = filterByProperty(items, 'category', 'Favor');
  _boxData.value = filterByProperty(items, 'id', GIFT_BOX_IDS);

  _favoredGift.value = buildGiftsByStudent(_studentData.value, _giftData.value);
  _giftBoxData.value = buildGiftsByStudent(_studentData.value, _boxData.value, {
    isGiftBox: true,
    favoredGiftByStudent: _favoredGift.value
  });

  _resourceData.value = await hydrateResourceData(items);
  _equipmentData.value = await hydrateEquipmentData(equipment);

  await preloadStudentStore();
  syncPinnedStudents();
}

async function preloadStudentStore() {
  try {
    const allFormData = await getAllFormData();
    const numericKeyData: Record<number, any> = {};
    Object.entries(allFormData).forEach(([studentId, formData]) => {
      numericKeyData[Number(studentId)] = formData;
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

async function reinitializeData() {
  _isLoading.value = true;
  try {
    await refreshSchaleDBData();
  } finally {
    _isLoading.value = false;
  }
}

// --- Composable entry point ---

export function useStudentData() {
  // Initialize refs on first call only
  if (!_studentData) {
    _studentData = ref<{ [key: string]: StudentProps }>({});
    _resourceData = ref<Record<string, ResourceProps>>({});
    _equipmentData = ref<Record<string, ResourceProps>>({});
    _giftData = ref<Record<string, ResourceProps>>({});
    _boxData = ref<Record<string, ResourceProps>>({});
    _favoredGift = ref<Record<string, GiftProps[]>>({});
    _giftBoxData = ref<Record<string, GiftProps[]>>({});
    _searchQuery = ref<string>('');
    _pinnedStudentIds = ref<string[]>([]);
    _currentTheme = ref<ThemeId>('dark');
    _currentSort = ref<SortOption>('id');
    _sortDirection = ref<SortDirection>('asc');
    _isLoading = ref<boolean>(true);
    _isReady = ref<boolean>(false);

    _sortedStudentsArray = computed(() => {
      const _version = studentDataVersion.value;
      void _version;

      return sortStudentsWithPins({
        students: Object.values(_studentData.value),
        pinnedStudentIds: _pinnedStudentIds.value,
        searchQuery: _searchQuery.value,
        sortOption: _currentSort.value,
        sortDirection: _sortDirection.value,
        studentStore: studentDataStore.value,
        resolveLocalized
      });
    });
  }

  // Watch for language changes and reinitialize data (only once)
  if (!_isInitialized) {
    watch(
      () => currentLanguage.value,
      () => { reinitializeData(); }
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
    resourceData: _resourceData,
    equipmentData: _equipmentData,
    favoredGift: _favoredGift,
    giftBoxData: _giftBoxData,
    searchQuery: _searchQuery,
    currentTheme: _currentTheme,
    sortedStudentsArray: _sortedStudentsArray,
    setTheme,
    setSortOption,
    currentSort: _currentSort,
    sortDirection: _sortDirection,
    updateSearchQuery,
    toggleDirection,
    syncPinnedStudents,
    reinitializeData,
    isLoading: _isLoading,
    isReady: _isReady,
  }
}
