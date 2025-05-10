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
  saveStudentData, 
  getResources, 
  getEquipments, 
  saveEquipments, 
  getPinnedStudents,
  setStorageData,
  getStorageData,
  STORAGE_KEYS,
} from '../utils/studentStorage';
import { studentDataStore } from '../stores/studentStore';

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
    
    filteredStudents.forEach((student: StudentProps) => {
      if (pinnedStudents.includes(student.Id.toString())) {
        pinnedStudentsList.push(student);
      } else {
        unpinnedStudentsList.push(student);
      }
    });
    
    [pinnedStudentsList, unpinnedStudentsList].forEach((list) => {
      list.sort((a, b) => {
        let comparison = 0;
        switch (currentSort.value) {
          case 'name':
            comparison = a.Name.localeCompare(b.Name);
            break;
          case 'default':
            comparison = (a.DefaultOrder || 0) - (b.DefaultOrder || 0);
            break;
          case 'bond': {
            // studentStore may not have every student, so default to 0 if missing
            const aBond = studentStore[a.Id]?.bondDetailData?.currentBond ?? 0;
            const bBond = studentStore[b.Id]?.bondDetailData?.currentBond ?? 0;
            comparison = aBond - bBond;
            break;
          }
          case 'level': {
            // studentStore may not have every student, so default to 1 if missing
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
    });

    sortedStudentsArray.value = [...pinnedStudentsList, ...unpinnedStudentsList];
  }
  
  // For backward compatibility with code expecting an object
  const filteredStudents = computed<Record<string, StudentProps>>(() => {
    return Object.fromEntries(sortedStudentsArray.value.map(student => 
      [student.Id, student]
    ));
  });
  
  // Load saved sort preferences
  function loadSortPreferences() {
    const savedSort = getStorageData<SortOption>(STORAGE_KEYS.SORT_OPTION);
    const savedDirection = getStorageData<SortDirection>(STORAGE_KEYS.SORT_DIRECTION);
    
    if (savedSort && ['id', 'name', 'default', 'bond', 'level', 'grade']
      .includes(savedSort)) {
      currentSort.value = savedSort;
    }
    
    if (savedDirection && ['asc', 'desc'].includes(savedDirection)) {
      sortDirection.value = savedDirection;
    }
  }

  // Save sort preferences
  function saveSortPreferences() {
    setStorageData(STORAGE_KEYS.SORT_OPTION, currentSort.value);
    setStorageData(STORAGE_KEYS.SORT_DIRECTION, sortDirection.value);
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
    setStorageData(STORAGE_KEYS.THEME, theme);
  }
  
  // Update search query
  function updateSearchQuery(query: string) {
    searchQuery.value = query;
    updateSortedStudents();
  }

  // Fetch data from SchaleDB
  async function fetchData(type: string) {
    try {
      const url = `https://schaledb.com/data/en/${type}.json`;
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
  function filterByProperty(
    items: Record<string, any>, type: string, value: string | string[]) {
    let valueArray: (string | number)[] = Array.isArray(value) ? value : [value];
    const filteredItems = {};
    
    if (type === 'id' || type === 'tier' || type === 'recipecost') {
      valueArray = valueArray.map(val => Number(val));
    }
    
    for (const itemId in items) {
      if (isItemMatch(items[itemId], type, valueArray)) {
        filteredItems[itemId] = items[itemId];
      }
    }
    
    return filteredItems;
  }

  function isItemMatch(
    item: any, type: string, valueArray: (string | number)[]): boolean {
    switch (type) {
      case 'category':
        return valueArray.includes(item.Category);
      case 'subcategory':
        return valueArray.includes(item.SubCategory);
      case 'id':
        return valueArray.includes(item.Id);
      case 'tier':
        return valueArray.includes(item.Tier);
      case 'recipecost':
        return valueArray.includes(item.RecipeCost);
      default:
        return false;
    }
  }

  function mergeFilteredItems(...objects: Record<string, any>[]) {
    const result: Record<string, any> = {};
    
    for (const obj of objects) {
      for (const key in obj) {
        result[key] = obj[key];
      }
    }
    
    return result;
  }

  function applyFilters(
    items: Record<string, any>, filterObj: Record<string, any>) {
    const results: Record<string, any>[] = [];
    
    for (const [type, value] of Object.entries(filterObj)) {
      if (value) { 
        const filtered = filterByProperty(items, type, value);
        results.push(filtered);
      }
    }
    
    return mergeFilteredItems(...results);
  }

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
    loadSortPreferences();
    
    // Fetch and update reactive refs
    const { students, items, equipment } = await fetchAllData();
    
    studentData.value = students;
    const allItems = items;
    const allEquipments = equipment;
    
    giftData.value = filterByProperty(allItems, 'category', 'Favor');
    boxData.value = filterByProperty(allItems, 'id', GIFT_BOX_IDS);
    
    favoredGift.value = getGiftsByStudent(studentData.value, giftData.value, false);
    giftBoxData.value = getGiftsByStudent(studentData.value, boxData.value, true);
    
    saveStudentData(studentData.value, favoredGift.value, giftBoxData.value);
    
    // Handle resources initialization and credits
    const existingResources = getResources();
    const existingEquipments = getEquipments();

    if (!existingResources) {
      allItems[5] = creditsEntry;
      saveResources(applyFilters(allItems, MATERIAL));
    } else if (!existingResources[5]) {
      existingResources[5] = creditsEntry;
      saveResources(existingResources);
    }

    if (!existingEquipments) {
      saveEquipments(applyFilters(allEquipments, EQUIPMENT));
    } else {
      saveEquipments(existingEquipments);
    }

    materialData.value = existingResources || applyFilters(allItems, MATERIAL);
    equipmentData.value = existingEquipments || applyFilters(allEquipments, EQUIPMENT);

    updateSortedStudents();
  }

  onMounted(() => {
    const savedTheme = getStorageData<string>(STORAGE_KEYS.THEME);
    if (savedTheme) {
      isDarkMode.value = savedTheme === 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  });

  // Watch for changes in studentStore and re-sort when it updates
  watch(
    () => studentDataStore.value,
    () => {
      updateSortedStudents();
    },
    { deep: true }
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
    toggleDirection
  }
}