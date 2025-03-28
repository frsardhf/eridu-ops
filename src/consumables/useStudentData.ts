  import { ref, computed } from 'vue'
  import { StudentProps } from '../types/student';
  import { BoxDataProps, GiftDataProps } from '../types/gift';

  // Constants
  const GENERIC_GIFT_TAGS = ["BC", "Bc", "ew", "DW"];
  const GIFT_BOX_IDS = ['82', '100000', '100008', '100009'];
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
        if (value) { 
          const filtered = filterByProperty(items, type, value);
          results.push(filtered);
        }
      }
      
      return mergeFilteredItems(...results);
    }

    function calculateGiftExp(item, tags: string[]) {
      return item.ExpValue * (1 + Math.min(tags.length, 3));
    }
    
    function getGiftsByStudent(students, items, isGiftBox): Record<string, (GiftDataProps | BoxDataProps)[]> {
      const result: Record<string, (GiftDataProps | BoxDataProps)[]> = {};
      
      for (const studentId in students) {
        const student = students[studentId];
        const uniqueGiftTags = student.FavorItemUniqueTags;
        const rareGiftTags = student.FavorItemTags;
        const allTags = [...uniqueGiftTags, ...rareGiftTags, ...GENERIC_GIFT_TAGS];
        const studentGifts: (GiftDataProps | BoxDataProps)[] = [];
    
        // Calculate highest SR gift exp using favoredGift.value
        let highestExpGift = 0;
        let highestGradeGift = 0;
        let isCollabStudent = false;
        if (isGiftBox) {
          const studentFavoredGifts = favoredGift.value[studentId] || [];
          if (studentFavoredGifts.length == 4) {
            isCollabStudent = true;
          }
          studentFavoredGifts.forEach((gift) => {
            if (gift.gift.Rarity === "SR" && gift.exp > highestExpGift) {
              highestExpGift = gift.exp;
              highestGradeGift = gift.grade;
            }
          });
        }

        for (const itemId in items) {
          const item = items[itemId];
          const genericTagCount = item.Tags.filter(tag => GENERIC_GIFT_TAGS.includes(tag)).length;
          const commonTags = item.Tags.filter(tag => allTags.includes(tag));
          const favorGrade = Math.min(commonTags.length, 3);
    
          if (isGiftBox) {
            const shouldGiftItem = (favorGrade + genericTagCount >= 0);
            let expValue = 0;
            let newFavorGrade = 0;
            
            if (item.Category == 'Consumable') {
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
            
            if (shouldGiftItem) {
              studentGifts.push({
                id: item.Id,
                gift: item,
                exp: expValue,
                grade: newFavorGrade,
              });
            }
          } else {
            // Regular gifts logic
            const genericTagCount = item.Tags.filter(tag => GENERIC_GIFT_TAGS.includes(tag)).length;
            const expValue = item.ExpValue * (1 + Math.min(commonTags.length, 3));
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

    // Usage in initialization
    async function initializeData() {
      // const hasResetStorage = localStorage.getItem('storageReset');
      // if (!hasResetStorage) {
      //   localStorage.clear();
      // }
      studentData.value = await fetchData('students');
      const allItems = await fetchData('items');
      giftData.value = filterByProperty(allItems, 'category', 'Favor');
      boxData.value = filterByProperty(allItems, 'id', GIFT_BOX_IDS);
      materialData.value = applyFilters(allItems, MATERIAL);
      
      // Use the new combined function
      favoredGift.value = getGiftsByStudent(studentData.value, giftData.value, false);
      giftBoxData.value = getGiftsByStudent(studentData.value, boxData.value, true);
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