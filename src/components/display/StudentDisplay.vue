<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStudentData } from '@/lib/hooks/useStudentData';
import { filterSecondaryStudents } from '@/lib/constants/linkedStudents';
import ToolsRail from '@/components/display/ToolsRail.vue';
import BulkModifyStudentsModal from '@/components/display/BulkModifyStudentsModal.vue';
import BondUpdateModal from '@/components/display/BondUpdateModal.vue';
import CraftingFodderModal from '@/components/display/CraftingFodderModal.vue';
import DeckBuilderModal from '@/components/display/DeckBuilderModal.vue';
import GlobalInventoryModal from '@/components/inventory/GlobalInventoryModal.vue';
import StudentNavbar from '@/components/navbar/StudentNavbar.vue';
import { useStudentItems } from '@/lib/hooks/useStudentItems';
import { useStudentEquipment } from '@/lib/hooks/useStudentEquipment';
import StudentGrid from '@/components/display/StudentGrid.vue';
import StudentModal from '@/components/modal/StudentModal.vue'
import { SortOption } from '@/types/header';
import { StudentFilters } from '@/types/filter';
import { ModalOriginRect } from '@/types/modal';
import { StudentProps } from '@/types/student';
import { ThemeId } from '@/types/theme';

const {
  studentData,
  favoredGift,
  giftBoxData,
  currentTheme,
  searchQuery,
  sortedStudentsArray,
  ownedStudentsArray,
  unownedStudentsArray,
  setTheme,
  setSortOption,
  currentSort,
  sortDirection,
  updateSearchQuery,
  toggleDirection,
  syncPinnedStudents,
  reinitializeData,
  isPinnedMode,
  togglePinnedMode,
  activeFilters,
  availableSchools,
  setStudentFilters,
  clearStudentFilters,
} = useStudentData()

const selectedStudent = ref<StudentProps | null>(null)
const isModalVisible = ref(false)
const isBulkModifyModalVisible = ref(false);
const isBondUpdateVisible = ref(false);
const isDeckBuilderVisible = ref(false);
const isInventoryModalVisible = ref(false);
const isCraftingFodderVisible = ref(false);

const inventoryProps = { get isVisible() { return isInventoryModalVisible.value; } };
const { itemFormData, handleItemInput, loadItems } = useStudentItems(inventoryProps);
const { equipmentFormData, handleEquipmentInput, loadEquipments } = useStudentEquipment(inventoryProps);
const modalOriginRect = ref<ModalOriginRect | null>(null);
const allStudentsArray = computed<StudentProps[]>(() => {
  return filterSecondaryStudents(
    Object.values(studentData.value)
  ).sort((a, b) => (a.DefaultOrder ?? a.Id) - (b.DefaultOrder ?? b.Id));
});


// Prepare student for modal
function prepareStudentForModal(student: StudentProps): StudentProps {
  const studentGifts = favoredGift.value[student.Id] || [];
  const studentBoxes = giftBoxData.value[student.Id] || [];

  return {
    ...student,
    Gifts: Array.isArray(studentGifts) ? studentGifts : Object.values(studentGifts),
    Boxes: Array.isArray(studentBoxes) ? studentBoxes : Object.values(studentBoxes),
    ElephIcon: student.ElephIcon || ''
  };
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

function handleUpdateFilter(key: keyof StudentFilters, value: StudentFilters[typeof key]) {
  setStudentFilters(key, value);
}

function handleClearFilters() {
  clearStudentFilters();
}
</script>

<template>
  <div class="student-list-container">
    <StudentNavbar
      :search-query="searchQuery"
      :current-theme="currentTheme"
      :current-sort="currentSort"
      :sort-direction="sortDirection"
      :is-pinned-mode="isPinnedMode"
      :filters="activeFilters"
      :available-schools="availableSchools"
      @update:search-query="handleSearchUpdate"
      @set-theme="handleSetTheme"
      @update-sort="updateSortOption"
      @toggle-direction="handleToggleDirection"
      @data-imported="handleDataImported"
      @reinitialize-data="handleReinitializeData"
      @toggle-pinned="togglePinnedMode"
      @update-filter="handleUpdateFilter"
      @clear-filters="handleClearFilters"
    />

    <ToolsRail
      @open-bulk-modify="isBulkModifyModalVisible = true"
      @open-deck-builder="isDeckBuilderVisible = true"
      @open-inventory="isInventoryModalVisible = true; loadItems(); loadEquipments();"
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
      :resource-form-data="itemFormData"
      :equipment-form-data="equipmentFormData"
      @close="isInventoryModalVisible = false"
      @update-resource="handleItemInput"
      @update-equipment="handleEquipmentInput"
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
