import { ref, computed, onMounted, watch } from 'vue'
import { StudentProps, FetchedData } from '../../types/student';
import { SortOption, SortDirection } from '../../types/header';
import { GiftProps } from '../../types/gift';
import {
  ResourceProps,
  MATERIAL,
  EQUIPMENT,
  GENERIC_GIFT_TAGS,
  GIFT_BOX_IDS,
  GIFT_BOX_EXP_VALUES,
  creditsEntry
} from '../../types/resource';
import {
  saveResources,
  getResources,
  getEquipments,
  saveEquipments,
} from '../utils/studentStorage';
import {
  getSettings,
  saveSettings,
  getPinnedStudents,
  updateSetting,
  updateSortSettings,
  type AppSettings
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
import { studentDataStore } from '../stores/studentStore';
import { currentLanguage } from '../stores/localizationStore';
import { filterByProperty } from '../utils/filterUtils';

export function useStudentData() {
  const studentData = ref<{ [key: string]: StudentProps }>({});
  const materialData = ref<Record<string, ResourceProps>>({});
  const equipmentData = ref<Record<string, ResourceProps>>({});
  const giftData = ref<Record<string, ResourceProps>>({});
  const boxData = ref<Record<string, ResourceProps>>({});
  const favoredGift = ref<Record<string, GiftProps[]>>({});
  const giftBoxData = ref<Record<string, GiftProps[]>>({});
  const searchQuery = ref<string>('');
  const isDarkMode = ref<boolean>(false);
  const currentSort = ref<SortOption>('id');
  const sortDirection = ref<SortDirection>('asc');
  const sortedStudentsArray = ref<StudentProps[]>([]);
  const isLoading = ref<boolean>(true);
  const isReady = ref<boolean>(false);

  // Function to update the sorted students array
  function updateSortedStudents() {
    let filteredStudents = Object.values(studentData.value);
    const pinnedStudents: string[] = getPinnedStudents();
    const pinnedStudentsList: StudentProps[] = [];
    const unpinnedStudentsList: StudentProps[] = [];
    const studentStore = studentDataStore.value;
    
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filteredStudents = filteredStudents.filter(
        (student: StudentProps) => student.Name.toLowerCase().includes(query)
      );
    }
    
    // First collect all unpinned students (these will be sorted later)
    filteredStudents.forEach((student: StudentProps) => {
      if (!pinnedStudents.includes(student.Id.toString())) {
        unpinnedStudentsList.push(student);
      }
    });
    
    // Then collect pinned students in the exact order they appear in pinnedStudents
    const pinnedStudentsMap = new Map<string, StudentProps>();
    filteredStudents.forEach((student: StudentProps) => {
      if (pinnedStudents.includes(student.Id.toString())) {
        pinnedStudentsMap.set(student.Id.toString(), student);
      }
    });
    
    // Add pinned students to the list in the same order as pinnedStudents array
    pinnedStudents.forEach(id => {
      const student = pinnedStudentsMap.get(id);
      if (student) {
        pinnedStudentsList.push(student);
      }
    });
    
    // Sort only the unpinned students
    unpinnedStudentsList.sort((a, b) => {
      let comparison = 0;
      switch (currentSort.value) {
        case 'name':
          comparison = a.Name.localeCompare(b.Name);
          break;
        case 'default':
          comparison = (a.DefaultOrder || 0) - (b.DefaultOrder || 0);
          break;
        case 'bond': {
          const aBond = studentStore[a.Id]?.bondDetailData?.currentBond ?? 0;
          const bBond = studentStore[b.Id]?.bondDetailData?.currentBond ?? 0;
          comparison = aBond - bBond;
          break;
        }
        case 'level': {
          const aLevel = studentStore[a.Id]?.characterLevels?.current ?? 1;
          const bLevel = studentStore[b.Id]?.characterLevels?.current ?? 1;
          comparison = aLevel - bLevel;
          break;
        }
        case 'grade': {
          const aGrade = studentStore[a.Id]?.gradeLevels?.current ?? a.StarGrade;
          const bGrade = studentStore[b.Id]?.gradeLevels?.current ?? b.StarGrade;
          comparison = aGrade - bGrade;
          break;
        }
        case 'id':
        default:
          comparison = Number(a.Id) - Number(b.Id);
          break;
      }

      return sortDirection.value === 'asc' ? comparison : -comparison;
    });

    sortedStudentsArray.value = [...pinnedStudentsList, ...unpinnedStudentsList];
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

    isDarkMode.value = settings.theme === 'dark';
    currentSort.value = settings.sort.option;
    sortDirection.value = settings.sort.direction;

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', settings.theme);
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
      sortDirection.value = 'asc';
    }

    saveSortPreferences();
    updateSortedStudents();
  }
  
  // Toggle sort direction
  function toggleDirection() {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    saveSortPreferences();
    updateSortedStudents();
  }

  // Toggle theme
  function toggleTheme() {
    isDarkMode.value = !isDarkMode.value
    const theme = isDarkMode.value ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateSetting('theme', theme);
  }
  
  // Update search query
  function updateSearchQuery(query: string) {
    searchQuery.value = query;
    updateSortedStudents();
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

  // Utility functions

  function getGiftsByStudent(
    students: Record<string, StudentProps>, 
    items: Record<string, ResourceProps>, 
    isGiftBox: boolean): Record<string, GiftProps[]> {
    const result: Record<string, GiftProps[]> = {};
    
    for (const studentId in students) {
      const student = students[studentId];
      const allTags = getAllStudentTags(student);
      const studentGifts = isGiftBox 
        ? processGiftBoxItems(studentId, items, allTags)
        : processRegularGiftItems(items, allTags);
      
      result[studentId] = studentGifts;
    }
    
    return result;
  }
  
  function getAllStudentTags(student: StudentProps) {
    const uniqueGiftTags = student.FavorItemUniqueTags;
    const rareGiftTags = student.FavorItemTags;
    return [...uniqueGiftTags, ...rareGiftTags, ...GENERIC_GIFT_TAGS];
  }
  
  function processRegularGiftItems(
    items: Record<string, ResourceProps>, allTags: string[]) {
    const studentGifts: GiftProps[] = [];
    
    for (const itemId in items) {
      const item = items[itemId];
      const giftDetails = evaluateRegularGift(item, allTags);
      
      if (giftDetails.shouldGift) {
        studentGifts.push({
          gift: item,
          exp: giftDetails.expValue,
          grade: giftDetails.favorGrade + 1,
        });
      }
    }
    
    return studentGifts;
  }
  
  function evaluateRegularGift(item: ResourceProps, allTags: string[]) {
    const commonTags = item.Tags.filter((tag: string) => allTags.includes(tag));
    const favorGrade = Math.min(commonTags.length, 3);
    const genericTagCount = countGenericTags(item);
    const expValue = calculateGiftExp(item, commonTags);
    
    const shouldGift = (favorGrade - genericTagCount > 0) ||
      (favorGrade >= 2 && item.Tags.length <= 3);
    
    return { shouldGift, expValue, favorGrade };
  }
  
  function processGiftBoxItems(
    studentId: string, items: Record<string, ResourceProps>, allTags: string[]) {
    const studentGifts: GiftProps[] = [];
    const { 
      highestExpGift, 
      highestGradeGift, 
      isCollabStudent 
    } = getStudentGiftBoxInfo(studentId);
    
    for (const itemId in items) {
      const item = items[itemId];
      const giftDetails = evaluateGiftBoxItem(
        item, 
        allTags, 
        highestExpGift, 
        highestGradeGift, 
        isCollabStudent
      );
      
      if (giftDetails.shouldGift) {
        studentGifts.push({
          gift: item,
          exp: giftDetails.expValue,
          grade: giftDetails.newFavorGrade,
        });
      }
    }
    
    return studentGifts;
  }
  
  function getStudentGiftBoxInfo(studentId: string) {
    let highestExpGift = 0;
    let highestGradeGift = 0;
    let isCollabStudent = false;
    
    const studentFavoredGifts = favoredGift.value[studentId] || [];
    if (studentFavoredGifts.length === 4) {
      isCollabStudent = true;
    }
    
    studentFavoredGifts.forEach((gift) => {
      if (gift.gift.Rarity === "SR" && gift.exp > highestExpGift) {
        highestExpGift = gift.exp;
        highestGradeGift = gift.grade;
      }
    });
    
    return { highestExpGift, highestGradeGift, isCollabStudent };
  }
  
  function evaluateGiftBoxItem(
    item: ResourceProps, allTags: string[], highestExpGift: number, 
    highestGradeGift: number, isCollabStudent: boolean) {
    const commonTags = item.Tags.filter((tag: string) => allTags.includes(tag));
    const favorGrade = Math.min(commonTags.length, 3);
    const genericTagCount = countGenericTags(item);
    const shouldGift = (favorGrade + genericTagCount >= 0);
    
    let expValue = 0;
    let newFavorGrade = 0;
    
    if (item.Category === 'Consumable') {
      expValue = GIFT_BOX_EXP_VALUES[item.Rarity];
      newFavorGrade = favorGrade + genericTagCount + item.Quality - 2;
      
      if (item.Tags.includes('DW')) {
        expValue = highestExpGift || 20;
        newFavorGrade = highestGradeGift;
      }
      
      if (isCollabStudent) {
        newFavorGrade = item.Rarity === "SR" ? 1 : 2;
      }
    }
    
    return { shouldGift, expValue, newFavorGrade };
  }
  
  function countGenericTags(item: ResourceProps) {
    return item.Tags.filter((tag: string) => GENERIC_GIFT_TAGS.includes(tag)).length;
  }
  
  function calculateGiftExp(item: ResourceProps, tags: string[]) {
    return (item.ExpValue ?? 0) * (1 + Math.min(tags.length, 3));
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

      // 1. Run migration once (checks internally if already completed)
      await migrateFromLocalStorageToIndexedDB();

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
      const studentRecord = students.reduce((acc, s) => {
        acc[s.Id] = s;
        return acc;
      }, {} as Record<string, StudentProps>);

      const itemRecord = items.reduce((acc, i) => {
        acc[i.Id] = i;
        return acc;
      }, {} as Record<string, ResourceProps>);

      const equipmentRecord = equipment.reduce((acc, e) => {
        acc[e.Id] = e;
        return acc;
      }, {} as Record<string, ResourceProps>);

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
    // Update student data
    studentData.value = students;

    // Filter gifts and boxes
    giftData.value = filterByProperty(items, 'category', 'Favor');
    boxData.value = filterByProperty(items, 'id', GIFT_BOX_IDS);

    // Calculate gifts by student
    favoredGift.value = getGiftsByStudent(studentData.value, giftData.value, false);
    giftBoxData.value = getGiftsByStudent(studentData.value, boxData.value, true);

    // Add ElephIcons to student data
    Object.entries(studentData.value).forEach(([studentId, student]) => {
      if (items[studentId]?.Icon) {
        studentData.value[studentId].ElephIcon = items[studentId].Icon;
      }
    });

    // Handle resources initialization - store ALL items
    const existingResources = await getResources();

    if (!existingResources || Object.keys(existingResources).length === 0) {
      // Initialize with all items including credits
      const allItems = { ...items };
      allItems[5] = creditsEntry;
      await saveResources(allItems);
      materialData.value = allItems;
    } else {
      // Ensure credits entry exists
      if (!existingResources[5]) {
        existingResources[5] = creditsEntry;
        await saveResources(existingResources);
      }
      materialData.value = existingResources;
    }

    // Handle equipment initialization - store ALL equipment
    const existingEquipments = await getEquipments();

    if (!existingEquipments || Object.keys(existingEquipments).length === 0) {
      await saveEquipments(equipment);
      equipmentData.value = equipment;
    } else {
      // Merge with existing (preserve QuantityOwned)
      const mergedEquipments = { ...equipment };
      Object.keys(existingEquipments).forEach(id => {
        if (mergedEquipments[id]) {
          mergedEquipments[id].QuantityOwned = existingEquipments[id].QuantityOwned || 0;
        } else {
          mergedEquipments[id] = existingEquipments[id];
        }
      });

      await saveEquipments(mergedEquipments);
      equipmentData.value = mergedEquipments;
    }

    // Preload student store for card overlays
    await preloadStudentStore();

    // Update sorted students
    updateSortedStudents();
  }

  // Preload student form data into store for card overlays
  async function preloadStudentStore() {
    try {
      const allFormData = await getAllFormData();
      // Populate the studentStore with all form data
      Object.entries(allFormData).forEach(([studentId, formData]) => {
        studentDataStore.value[studentId] = formData;
      });
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

  onMounted(() => {
    // Settings are already loaded in initializeData
    // No need for separate onMounted logic
  });

  // Watch for changes in studentStore and re-sort when it updates
  watch(
    () => studentDataStore.value,
    () => {
      updateSortedStudents();
    },
    { deep: true }
  );

  // Watch for language changes and reinitialize data
  watch(
    () => currentLanguage.value,
    () => {
      reinitializeData();
    }
  );

  initializeData();

  return {
    studentData,
    giftData,
    boxData,
    materialData,
    equipmentData,
    favoredGift,
    giftBoxData,
    searchQuery,
    isDarkMode,
    filteredStudents,
    sortedStudentsArray,
    toggleTheme,
    setSortOption,
    currentSort,
    sortDirection,
    updateSearchQuery,
    toggleDirection,
    reinitializeData,
    isLoading,
    isReady,
    refreshSchaleDBData
  }
}