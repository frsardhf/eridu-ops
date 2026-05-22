<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { useStudentData } from '@/lib/hooks/useStudentData';
import { filterSecondaryStudents } from '@/lib/constants/linkedStudents';
import ToolsRail from '@/components/students/ToolsRail.vue';
import BulkModifyStudentsModal from '@/components/students/tools/BulkModifyStudentsModal.vue';
import BondUpdateModal from '@/components/students/tools/BondUpdateModal.vue';
import CraftingFodderModal from '@/components/students/tools/CraftingFodderModal.vue';
import DeckBuilderModal from '@/components/students/tools/DeckBuilderModal.vue';
import GlobalInventoryModal from '@/components/inventory/GlobalInventoryModal.vue';
import SearchNavbar from '@/components/navbar/SearchNavbar.vue';
import StudentGrid from '@/components/students/StudentGrid.vue';
import StudentModal from '@/components/students/modal/StudentModal.vue'
import { SortOption } from '@/types/header';
import { StudentFilters } from '@/types/filter';
import { ModalOriginRect } from '@/types/modal';
import { StudentProps } from '@/types/student';
import { enrichStudentWithGifts } from '@/lib/utils/studentDataHydrationUtils';

const {
  studentData,
  favoredGift,
  giftBoxData,
  searchQuery,
  sortedStudentsArray,
  ownedStudentsArray,
  unownedStudentsArray,
  setSortOption,
  currentSort,
  sortDirection,
  updateSearchQuery,
  toggleDirection,
  syncPinnedStudents,
  isPinnedMode,
  togglePinnedMode,
  activeFilters,
  availableSchools,
  setStudentFilters,
  clearStudentFilters,
  isReady,
} = useStudentData()

const selectedStudent = ref<StudentProps | null>(null)
const isModalVisible = ref(false)
const isBulkModifyModalVisible = ref(false);
const isBondUpdateVisible = ref(false);
const isDeckBuilderVisible = ref(false);
const isInventoryModalVisible = ref(false);
const isCraftingFodderVisible = ref(false);

const modalOriginRect = ref<ModalOriginRect | null>(null);
const allStudentsArray = computed<StudentProps[]>(() => {
  return filterSecondaryStudents(
    Object.values(studentData.value)
  ).sort((a, b) => (a.DefaultOrder ?? a.Id) - (b.DefaultOrder ?? b.Id));
});

// Prepare student for modal — attach favored Gifts/Boxes from the per-student maps.
function prepareStudentForModal(student: StudentProps): StudentProps {
  return enrichStudentWithGifts(student, favoredGift.value, giftBoxData.value);
}

// Event handlers
function openModal(payload: { student: StudentProps; originRect: ModalOriginRect | null }) {
  selectedStudent.value = prepareStudentForModal(payload.student);
  modalOriginRect.value = payload.originRect;
  isModalVisible.value = true;
}

function closeModal() {
  isModalVisible.value = false;
  modalOriginRect.value = null;
  selectedStudent.value = null;
}

function handleNavigate(student: StudentProps) {
  selectedStudent.value = prepareStudentForModal(student);
}

// ── Reverse deep-link from /bonds?focus=<id> back to /students ──────────────
const route = useRoute();
const router = useRouter();

async function openModalFromQuery() {
  const focusParam = route.query.focus;
  const focusId = typeof focusParam === 'string' ? parseInt(focusParam, 10) : NaN;
  if (!Number.isFinite(focusId)) return;

  const student = studentData.value[focusId];
  if (!student) {
    router.replace({ path: '/students', query: {} });
    return;
  }

  await nextTick();
  openModal({ student, originRect: null });
  router.replace({ path: '/students', query: {} });
}

onMounted(() => {
  if (isReady.value) {
    openModalFromQuery();
  } else {
    const stop = watch(isReady, (v) => {
      if (v) {
        stop();
        openModalFromQuery();
      }
    });
  }
});

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
  syncPinnedStudents();
}

function handleUpdateFilter(key: keyof StudentFilters, value: StudentFilters[typeof key]) {
  setStudentFilters(key, value);
}

function handleClearFilters() {
  clearStudentFilters();
}
</script>

<template>
  <div class="student-list-container">
    <SearchNavbar
      :search-query="searchQuery"
      :current-sort="currentSort"
      :sort-direction="sortDirection"
      :is-pinned-mode="isPinnedMode"
      :filters="activeFilters"
      :available-schools="availableSchools"
      @update:search-query="handleSearchUpdate"
      @update-sort="updateSortOption"
      @toggle-direction="handleToggleDirection"
      @toggle-pinned="togglePinnedMode"
      @update-filter="handleUpdateFilter"
      @clear-filters="handleClearFilters"
    />

    <ToolsRail
      @open-bulk-modify="isBulkModifyModalVisible = true"
      @open-deck-builder="isDeckBuilderVisible = true"
      @open-inventory="isInventoryModalVisible = true"
      @open-bond-update="isBondUpdateVisible = true"
      @open-crafting-fodder="isCraftingFodderVisible = true"
    />

    <StudentGrid
      :students-array="ownedStudentsArray"
      :unowned-students-array="unownedStudentsArray"
      :key="`${currentSort}-${sortDirection}-${searchQuery}`"
      @open-modal="openModal"
      @student-pinned="handleStudentPinned"
    />

    <Transition name="student-modal-shell" appear>
      <StudentModal
        v-if="isModalVisible && selectedStudent"
        :student="selectedStudent"
        :origin-rect="modalOriginRect"
        :isVisible="isModalVisible"
        :studentsArray="sortedStudentsArray"
        @close="closeModal"
        @navigate="handleNavigate"
      />
    </Transition>

    <GlobalInventoryModal
      v-if="isInventoryModalVisible"
      @close="isInventoryModalVisible = false"
    />

    <BulkModifyStudentsModal
      v-if="isBulkModifyModalVisible"
      :students="allStudentsArray"
      @close="isBulkModifyModalVisible = false"
    />

    <BondUpdateModal
      v-if="isBondUpdateVisible"
      :students="allStudentsArray"
      @close="isBondUpdateVisible = false"
    />

    <DeckBuilderModal
      v-if="isDeckBuilderVisible"
      :students="allStudentsArray"
      @close="isDeckBuilderVisible = false"
    />

    <CraftingFodderModal
      v-if="isCraftingFodderVisible"
      @close="isCraftingFodderVisible = false"
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
