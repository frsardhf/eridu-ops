<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStudentData } from '@/consumables/hooks/useStudentData';
import { studentDataStore } from '@/consumables/stores/studentStore';
import { filterSecondaryStudents } from '@/consumables/constants/linkedStudents';
import { getPinnedStudents, getManualOrder, setManualOrder } from '@/consumables/utils/settingsStorage';
import ToolsRail from '@/components/display/ToolsRail.vue';
import BulkModifyStudentsModal from '@/components/display/BulkModifyStudentsModal.vue';
import DeckBuilderModal from '@/components/display/DeckBuilderModal.vue';
import GlobalInventoryModal from '@/components/inventory/GlobalInventoryModal.vue';
import StudentNavbar from '@/components/navbar/StudentNavbar.vue';
import { useStudentItems } from '@/consumables/hooks/useStudentItems';
import { useStudentEquipment } from '@/consumables/hooks/useStudentEquipment';
import StudentGrid from '@/components/display/StudentGrid.vue';
import StudentModal from '@/components/modal/StudentModal.vue'
import { GiftProps } from '@/types/gift';
import { SortOption } from '@/types/header';
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
  reinitializeData
} = useStudentData()

const selectedStudent = ref<StudentProps | null>(null)
const isModalVisible = ref(false)
const isBulkModifyModalVisible = ref(false);
const isDeckBuilderVisible = ref(false);
const isInventoryModalVisible = ref(false);

const inventoryProps = { get isVisible() { return isInventoryModalVisible.value; } };
const { itemFormData, handleItemInput, loadItems } = useStudentItems(inventoryProps);
const { equipmentFormData, handleEquipmentInput, loadEquipments } = useStudentEquipment(inventoryProps);
const modalOriginRect = ref<ModalOriginRect | null>(null);
const savedOrder = getManualOrder();
const isManualOrderActive = ref(savedOrder.length > 0);
const manualOrderedIds = ref<number[]>(savedOrder);
const allStudentsArray = computed<StudentProps[]>(() => {
  return filterSecondaryStudents(
    Object.values(studentData.value)
  ).sort((a, b) => (a.DefaultOrder ?? a.Id) - (b.DefaultOrder ?? b.Id));
});

function applyManualOrder(base: StudentProps[]): StudentProps[] {
  if (!isManualOrderActive.value || manualOrderedIds.value.length === 0) return base;

  const byId = new Map<number, StudentProps>(base.map(s => [s.Id, s]));
  const ordered: StudentProps[] = [];

  manualOrderedIds.value.forEach(id => {
    const s = byId.get(id);
    if (s) { ordered.push(s); byId.delete(id); }
  });

  base.forEach(s => { if (byId.has(s.Id)) ordered.push(s); });

  return ordered;
}

const displayOwnedStudents   = computed<StudentProps[]>(() => applyManualOrder(ownedStudentsArray.value));
const displayUnownedStudents = computed<StudentProps[]>(() => applyManualOrder(unownedStudentsArray.value));

function resetManualOrder() {
  isManualOrderActive.value = false;
  manualOrderedIds.value = [];
  setManualOrder([]);
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
  resetManualOrder();
  setSortOption(option);
}

function handleToggleDirection() {
  resetManualOrder();
  toggleDirection();
}

function handleStudentPinned(studentId: string | number) {
  syncPinnedStudents();

  if (!isManualOrderActive.value) return;

  // Move student to group boundary in manual order
  const numericId = Number(studentId);
  const ids = [...manualOrderedIds.value];
  const index = ids.indexOf(numericId);
  if (index < 0) return;

  // Remove from current position
  ids.splice(index, 1);

  // Find boundary: insert right after last pinned student
  const pinnedSet = new Set(getPinnedStudents().map(Number));
  let lastPinnedIndex = -1;
  for (let i = 0; i < ids.length; i++) {
    if (pinnedSet.has(ids[i])) lastPinnedIndex = i;
  }
  ids.splice(lastPinnedIndex + 1, 0, numericId);

  manualOrderedIds.value = ids;
  setManualOrder(ids);
}

function handleStudentsReordered(fromId: number, toId: number) {
  if (fromId === toId) return;
  if (isPinned(fromId) !== isPinned(toId)) return;

  // Block dragging across the recruited / not-recruited boundary
  const isOwnedFn = (id: number) => studentDataStore.value[id]?.isOwned !== false;
  if (isOwnedFn(fromId) !== isOwnedFn(toId)) return;

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
  setManualOrder(baseIds);
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

    <ToolsRail
      @open-bulk-modify="isBulkModifyModalVisible = true"
      @open-deck-builder="isDeckBuilderVisible = true"
      @open-inventory="isInventoryModalVisible = true; loadItems(); loadEquipments();"
    />

    <StudentGrid
      :students-array="displayOwnedStudents"
      :unowned-students-array="displayUnownedStudents"
      :key="`${currentSort}-${sortDirection}-${searchQuery}`"
      @open-modal="openModal"
      @student-pinned="handleStudentPinned"
      @reorder-students="handleStudentsReordered"
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

    <DeckBuilderModal
      v-if="isDeckBuilderVisible"
      :students="allStudentsArray"
      @close="isDeckBuilderVisible = false"
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
