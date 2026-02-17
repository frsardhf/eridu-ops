<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStudentData } from '@/consumables/hooks/useStudentData';
import { getPinnedStudents } from '@/consumables/utils/settingsStorage';
import StudentNavbar from '@/components/navbar/StudentNavbar.vue';
import StudentGrid from '@/components/display/StudentGrid.vue';
import StudentModal from '@/components/students/modal/StudentModal.vue'
import { GiftProps } from '@/types/gift';
import { SortOption } from '@/types/header';
import { StudentProps } from '@/types/student';
import { ThemeId } from '@/types/theme';

const {
  favoredGift,
  giftBoxData,
  currentTheme,
  searchQuery,
  sortedStudentsArray,
  setTheme,
  setSortOption,
  currentSort,
  sortDirection,
  updateSearchQuery,
  toggleDirection,
  updateSortedStudents,
  reinitializeData
} = useStudentData()

const selectedStudent = ref<StudentProps | null>(null)
const isModalVisible = ref(false)
const isManualOrderActive = ref(false);
const manualOrderedIds = ref<number[]>([]);

const displayStudentsArray = computed<StudentProps[]>(() => {
  const baseStudents = sortedStudentsArray.value;

  if (!isManualOrderActive.value || manualOrderedIds.value.length === 0) {
    return baseStudents;
  }

  const studentsById = new Map<number, StudentProps>(
    baseStudents.map(student => [student.Id, student])
  );
  const orderedStudents: StudentProps[] = [];

  manualOrderedIds.value.forEach(id => {
    const student = studentsById.get(id);
    if (student) {
      orderedStudents.push(student);
      studentsById.delete(id);
    }
  });

  baseStudents.forEach(student => {
    if (studentsById.has(student.Id)) {
      orderedStudents.push(student);
    }
  });

  return orderedStudents;
});

function resetManualOrder() {
  isManualOrderActive.value = false;
  manualOrderedIds.value = [];
}

function isPinned(studentId: number): boolean {
  return getPinnedStudents().includes(String(studentId));
}

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
  resetManualOrder();
  setSortOption(option);
}

function handleToggleDirection() {
  resetManualOrder();
  toggleDirection();
}

function handleStudentPinned() {
  updateSortedStudents();
  resetManualOrder();
}

function handleStudentsReordered(fromId: number, toId: number) {
  if (fromId === toId) return;
  if (isPinned(fromId) !== isPinned(toId)) return;

  const baseIds = (isManualOrderActive.value
    ? [...manualOrderedIds.value]
    : sortedStudentsArray.value.map(student => student.Id));

  const fromIndex = baseIds.indexOf(fromId);
  const toIndex = baseIds.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0) return;

  const [moved] = baseIds.splice(fromIndex, 1);
  baseIds.splice(toIndex, 0, moved);

  manualOrderedIds.value = baseIds;
  isManualOrderActive.value = true;
}

function handleDataImported() {
  console.log('Data imported successfully, page will reload to apply changes');
  // The actual reload is handled in the StudentNavbar component
}

function handleSetTheme(themeId: ThemeId) {
  setTheme(themeId);
}

async function handleReinitializeData() {
  await reinitializeData();
}
</script>

<template>
  <div class="student-list-container">
    <StudentNavbar
      :search-query="searchQuery"
      :current-theme="currentTheme"
      :current-sort="currentSort"
      :sort-direction="sortDirection"
      @update:search-query="handleSearchUpdate"
      @set-theme="handleSetTheme"
      @update-sort="updateSortOption"
      @toggle-direction="handleToggleDirection"
      @data-imported="handleDataImported"
      @reinitialize-data="handleReinitializeData"
    />

    <StudentGrid
      :students-array="displayStudentsArray"
      :key="`${currentSort}-${sortDirection}-${searchQuery}`"
      @open-modal="openModal"
      @student-pinned="handleStudentPinned"
      @reorder-students="handleStudentsReordered"
    />

    <StudentModal 
      v-if="isModalVisible && selectedStudent" 
      :student="selectedStudent" 
      :isVisible="isModalVisible"
      :studentsArray="displayStudentsArray"
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
