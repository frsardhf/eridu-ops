import { ref, computed } from 'vue'
import { StudentProps } from '../types/student';
import { BoxDataProps, GiftDataProps } from '../types/gift';

// Constants
const GENERIC_GIFT_TAGS = ["BC", "Bc", "ew"];
const GIFT_BOX_IDS = ['82', '100000', '100009'];
const GIFT_BOX_NAMES = ['Advanced Fusion Keystone', 'SR Gifts', 'SSR Gifts'];
const GIFT_BOX_EXP_VALUES = {
  'SR': 20,
  'SSR': 120
};
const MATERIAL = {
  'category': "CharacterExpGrowth",
  'subcategory': ["Artifact", "CDItem", "BookItem"],
  'id': ['2000', '2001', '2002']
}

export function useStudentData() {
  const studentData = ref<{ [key: string]: StudentProps }>({});
  const giftData = ref<Record<string, any>>({});
  const boxData = ref<Record<string, any>>({});
  const materialData = ref<Record<string, any>>({});
  const favoredGift = ref<Record<string, any[]>>({});
  const giftBoxData = ref<Record<string, any[]>>({});
  const searchQuery = ref<string>('');
  const isDarkMode = ref<boolean>(false);

  // Computed properties
  const filteredStudents = computed<Record<string, StudentProps>>(() => {
    if (!searchQuery.value) return studentData.value;
  
    const query = searchQuery.value.toLowerCase();
    const filteredArray = Object.values(studentData.value).filter(
      (student: StudentProps) => student.Name.toLowerCase().includes(query)
    );
  
    return Object.fromEntries(filteredArray.map(student => [student.Id, student]));
  });

  // Utility functions
  function filterByProperty(items: Record<string, any>, type: string, value: string | string[]) {
    const filteredItems = {};
    let valueArray: (string | number)[] = Array.isArray(value) ? value : [value];
    
    if (type === 'id') {
      valueArray = valueArray.map(val => Number(val));
    }
    
    for (const itemId in items) {
      if (isItemMatch(items[itemId], type, valueArray)) {
        filteredItems[itemId] = items[itemId];
      }
    }
    
    return filteredItems;
  }

  function isItemMatch(item: any, type: string, valueArray: (string | number)[]): boolean {
    switch (type) {
      case 'category':
        return valueArray.includes(item.Category);
      case 'subcategory':
        return valueArray.includes(item.SubCategory);
      case 'id':
        return valueArray.includes(item.Id);
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

  function applyFilters(items: Record<string, any>, filterObj: Record<string, any>) {
    const results: Record<string, any>[] = [];
    
    for (const [type, value] of Object.entries(filterObj)) {
      if (value) { // Check if the value exists
        const filtered = filterByProperty(items, type, value);
        results.push(filtered);
      }
    }
    
    return mergeFilteredItems(...results);
  }

  function calculateGiftExp(item, tags: string[]) {
    return item.ExpValue * (1 + Math.min(tags.length, 3));
  }
  
  function getGiftsByStudent(students, items): Record<string, GiftDataProps[]> {
    const result: Record<string, GiftDataProps[]> = {};
    
    for (const studentId in students) {
      const student = students[studentId];
      const uniqueGiftTags = student.FavorItemUniqueTags;
      const rareGiftTags = student.FavorItemTags;
      const allTags = [...uniqueGiftTags, ...rareGiftTags, ...GENERIC_GIFT_TAGS];
      const studentGifts: GiftDataProps[] = [];
      
      for (const itemId in items) {
        const item = items[itemId];
        const genericTagCount = item.Tags.filter(tag => GENERIC_GIFT_TAGS.includes(tag)).length;
        const commonTags = item.Tags.filter(tag => allTags.includes(tag));
        const favorGrade = Math.min(commonTags.length, 3);
        const expValue = calculateGiftExp(item, commonTags);
  
        const shouldGiftItem = (favorGrade - genericTagCount > 0) || 
                               (favorGrade >= 2 && item.Tags.length <= 3);
  
        if (shouldGiftItem) {
          studentGifts.push({
            id: item.Id,
            gift: item,
            exp: expValue,
            grade: favorGrade + 1,
          });
        }
      }
      result[studentId] = studentGifts;
    }
    return result;
  }
  
  function getGiftBoxesByStudent(students, items): Record<string, BoxDataProps[]> {
    const result: Record<string, BoxDataProps[]> = {};
    
    for (const studentId in students) {
      const studentGifts: BoxDataProps[] = [];
      
      for (const itemId in items) {
        const item = items[itemId];
        let nameIndex = 0; 
        let expValue = 0;
        let grade = 0;
        
        if (item.Category == 'Consumable') {
          if (item.Rarity === 'SR') {
            nameIndex = 1;
          } else {
            nameIndex = 2;
          }
          expValue = GIFT_BOX_EXP_VALUES[item.Rarity] || 0;
          grade = 1;
        }
        
        studentGifts.push({
          id: item.Id,
          gift: item,
          name: GIFT_BOX_NAMES[nameIndex],
          exp: expValue,
          grade: grade,
        });
      }
      
      result[studentId] = studentGifts;
    }
    
    return result;
  }

  function toggleTheme() {
    isDarkMode.value = !isDarkMode.value
    const theme = isDarkMode.value ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
  
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

  // Initialization
  async function initializeData() {
    const hasResetStorage = localStorage.getItem('storageReset');
    if (!hasResetStorage) {
      localStorage.clear();
    }
    studentData.value = await fetchData('students');
    const allItems = await fetchData('items');
    giftData.value = filterByProperty(allItems, 'category', 'Favor');
    boxData.value = filterByProperty(allItems, 'id', GIFT_BOX_IDS);
    materialData.value = applyFilters(allItems, MATERIAL);
    favoredGift.value = getGiftsByStudent(studentData.value, giftData.value);
    giftBoxData.value = getGiftBoxesByStudent(studentData.value, boxData.value);
  }

  initializeData()

  return {
    studentData,
    giftData,
    boxData,
    materialData,
    favoredGift,
    giftBoxData,
    searchQuery,
    isDarkMode,
    filteredStudents,
    toggleTheme
  }
}