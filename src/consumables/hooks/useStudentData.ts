import { ref, computed, watch, Ref, ComputedRef } from 'vue'
import { StudentProps, FetchedData } from '../../types/student';
import { SortOption, SortDirection } from '../../types/header';
import { GiftProps } from '../../types/gift';
import {
  ResourceProps,
  GIFT_BOX_IDS
} from '../../types/resource';
import {
  creditsEntry
} from '../constants/syntheticEntities';
import {
  saveItemsInventory,
  getItems,
  getEquipment,
  saveEquipmentInventory,
} from '../utils/studentStorage';
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
import { filterByProperty } from '../utils/filterUtils';
import { resolveLocalized } from '../utils/localizationUtils';
import { sortStudentsWithPins } from '../utils/sortUtils';
import { normalizeTheme } from '../utils/themeUtils';
import { ThemeId } from '@/types/theme';
import { buildGiftsByStudent } from '../utils/giftUtils';
import {
  attachElephIcons,
  createResourceRecordWithSynthetic,
  ensureSyntheticResourceEntries,
  mergeEquipmentWithExisting,
  toNumericResourceRecord,
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
      // Keep reactivity tied to store version updates
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

  // Use local aliases for singleton refs
  const studentData = _studentData;
  const resourceData = _resourceData;
  const equipmentData = _equipmentData;
  const giftData = _giftData;
  const boxData = _boxData;
  const favoredGift = _favoredGift;
  const giftBoxData = _giftBoxData;
  const searchQuery = _searchQuery;
  const pinnedStudentIds = _pinnedStudentIds;
  const currentTheme = _currentTheme;
  const currentSort = _currentSort;
  const sortDirection = _sortDirection;
  const sortedStudentsArray = _sortedStudentsArray;
  const isLoading = _isLoading;
  const isReady = _isReady;

  function syncPinnedStudents() {
    pinnedStudentIds.value = getPinnedStudents();
  }

  // Backward-compatible trigger after pin updates from callers
  function updateSortedStudents() {
    syncPinnedStudents();
  }
  
  // For backward compatibility with code expecting an object
  const filteredStudents = computed<Record<string, StudentProps>>(() => {
    return Object.fromEntries(sortedStudentsArray.value.map(student => 
      [student.Id, student]
    ));
  });
  
  // Load saved preferences from consolidated settings
  function loadSettings() {
    const settings = getSettings();

    const theme = normalizeTheme(settings.theme);
    currentTheme.value = theme;
    currentSort.value = settings.sort.option;
    sortDirection.value = settings.sort.direction;
    syncPinnedStudents();

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Save sort preferences to consolidated settings
  function saveSortPreferences() {
    updateSortSettings(currentSort.value, sortDirection.value);
  }

  // Change the sort option
  function setSortOption(option: SortOption) {
    if (currentSort.value === option) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.value = option;
    }

    saveSortPreferences();
  }
  
  // Toggle sort direction
  function toggleDirection() {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    saveSortPreferences();
  }

  // Toggle theme
  function setTheme(theme: ThemeId) {
    currentTheme.value = theme;
    document.documentElement.setAttribute('data-theme', theme);
    updateSetting('theme', theme);
  }
  
  // Update search query
  function updateSearchQuery(query: string) {
    searchQuery.value = query;
  }

  // Fetch data from SchaleDB
  async function fetchData(type: string) {
    try {
      const lang = currentLanguage.value;
      const url = `https://schaledb.com/data/${lang}/${type}.json`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
      return {};
    }
  }

  // Add new function to fetch all data in parallel
  async function fetchAllData(): Promise<FetchedData> {
    try {
      const [students, items, equipment] = await Promise.all([
        fetchData('students'),
        fetchData('items'),
        fetchData('equipment')
      ]);

      return {
        students,
        items,
        equipment
      };
    } catch (error) {
      console.error('Error fetching all data:', error);
      return {
        students: {},
        items: {},
        equipment: {}
      };
    }
  }

  async function initializeData() {
    try {
      isLoading.value = true;

      // 1. Run migration + prefetch localization in parallel (independent tasks)
      await Promise.all([
        migrateFromLocalStorageToIndexedDB(),
        initializeLocalizationData()
      ]);

      // 2. Load settings from localStorage
      loadSettings();

      // 3. Load cached data from IndexedDB (cache-first for immediate render)
      await loadFromCache();

      // Mark as ready for initial render
      isReady.value = true;
      isLoading.value = false;

      // 4. Check if background refresh is needed (non-blocking)
      const shouldRefresh = await needsRefresh(7); // 7-day cache
      if (shouldRefresh) {
        console.log('Cache is stale, triggering background refresh...');
        refreshSchaleDBData(); // Non-blocking background refresh
      }
    } catch (error) {
      console.error('Error initializing data:', error);
      isLoading.value = false;
      isReady.value = true; // Still mark as ready to prevent blocking
    }
  }

  // Load data from IndexedDB cache
  async function loadFromCache() {
    try {
      const [students, items, equipment] = await Promise.all([
        getAllStudents(),
        getAllItems(),
        getAllEquipment()
      ]);

      // Convert arrays to records
      const studentRecord = toRecordById(students);
      const itemRecord = toRecordById(items);
      const equipmentRecord = toRecordById(equipment);

      // Process and populate reactive refs
      await processAndPopulateData(studentRecord, itemRecord, equipmentRecord);

    } catch (error) {
      console.error('Error loading from cache:', error);
    }
  }

  // Background refresh from SchaleDB API
  async function refreshSchaleDBData() {
    try {
      console.log('Fetching fresh data from SchaleDB...');
      const { students, items, equipment } = await fetchAllData();

      // Save to IndexedDB
      await Promise.all([
        saveStudents(Object.values(students)),
        saveItems(Object.values(items)),
        saveEquipment(Object.values(equipment))
      ]);

      // Update cache metadata
      await updateCacheMetadata();

      // Process and update reactive refs (UI updates)
      await processAndPopulateData(students, items, equipment);

      console.log('Background refresh completed successfully');
    } catch (error) {
      console.error('Background refresh failed:', error);
      // Keep using cached data - no action needed
    }
  }

  // Process fetched/cached data and populate all reactive refs
  async function processAndPopulateData(
    students: Record<string, StudentProps>,
    items: Record<string, ResourceProps>,
    equipment: Record<string, ResourceProps>
  ) {
    // Initialize caches FIRST before any data access
    await initializeAllCaches();

    // Update student data
    studentData.value = attachElephIcons(students, items);

    // Filter gifts and boxes
    giftData.value = filterByProperty(items, 'category', 'Favor');
    boxData.value = filterByProperty(items, 'id', GIFT_BOX_IDS);

    // Calculate gifts by student
    favoredGift.value = buildGiftsByStudent(studentData.value, giftData.value);
    giftBoxData.value = buildGiftsByStudent(studentData.value, boxData.value, {
      isGiftBox: true,
      favoredGiftByStudent: favoredGift.value
    });

    // Handle resources initialization - store ALL items
    const existingResources = await getItems();

    if (!existingResources || Object.keys(existingResources).length === 0) {
      // Initialize with all items including synthetic entities (credits)
      const allItems = createResourceRecordWithSynthetic(items);

      // Save item definitions to items table (including credits)
      await saveItems(Object.values(allItems));

      // Save inventories to resources table
      await saveItemsInventory(allItems);
      resourceData.value = allItems;
    } else {
      // Ensure synthetic entities exist (credits, etc.)
      const resourcesAsNumbers = toNumericResourceRecord(existingResources);
      const {
        resources: normalizedResources,
        addedSynthetic
      } = ensureSyntheticResourceEntries(resourcesAsNumbers);

      if (addedSynthetic) {

        // Save credits definition to items table
        await saveItems([creditsEntry]);

        // Save inventory to resources table
        await saveItemsInventory(normalizedResources);
      }
      resourceData.value = normalizedResources;
    }

    // Handle equipment initialization - store ALL equipment
    const existingEquipments = await getEquipment();

    if (!existingEquipments || Object.keys(existingEquipments).length === 0) {
      await saveEquipmentInventory(equipment);
      equipmentData.value = equipment;
    } else {
      // Merge with existing (preserve QuantityOwned)
      const mergedEquipments = mergeEquipmentWithExisting(equipment, existingEquipments);

      await saveEquipmentInventory(mergedEquipments);
      equipmentData.value = mergedEquipments;
    }

    // Preload student store for card overlays
    await preloadStudentStore();

    // Keep pinned list synced for derived sorting
    syncPinnedStudents();
  }

  // Preload student form data into store for card overlays
  async function preloadStudentStore() {
    try {
      const allFormData = await getAllFormData();
      // Convert string keys to numbers and batch update for better performance
      const numericKeyData: Record<number, any> = {};
      Object.entries(allFormData).forEach(([studentId, formData]) => {
        numericKeyData[Number(studentId)] = formData;
      });
      batchSetStudentData(numericKeyData);
    } catch (error) {
      console.error('Error preloading student store:', error);
    }
  }

  // Function to reinitialize data after language change
  async function reinitializeData() {
    // Force a fresh fetch from SchaleDB API when language changes
    isLoading.value = true;
    try {
      await refreshSchaleDBData();
    } finally {
      isLoading.value = false;
    }
  }

  // Watch for language changes and reinitialize data (only once)
  if (!_isInitialized) {
    watch(
      () => currentLanguage.value,
      () => {
        reinitializeData();
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
    studentData,
    giftData,
    boxData,
    resourceData,
    equipmentData,
    favoredGift,
    giftBoxData,
    searchQuery,
    currentTheme,
    filteredStudents,
    sortedStudentsArray,
    setTheme,
    setSortOption,
    currentSort,
    sortDirection,
    updateSearchQuery,
    toggleDirection,
    updateSortedStudents,
    reinitializeData,
    isLoading,
    isReady,
    refreshSchaleDBData
  }
}
