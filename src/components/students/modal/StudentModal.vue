<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { ModalProps, StudentProps } from '../../../types/student';
import { useStudentGifts } from '../../../consumables/hooks/useStudentGifts';
import { useStudentUpgrade } from '../../../consumables/hooks/useStudentUpgrade';
import { useStudentResources } from '../../../consumables/hooks/useStudentResources';
import { useStudentEquipment } from '../../../consumables/hooks/useStudentEquipment';
import { useStudentGear } from '../../../consumables/hooks/useStudentGear';
import { initializeStudentFormData } from '../../../consumables/services/studentFormService';
import { setStudentDataDirect } from '../../../consumables/stores/studentStore';
import { $t } from '../../../locales';
import StudentModalHeader from './StudentModalHeader.vue';
import StudentBondSection from './studentBond/StudentBondSection.vue';
import StudentConvertBox from './studentBond/StudentGiftOption.vue';
import StudentGiftGrid from './studentBond/StudentGiftGrid.vue';
import StudentLevelSection from './studentUpgrade/StudentLevelSection.vue';
import StudentPotentialSection from './studentUpgrade/StudentPotentialSection.vue';
import StudentSkillSection from './studentUpgrade/StudentSkillSection.vue';
import StudentMaterialsSection from './studentUpgrade/StudentMaterialsSection.vue';
import StudentEquipmentGrowth from './studentGear/EquipmentGrowthSection.vue';
import StudentGradeGrowth from './studentGear/ExclusiveWeaponSection.vue';
import EquipmentMaterialsSection from './studentGear/EquipmentMaterialsSection.vue';
import ElephEligmaSection from './studentGear/ElephEligmaSection.vue';
import StudentInfoMini from './studentInfo/StudentInfoMini.vue';
import StudentInfoSkills from './studentInfo/StudentInfoSkills.vue';
import StudentInfoGear from './studentInfo/StudentInfoGear.vue';
import StudentStrip from './StudentStrip.vue';
import GlobalInventoryModal from '../../inventory/GlobalInventoryModal.vue';
import '../../../styles/studentModal.css'

const props = defineProps<{
  student: ModalProps | null,
  isVisible?: boolean,
  studentsArray?: StudentProps[]
}>();

type EmitFn = (event: 'close' | 'navigate', payload?: any) => void;
const emit = defineEmits<EmitFn>();

const activeTab = ref('info');
const isInventoryOpen = ref(false);

// Initialize student form data atomically BEFORE composables load
watch([() => props.isVisible, () => props.student], async ([visible, student]) => {
  if (visible && student) {
    const formData = await initializeStudentFormData(student);
    setStudentDataDirect(student.Id, formData);
  }
}, { immediate: true });

const {
  closeModal,
  currentBond,
  newBondLevel,
  remainingXp: bondRemainingXp,
  totalCumulativeExp,
  convertBoxes,
  handleBondInput,
  giftFormData,
  boxFormData,
  handleGiftInput,
  handleBoxInput,
  shouldShowGiftGrade,
  autoFillGifts,
  resetGifts,
  undoChanges
} = useStudentGifts(props, emit);

const {
  characterLevels,
  potentialLevels,
  skillLevels,
  allMaterialsNeeded,
  remainingXp: characterRemainingXp,
  allSkillsMaxed,
  targetSkillsMaxed,
  handleLevelUpdate,
  handlePotentialUpdate,
  handleSkillUpdate,
  toggleMaxAllSkills,
  toggleMaxTargetSkills,
} = useStudentUpgrade(props, emit);

// Keep resource/equipment hooks alive for data persistence
const {
  resourceFormData,
  handleResourceInput
} = useStudentResources(props, emit);

const {
  equipmentFormData,
  handleEquipmentInput
} = useStudentEquipment(props, emit);

const {
  equipmentLevels,
  gradeLevels,
  gradeInfos,
  handleEquipmentUpdate,
  handleGradeUpdate,
  handleGradeInfoUpdate,
  equipmentMaterialsNeeded,
  getElephsForGrade,
} = useStudentGear(props, emit);

// Navigation
function navigateToStudent(student: StudentProps) {
  emit('navigate', student);
}

