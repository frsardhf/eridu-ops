<script setup>
import { ref, onMounted, computed } from 'vue'
import StudentModal from './StudentModal.vue'
import '../styles/studentDisplay.css'

// State variables
const studentData = ref([]);
const giftData = ref([]);
const favoredGift = ref([]);
const giftBoxData = ref([]);
const selectedStudent = ref(null);
const isModalVisible = ref(false); 
const searchQuery = ref('');
const isDarkMode = ref(false);

// Constants
const GENERIC_GIFT_TAGS = ["BC", "Bc", "ew"];
const GIFT_BOX_IDS = ['82', '100000', '100009'];
const GIFT_BOX_EXP_VALUES = {
  'SR': 20,
  'SSR': 120
};

// Computed properties
const filteredStudents = computed(() => {
  if (!searchQuery.value) return studentData.value;
  
  const query = searchQuery.value.toLowerCase();
  return Object.values(studentData.value).filter(student => 
    student.Name.toLowerCase().includes(query)
  );
});

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

function getGiftsByStudent(students, items) {
  const result = {};
  
  for (const studentId in students) {
    const student = students[studentId];
    const uniqueGiftTags = student.FavorItemUniqueTags;
    const rareGiftTags = student.FavorItemTags;
    const allTags = [...uniqueGiftTags, ...rareGiftTags, ...GENERIC_GIFT_TAGS];
    const studentGifts = [];
    
    for (const itemId in items) {
      const item = items[itemId];
      const genericTagCount = item.Tags.filter(tag => GENERIC_GIFT_TAGS.includes(tag)).length;
      const commonTags = item.Tags.filter(tag => allTags.includes(tag));
      const favorGrade = Math.min(commonTags.length, 3);
      const expValue = calculateGiftExp(item, commonTags);
      
      if (favorGrade - genericTagCount > 0) {
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

function getGiftBoxesByStudent(students, items) {
  const result = {};
  
  for (const studentId in students) {
    const studentGifts = [];
    
    for (const itemId in items) {
      const item = items[itemId];
      let expValue = 0;
      let grade = 0;
      if (item.Category == 'Consumable') {
        expValue = GIFT_BOX_EXP_VALUES[item.Rarity] || 0;
        grade = 1;
      }
      
      studentGifts.push({
        gift: item,
        exp: expValue,
        grade: grade  // Base grade
      });
    }
    
    result[studentId] = studentGifts;
  }
  
  return result;
}

function getFontSizeClass(name) {
  return name.length <= 10 ? 'text-normal' : 'text-small';
}

// Event handlers
function openModal(student) {
  selectedStudent.value = {
    ...student,
    Gifts: favoredGift.value[student.Id],
    Boxes: giftBoxData.value[student.Id]
  };
  isModalVisible.value = true;
}

function closeModal() {
  isModalVisible.value = false;
  selectedStudent.value = null;
}

function toggleTheme() {
  const theme = isDarkMode.value ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// API functions
async function fetchItemsByCategory(category) {
  const items = await fetchData('items');
  return filterByCategory(items, category);
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
  
  // Initialize theme from local storage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    isDarkMode.value = savedTheme === 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}

onMounted(initializeData);
</script>

<template>
  <div class="student-list-container">
    <header class="page-header">
      <div class="header-content">
        <div class="header-main">
          <div class="header-title-section">
            <h1 class="header-title">Students</h1>
            <div class="header-divider"></div>
          </div>
          
          <div class="search-section">
            <div class="search-container">
              <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="Search students..."
              />
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>

          <div class="theme-toggle">
            <label class="switch" for="theme-toggle">
              <input 
                id="theme-toggle"
                type="checkbox" 
                v-model="isDarkMode" 
                @change="toggleTheme"
                aria-label="Toggle dark mode"
              >
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </header>

    <div class="student-grid-wrapper">
      <div class="student-grid">
        <div 
          v-for="(student, index) in filteredStudents"
          :key="index"
          class="student-card"
        >
          <a class="selection-grid-card" @click.prevent="openModal(student)">
            <div class="card-img">
              <img 
                :src="`https://schaledb.com/images/student/collection/${student.Id}.webp`"
                :alt="student.Name"
              >
            </div>
            <div class="card-label">
              <span :class="['label-text', getFontSizeClass(student.Name)]">
                {{ student.Name }}
              </span>
            </div>
          </a>
        </div>
      </div>
    </div>

    <StudentModal 
      v-if="isModalVisible" 
      :student="selectedStudent" 
      :isVisible="isModalVisible" 
      @close="closeModal" 
    />
  </div>
</template>