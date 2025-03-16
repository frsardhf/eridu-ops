import { ref, computed } from 'vue'
import { Student } from '../types/student';
import { GiftData } from '../types/gift';

// Constants
const GENERIC_GIFT_TAGS = ["BC", "Bc", "ew"];
const GIFT_BOX_IDS = ['82', '100000', '100009'];
const GIFT_BOX_NAMES = ['Advanced Fusion Keystone', 'SR Gifts', 'SSR Gifts'];
const GIFT_BOX_EXP_VALUES = {
  'SR': 20,
  'SSR': 120
};

export function useStudentData() {
  // State variables
  const studentData = ref<Record<string, Student>>({});
  const giftData = ref<Record<string, any>>({});
  const favoredGift = ref<Record<string, any[]>>({});
  const giftBoxData = ref<Record<string, any[]>>({});
  const searchQuery = ref<string>('');
  const isDarkMode = ref<boolean>(false);

  // Computed properties
  const filteredStudents = computed(() => {
    if (!searchQuery.value) return studentData.value
      
    const query = searchQuery.value.toLowerCase()
    return Object.values(studentData.value).filter((student: Student) => {
      return student.Name.toLowerCase().includes(query)
    })
  })

  // Utility functions
  function filterByCategory(items, category) {
    const filteredItems = {};
    
    for (const itemId in items) {
      if (items[itemId].Category === category) {
        filteredItems[itemId] = items[itemId];
      }
    }
    
    return filteredItems;
  }

  function calculateGiftExp(item, tags) {
    return item.ExpValue * (1 + Math.min(tags.length, 3));
  }
  
  function getGiftsByStudent(students, items): Record<string, GiftData[]> {
    const result: Record<string, GiftData[]> = {};
    
    for (const studentId in students) {
      const student = students[studentId];
      const uniqueGiftTags = student.FavorItemUniqueTags;
      const rareGiftTags = student.FavorItemTags;
      const allTags = [...uniqueGiftTags, ...rareGiftTags, ...GENERIC_GIFT_TAGS];
      const studentGifts: GiftData[] = [];
      
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
            gift: item,
            exp: expValue,
            grade: favorGrade + 1
          });
        }
      }
      result[studentId] = studentGifts;
    }
    return result;
  }
  
  function getGiftBoxesByStudent(students, items): Record<string, GiftData[]> {
    const result: Record<string, GiftData[]> = {};
    
    for (const studentId in students) {
      const studentGifts: GiftData[] = [];
      
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
          gift: item,
          name: GIFT_BOX_NAMES[nameIndex],
          exp: expValue,
          grade: grade  // Base grade
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

  async function fetchGiftBoxes() {
    try {
      const url = 'https://schaledb.com/data/en/items.json';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url}`);
      }
      
      const data = await response.json();
      const giftBoxes = {};
      
      GIFT_BOX_IDS.forEach(id => {
        if (data[id]) {
          giftBoxes[id] = data[id];
        }
      });
      
      return giftBoxes;
    } catch (error) {
      console.error('Error fetching gift boxes:', error);
      return {};
    }
  }
  
  async function fetchData(type) {
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
    studentData.value = await fetchData('students');
    const allItems = await fetchData('items');
    giftData.value = filterByCategory(allItems, 'Favor');
    const giftBoxes = await fetchGiftBoxes();

    favoredGift.value = getGiftsByStudent(studentData.value, giftData.value);
    giftBoxData.value = getGiftBoxesByStudent(studentData.value, giftBoxes);
  }

  initializeData()

  return {
    studentData,
    giftData,
    favoredGift,
    giftBoxData,
    searchQuery,
    isDarkMode,
    filteredStudents,
    toggleTheme
  }
}