function navigateToPrevious() {
  if (!props.studentsArray || !props.student || props.studentsArray.length <= 1) return;
  const currentIndex = props.studentsArray.findIndex(s => s.Id === props.student?.Id);
  const previousIndex = currentIndex > 0 ? currentIndex - 1 : props.studentsArray.length - 1;
  emit('navigate', props.studentsArray[previousIndex]);
}

function navigateToNext() {
  if (!props.studentsArray || !props.student || props.studentsArray.length <= 1) return;
  const currentIndex = props.studentsArray.findIndex(s => s.Id === props.student?.Id);
  const nextIndex = currentIndex < props.studentsArray.length - 1 ? currentIndex + 1 : 0;
  emit('navigate', props.studentsArray[nextIndex]);
}

// Inventory modal
function openInventory() {
  isInventoryOpen.value = true;
}

function closeInventory() {
  isInventoryOpen.value = false;
}

// Keyboard
function handleKeyDown(event: KeyboardEvent) {
  if (!props.isVisible) return;

  // If inventory modal is open, Escape closes it first
  if (isInventoryOpen.value) {
    if (event.key === 'Escape') {
      closeInventory();
      event.preventDefault();
    }
    return;
  }

  // Don't hijack arrows when user is typing in an input
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    if (event.key === 'Escape') {
      closeModal();
      event.preventDefault();
    }
    return;
  }

  if (event.key === 'ArrowLeft') {
    navigateToPrevious();
    event.preventDefault();
  } else if (event.key === 'ArrowRight') {
    navigateToNext();
    event.preventDefault();
  } else if (event.key === 'Escape') {
    closeModal();
    event.preventDefault();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div v-if="isVisible" class="fullscreen-modal">
    <!-- TOP ROW: Title + Actions (above tabs) -->
    <div class="modal-header-row">
      <div class="modal-title">
        {{ $t('studentDetails') }}
      </div>
      <div class="modal-header-actions">
        <button class="header-action-btn inventory-btn" @click="openInventory">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/>
          </svg>
          {{ $t('inventory') }}
        </button>
        <button class="header-action-btn close-btn" @click="closeModal" :title="$t('close')">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- TAB BAR (below title row) -->
    <div class="modal-tabs">
      <button
        :class="['tab-button', { active: activeTab === 'info' }]"
        @click="activeTab = 'info'"
      >
        {{ $t('info') }}
      </button>
      <button
        :class="['tab-button', { active: activeTab === 'bond' }]"
        @click="activeTab = 'bond'"
      >
        {{ $t('bond') }}
      </button>
      <button
        :class="['tab-button', { active: activeTab === 'upgrade' }]"
        @click="activeTab = 'upgrade'"
      >
        {{ $t('upgrade') }}
      </button>
      <button
        :class="['tab-button', { active: activeTab === 'gear' }]"
        @click="activeTab = 'gear'"
      >
        {{ $t('gear') }}
      </button>
    </div>

    <!-- MIDDLE: Active Tab Content -->
    <div class="modal-body">
      <div class="modal-grid">
        <!-- Info Tab (default) -->
        <div v-if="activeTab === 'info'" class="tab-content">
          <div class="left-column">
            <StudentModalHeader :student="student" />

            <StudentInfoMini
              :student="student"
              :character-levels="characterLevels"
              :current-bond="currentBond"
              :new-bond-level="newBondLevel"
            />
          </div>

          <div class="right-column">
            <StudentInfoSkills
              :student="student"
              :skill-levels="skillLevels"
            />

            <StudentInfoGear
              :student="student"
              :grade-levels="gradeLevels"
              :equipment-levels="equipmentLevels"
            />
          </div>
        </div>

        <!-- Bond Calculator Tab -->
        <div v-if="activeTab === 'bond'" class="tab-content">
          <div class="left-column">
            <StudentModalHeader :student="student" />

            <StudentBondSection
              :current-bond="currentBond"
              :new-bond-level="newBondLevel"
              :remaining-xp="bondRemainingXp"
              :total-exp="totalCumulativeExp"
              @update-bond="handleBondInput"
            />
          </div>

          <div class="right-column">
            <div class="gift-section">
              <StudentConvertBox
                @toggle-convert="convertBoxes"
                @auto-fill-gift="autoFillGifts"
                @reset-gifts="resetGifts"
                @undo-changes="undoChanges"
              />

              <StudentGiftGrid
                :student="student"
                :gift-form-data="giftFormData"
                :box-form-data="boxFormData"
                :should-show-gift-grade="shouldShowGiftGrade"
                @update-gift="handleGiftInput"
                @update-box="handleBoxInput"
              />
            </div>
          </div>
        </div>

        <!-- Upgrade Level, Skills, Talent Tab -->
        <div v-if="activeTab === 'upgrade'" class="tab-content">
          <div class="left-column">
            <StudentModalHeader :student="student" />

            <StudentLevelSection
              :character-levels="characterLevels"
              :total-xp-needed="characterRemainingXp"
              @update-level="handleLevelUpdate"
            />
          </div>

          <div class="right-column">
            <StudentSkillSection
              :student="student"
              :skill-levels="skillLevels"
              :all-skills-maxed="allSkillsMaxed"
              :target-skills-maxed="targetSkillsMaxed"
              @update-skill="handleSkillUpdate"
              @toggle-max-skills="toggleMaxAllSkills"
              @toggle-max-target="toggleMaxTargetSkills"
            />

            <StudentPotentialSection
              :potential-levels="potentialLevels"
              @update-potential="handlePotentialUpdate"
            />

            <StudentMaterialsSection
              :all-materials="allMaterialsNeeded"
              :student="student"
            />
          </div>
        </div>

        <!-- Upgrade Gear and Unique Equipment Tab -->
        <div v-if="activeTab === 'gear'" class="tab-content">
          <div class="left-column">
            <StudentModalHeader :student="student" />

            <ElephEligmaSection
              :student="student"
              :eleph-needed="getElephsForGrade(gradeLevels.current ?? 1, gradeLevels.target ?? 1, gradeInfos?.owned ?? 0)"
              :grade-infos="gradeInfos"
              @update-info="handleGradeInfoUpdate"
            />
          </div>

          <div class="right-column">
            <StudentEquipmentGrowth
              :student="student"
              :equipment-levels="equipmentLevels"
              @update-equipment="handleEquipmentUpdate"
            />

            <StudentGradeGrowth
              :student="student"
              :grade-levels="gradeLevels"
              @update-grade="handleGradeUpdate"
            />

            <EquipmentMaterialsSection
              :materials="equipmentMaterialsNeeded"
              :student="student"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- BOTTOM: Student Strip -->
    <StudentStrip
      v-if="studentsArray && studentsArray.length > 0"
      :students="studentsArray"
      :active-student-id="student?.Id ?? null"
      @select-student="navigateToStudent"
      @navigate-prev="navigateToPrevious"
      @navigate-next="navigateToNext"
    />

    <!-- Level 2: Global Inventory Modal -->
    <GlobalInventoryModal
      v-if="isInventoryOpen"
      :resource-form-data="resourceFormData"
      :equipment-form-data="equipmentFormData"
      @close="closeInventory"
      @update-resource="handleResourceInput"
      @update-equipment="handleEquipmentInput"
    />
  </div>
</template>

<style scoped>
.fullscreen-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: var(--background-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* TOP ROW: Title + Actions */
.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-primary);
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.15s ease;
}

.header-action-btn:hover {
  background: var(--hover-bg);
  border-color: var(--accent-color);
}

.close-btn {
  padding: 6px 8px;
  border-color: transparent;
  background: transparent;
}

.close-btn:hover {
  background: rgba(255, 80, 80, 0.1);
  color: #ff5050;
  border-color: transparent;
}

/* TAB BAR */
.modal-tabs {
  flex-shrink: 0;
}

/* BODY: Tab content area */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.modal-grid {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.gift-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  background-color: var(--background-primary);
  border-radius: 8px;
  padding: 0 15px 15px 15px;
}

@media (max-width: 576px) {
  .modal-header-row {
    padding: 8px 12px;
  }

  .modal-body {
    padding: 10px;
  }

  .left-column {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .inventory-btn span {
    display: none;
  }
}
</style>
