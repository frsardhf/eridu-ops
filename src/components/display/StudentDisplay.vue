<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useStudentData } from '@/consumables/hooks/useStudentData';
import { getSettings } from '@/consumables/utils/settingsStorage';
import StudentNavbar from '@/components/navbar/StudentNavbar.vue';
import StudentGrid from '@/components/display/StudentGrid.vue';
import StudentModal from '@/components/students/modal/StudentModal.vue'
import { GiftProps } from '@/types/gift';
import { SortOption } from '@/types/header';
import { StudentProps } from '@/types/student';

const {
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
  toggleDirection,
  reinitializeData
} = useStudentData()

const selectedStudent = ref<StudentProps | null>(null)
const isModalVisible = ref(false)

// Prepare student for modal
function prepareStudentForModal(student: StudentProps): StudentProps {
  const studentGifts = favoredGift.value[student.Id] || {};
  const studentBoxes = giftBoxData.value[student.Id] || {};

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

  // ElephIcon should already be part of student data from useStudentData
  return {
    ...student,
    Gifts: giftsObject as GiftProps[],
    Boxes: boxesObject as GiftProps[],
    ElephIcon: student.ElephIcon || ''
  };
}

// Event handlers
function openModal(student: StudentProps) {
  selectedStudent.value = prepareStudentForModal(student);
  isModalVisible.value = true;
}

function closeModal() {
  isModalVisible.value = false;
  selectedStudent.value = null;
}

function handleNavigate(student: StudentProps) {
  selectedStudent.value = prepareStudentForModal(student);
}

function handleSearchUpdate(value: string) {
  updateSearchQuery(value);
}

function updateSortOption(option: SortOption) {
  setSortOption(option);
}

function handleToggleDirection() {
  toggleDirection();
}

function handleStudentPinned() {
  sortedStudentsArray.value = [...sortedStudentsArray.value];
}

function handleDataImported() {
  console.log('Data imported successfully, page will reload to apply changes');
  // The actual reload is handled in the StudentNavbar component
}

async function handleReinitializeData() {
  await reinitializeData();
}

onMounted(() => {
  const settings = getSettings();
  if (settings.theme) {
    isDarkMode.value = settings.theme === 'dark';
    document.documentElement.setAttribute('data-theme', settings.theme);
  }
})
</script>

<template>
  <div class="student-list-container">
    <StudentNavbar
      :search-query="searchQuery"
      :is-dark-mode="isDarkMode"
      :current-sort="currentSort"
      :sort-direction="sortDirection"
      @update:search-query="handleSearchUpdate"
      @toggle-theme="toggleTheme"
      @update-sort="updateSortOption"
      @toggle-direction="handleToggleDirection"
      @data-imported="handleDataImported"
      @reinitialize-data="handleReinitializeData"
    />

    <StudentGrid
      :students-array="sortedStudentsArray"
      :key="`${currentSort}-${sortDirection}-${searchQuery}`"
      @open-modal="openModal"
      @student-pinned="handleStudentPinned"
    />

    <StudentModal 
      v-if="isModalVisible && selectedStudent" 
      :student="selectedStudent" 
      :isVisible="isModalVisible"
      :studentsArray="sortedStudentsArray"
      @close="closeModal"
      @navigate="handleNavigate"
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
