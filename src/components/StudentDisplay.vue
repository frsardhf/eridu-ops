<script setup>
import { ref, onMounted, computed } from 'vue'
import StudentModal from './StudentModal.vue'
import '../styles/studentDisplay.css'

const studentData = ref([])
const giftData = ref([])
const filteredGift = ref([])
const genericGiftTags = ["BC", "Bc", "ew"]
const selectedStudent = ref(null);
const isModalVisible = ref(false); 
const searchQuery = ref('')

// Add computed property for filtered students
const filteredStudents = computed(() => {
  if (!searchQuery.value) return studentData.value
  const query = searchQuery.value.toLowerCase()
  return Object.values(studentData.value).filter(student => 
    student.Name.toLowerCase().includes(query)
  )
})


function filterByCategory(items, category) {
  const filteredItems = {}
  for (const itemId in items) {
    if (items[itemId].Category === category) {
      filteredItems[itemId] = items[itemId]
    }
  }
  return filteredItems
}

function getGiftsByStudent(students, items) {
  const result = {};
  
  for (const studentId in students) {
    const uniqueGiftTags = students[studentId].FavorItemUniqueTags;
    const rareGiftTags = students[studentId].FavorItemTags;
    const studentGifts = [];
    
    for (const itemId in items) {
      const allTags = [...uniqueGiftTags, ...rareGiftTags, ...genericGiftTags];
      const genericTagCount = items[itemId].Tags.filter(x => genericGiftTags.includes(x)).length;
      const commonTags = items[itemId].Tags.filter(x => allTags.includes(x));
      const favorGrade = Math.min(commonTags.length, 3);
      const expValue = items[itemId].ExpValue * (1 + Math.min(commonTags.length, 3));
      
      if (favorGrade - genericTagCount > 0) {
        studentGifts.push({
          gift: items[itemId],
          exp: expValue,
          grade: favorGrade + 1
        });
      }
    }
    result[studentId] = studentGifts;
  }
  return result
}

function getFontSizeClass(name) {
  const length = name.length;
  if (length <= 10) return 'text-normal';
  return 'text-small';
}

function openModal(student) {
  selectedStudent.value = student;
  selectedStudent.value.Gifts = filteredGift.value[student.Id];
  isModalVisible.value = true;
}

function closeModal() {
  isModalVisible.value = false;
  selectedStudent.value = null;
}

const fetchData = async (type) => {
  try {
    const url = `https://schaledb.com/data/en/${type}.json`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url}`)
    }
    const data = await response.json()
    if (type === 'items') {
      return filterByCategory(data, 'Favor')
    }
    return data
  } catch (error) {
    console.error('Error fetching data:', error)
    return {}
  }
}

onMounted(async () => {
  studentData.value = await fetchData('students')
  giftData.value = await fetchData('items')
  filteredGift.value = getGiftsByStudent(studentData.value, giftData.value)
})
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
        </div>
      </div>
    </header>

    <div class="student-grid-wrapper">
      <div class="student-grid">
        <div v-for="(student, index) in filteredStudents"
             :key="index"
             class="student-card">
          <a class="selection-grid-card" @click.prevent="openModal(student)">
            <div class="card-img">
              <img :src="`https://schaledb.com/images/student/collection/${student.Id}.webp`"
                   :alt="student.Name">
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