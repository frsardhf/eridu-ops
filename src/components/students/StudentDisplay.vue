<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StudentHeader from './StudentHeader.vue';
import StudentGrid from './StudentGrid.vue';
import StudentModal from '../StudentModal.vue'
import { useStudentData } from '../../consumables/useStudentData';
import '../../styles/studentDisplay.css'

// Use the composable to manage student data
const {
  studentData,
  favoredGift,
  giftBoxData,
  isDarkMode,
  searchQuery,
  filteredStudents,
  toggleTheme
} = useStudentData()

// Modal state
const selectedStudent = ref(null)
const isModalVisible = ref(false)

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

function updateSearchQuery(value) {
  searchQuery.value = value
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
      @update:search-query="updateSearchQuery"
      @toggle-theme="toggleTheme"
    />

    <StudentGrid
      :students="filteredStudents"
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