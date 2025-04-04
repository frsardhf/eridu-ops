<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StudentHeader from './StudentHeader.vue';
import StudentGrid from './StudentGrid.vue';
import StudentModal from '../modal/StudentModal.vue'
import { useStudentData, SortOption } from '../../../consumables/hooks/useStudentData';
import { StudentProps } from '../../../types/student';
import { ResourceProps } from '../../../types/resource';

// Use the composable to manage student data
const {
  materialData,
  favoredGift,
  giftBoxData,
  isDarkMode,
  searchQuery,
  sortedStudentsArray,
  toggleTheme,
  setSortOption,
  currentSort,
  sortDirection,
  updateSearchQuery,
  toggleDirection
} = useStudentData()

// Modal state
const selectedStudent = ref<StudentProps | null>(null)
const isModalVisible = ref(false)

// Event handlers
function openModal(student: StudentProps) {
  // Convert gifts and boxes arrays to ID-based objects if they're arrays
  const studentGifts = favoredGift.value[student.Id] || {};
  const studentBoxes = giftBoxData.value[student.Id] || {};
  
  // Create objects with gift IDs as keys if they're arrays
  const giftsObject = Array.isArray(studentGifts) 
    ? studentGifts.reduce((acc, gift) => {
        if (gift.gift && gift.gift.Id) {
          acc[gift.gift.Id] = gift;
        }
        return acc;
      }, {})
    : studentGifts;
    
  const boxesObject = Array.isArray(studentBoxes)
    ? studentBoxes.reduce((acc, box) => {
        if (box.gift && box.gift.Id) {
          acc[box.gift.Id] = box;
        }
        return acc;
      }, {})
    : studentBoxes;
  
  // Set the selected student with properly structured gifts and boxes
  selectedStudent.value = {
    ...student,
    Gifts: giftsObject,
    Boxes: boxesObject,
    Materials: materialData.value as ResourceProps[]
  };
  
  isModalVisible.value = true;
}

function closeModal() {
  isModalVisible.value = false;
  selectedStudent.value = null;
}

function handleSearchUpdate(value) {
  updateSearchQuery(value);
}

function updateSortOption(option: SortOption) {
  setSortOption(option);
}

function handleToggleDirection() {
  toggleDirection();
}

onMounted(() => {
  // Initialize theme from local storage
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDarkMode.value = savedTheme === 'dark'
    document.documentElement.setAttribute('data-theme', savedTheme)
  }
})

</script>

<template>
  <div class="student-list-container">
    <StudentHeader
      :search-query="searchQuery"
      :is-dark-mode="isDarkMode"
      :current-sort="currentSort"
      :sort-direction="sortDirection"
      @update:search-query="handleSearchUpdate"
      @toggle-theme="toggleTheme"
      @update-sort="updateSortOption"
      @toggle-direction="handleToggleDirection"
    />

    <StudentGrid
      :students-array="sortedStudentsArray"
      :key="`${currentSort}-${sortDirection}-${searchQuery}`"
      @open-modal="openModal"
    />

    <StudentModal 
      v-if="isModalVisible" 
      :student="selectedStudent" 
      :isVisible="isModalVisible" 
      @close="closeModal" 
    />
  </div>
</template>

<style scoped>
.student-list-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--background-primary);
  display: flex;
  flex-direction: column;
}
</style>