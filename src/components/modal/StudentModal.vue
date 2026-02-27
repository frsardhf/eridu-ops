<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { $t } from '@/locales';
import { useStudentEquipment } from '@/consumables/hooks/useStudentEquipment';
import { useStudentGear } from '@/consumables/hooks/useStudentGear';
import { useStudentGifts } from '@/consumables/hooks/useStudentGifts';
import { useStudentItems } from '@/consumables/hooks/useStudentItems';
import { useStudentUpgrade } from '@/consumables/hooks/useStudentUpgrade';
import { initializeStudentFormData } from '@/consumables/services/studentFormService';
import { setStudentDataDirect } from '@/consumables/stores/studentStore';
import GlobalInventoryModal from '@/components/inventory/GlobalInventoryModal.vue';
import BondSection from '@/components/modal/bond/BondSection.vue';
import GiftOption from '@/components/modal/bond/GiftOption.vue';
import GiftGrid from '@/components/modal/bond/GiftGrid.vue';
import EquipmentGrowthSection from '@/components/modal/gear/EquipmentGrowthSection.vue';
import ElephEligmaSection from '@/components/modal/gear/ElephEligmaSection.vue';
import ExclusiveWeaponSection from '@/components/modal/gear/ExclusiveWeaponSection.vue';
import InfoGear from '@/components/modal/info/InfoGear.vue';
import InfoSkills from '@/components/modal/info/InfoSkills.vue';
import InfoWeapon from '@/components/modal/info/InfoWeapon.vue';
import MetaHeader from '@/components/modal/MetaHeader.vue';
import MaterialsSection from '@/components/modal/shared/MaterialsSection.vue';
import LevelSection from '@/components/modal/upgrade/LevelSection.vue';
import PotentialSection from '@/components/modal/upgrade/PotentialSection.vue';
import SkillSection from '@/components/modal/upgrade/SkillSection.vue';
import ModalHeader from '@/components/modal/ModalHeader.vue';
import StudentStrip from '@/components/modal/StudentStrip.vue';
import { StudentProps } from '@/types/student';
import '@/styles/studentModal.css'

const props = defineProps<{
  student: StudentProps,
  isVisible?: boolean,
  studentsArray?: StudentProps[]
}>();

type EmitFn = (event: 'close' | 'navigate', payload?: any) => void;
const emit = defineEmits<EmitFn>();

const activeTab = ref('info');
const isInventoryOpen = ref(false);
const displayedStudent = ref<StudentProps | null>(null);
let hydrateRequestToken = 0;

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
  undoChanges,
  loadFromIndexedDB: loadGiftData,
} = useStudentGifts(props, emit);

const {
  characterLevels,
  potentialLevels,
  skillLevels,
  allMaterialsNeeded,
  remainingXp: characterRemainingXp,
  allSkillsMaxed,
  targetSkillsMaxed,
  allPotentialsMaxed,
  targetPotentialsMaxed,
  handleLevelUpdate,
  handlePotentialUpdate,
  handleSkillUpdate,
  toggleMaxAllSkills,
  toggleMaxTargetSkills,
  toggleMaxAllPotentials,
  toggleMaxTargetPotentials,
  loadFromIndexedDB: loadUpgradeData,
} = useStudentUpgrade(props, emit);

// Keep resource/equipment hooks alive for data persistence
const {
  itemFormData,
  handleItemInput,
  loadItems
} = useStudentItems(props);

const {
  equipmentFormData,
  handleEquipmentInput,
  loadEquipments
} = useStudentEquipment(props);

const {
  equipmentLevels,
  gradeLevels,
  gradeInfos,
  handleEquipmentUpdate,
  handleGradeUpdate,
  handleGradeInfoUpdate,
  equipmentMaterialsNeeded,
  getElephsForGrade,
  allGearsMaxed,
  targetGearsMaxed,
  toggleMaxAllGears,
  toggleMaxTargetGears,
  // Exclusive gear
  exclusiveGearLevel,
  hasExclusiveGear,
  maxUnlockableGearTier,
  handleExclusiveGearUpdate,
  loadFromIndexedDB: loadGearData,
} = useStudentGear(props, emit);

// Centralized hydration flow: initialize defaults once, then load all hook data together.
watch([() => props.isVisible, () => props.student], async ([visible, student]) => {
  if (!visible || !student) return;

  const requestToken = ++hydrateRequestToken;

  try {
    const formData = await initializeStudentFormData(student);
    if (requestToken !== hydrateRequestToken) return;

    setStudentDataDirect(student.Id, formData);

    await Promise.all([
      loadGiftData(),
      loadUpgradeData(),
      loadGearData(),
      loadItems(),
      loadEquipments()
    ]);

    if (requestToken !== hydrateRequestToken) return;
    displayedStudent.value = student;
  } finally {
    // no-op: previous student remains displayed until hydrate completes
  }
}, { immediate: true });

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

    <!-- MIDDLE: Active Tab Content -->
    <div class="modal-body">
      <div v-if="displayedStudent" class="modal-grid">
        <div class="tab-content">
          <div class="left-column">
            <ModalHeader class="student-hero-card" :student="displayedStudent" />
          </div>

          <div
            class="right-column"
            :class="{
              'right-column--scrollable': activeTab === 'upgrade' || activeTab === 'gear' || activeTab === 'bond',
              'right-column--bond': activeTab === 'bond'
            }"
          >
            <MetaHeader
              :student="displayedStudent"
              :character-levels="characterLevels"
              :current-bond="currentBond"
              :new-bond-level="newBondLevel"
            />

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

            <template v-if="activeTab === 'info'">
              <InfoSkills
                :student="displayedStudent"
                :skill-levels="skillLevels"
              />

              <InfoWeapon
                :student="displayedStudent"
                :grade-levels="gradeLevels"
                :equipment-levels="equipmentLevels"
                :exclusive-gear-level="exclusiveGearLevel"
              />

              <InfoGear
                :student="displayedStudent"
                :grade-levels="gradeLevels"
                :equipment-levels="equipmentLevels"
                :exclusive-gear-level="exclusiveGearLevel"
                :has-exclusive-gear="hasExclusiveGear"
              />
            </template>

            <template v-if="activeTab === 'bond'">
              <div class="bond-layout" :class="{ 'bond-layout-max': currentBond === 100 }">
                <div class="bond-top-row">
                  <BondSection
                    class="bond-panel"
                    :class="{ 'bond-panel-full': currentBond === 100 }"
                    :current-bond="currentBond"
                    :new-bond-level="newBondLevel"
                    :remaining-xp="bondRemainingXp"
                    :total-exp="totalCumulativeExp"
                    @update-bond="handleBondInput"
                  />

                  <GiftOption
                    v-if="currentBond < 100"
                    class="bond-options-panel"
                    @toggle-convert="convertBoxes"
                    @auto-fill-gift="autoFillGifts"
                    @reset-gifts="resetGifts"
                    @undo-changes="undoChanges"
                  />
                </div>

                <div v-if="currentBond < 100" class="bond-gift-scroll">
                  <GiftGrid
                    class="bond-gift-grid"
                    :student="displayedStudent"
                    :gift-form-data="giftFormData"
                    :box-form-data="boxFormData"
                    :should-show-gift-grade="shouldShowGiftGrade"
                    @update-gift="handleGiftInput"
                    @update-box="handleBoxInput"
                  />
                </div>
              </div>
            </template>

            <template v-if="activeTab === 'upgrade'">
              <div class="tab-pane-scroll tab-pane-scroll--upgrade">
                <LevelSection
                  class="upgrade-level-panel"
                  :character-levels="characterLevels"
                  :total-xp-needed="characterRemainingXp"
                  @update-level="handleLevelUpdate"
                />

                <SkillSection
                  :student="displayedStudent"
                  :skill-levels="skillLevels"
                  :all-skills-maxed="allSkillsMaxed"
                  :target-skills-maxed="targetSkillsMaxed"
                  @update-skill="handleSkillUpdate"
                  @toggle-max-skills="toggleMaxAllSkills"
                  @toggle-max-target="toggleMaxTargetSkills"
                />

                <PotentialSection
                  :potential-levels="potentialLevels"
                  :all-potentials-maxed="allPotentialsMaxed"
                  :target-potentials-maxed="targetPotentialsMaxed"
                  @update-potential="handlePotentialUpdate"
                  @toggle-max-potentials="toggleMaxAllPotentials"
                  @toggle-max-target-potentials="toggleMaxTargetPotentials"
                />

                <MaterialsSection
                  :materials="allMaterialsNeeded"
                />
              </div>
            </template>

            <template v-if="activeTab === 'gear'">
              <div class="tab-pane-scroll tab-pane-scroll--gear">
                <ElephEligmaSection
                  v-if="(gradeLevels.current ?? 1) < 9"
                  :student="displayedStudent"
                  :eleph-needed="getElephsForGrade(gradeLevels.current ?? 1, gradeLevels.target ?? 1, gradeInfos?.owned ?? 0)"
                  :grade-infos="gradeInfos"
                  @update-info="handleGradeInfoUpdate"
                />

                <EquipmentGrowthSection
                  :student="displayedStudent"
                  :equipment-levels="equipmentLevels"
                  :exclusive-gear-level="exclusiveGearLevel"
                  :has-exclusive-gear="hasExclusiveGear"
                  :max-unlockable-gear-tier="maxUnlockableGearTier"
                  :all-gears-maxed="allGearsMaxed"
                  :target-gears-maxed="targetGearsMaxed"
                  @update-equipment="handleEquipmentUpdate"
                  @update-exclusive-gear="handleExclusiveGearUpdate"
                  @toggle-max-gears="toggleMaxAllGears"
                  @toggle-max-target-gears="toggleMaxTargetGears"
                />

                <ExclusiveWeaponSection
                  :student="displayedStudent"
                  :grade-levels="gradeLevels"
                  @update-grade="handleGradeUpdate"
                />

                <MaterialsSection
                  :materials="equipmentMaterialsNeeded"
                  :is-equipment-tab="true"
                />
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- BOTTOM: Student Strip -->
    <StudentStrip
      v-if="studentsArray && studentsArray.length > 0"
      :students="studentsArray"
      :active-student-id="displayedStudent?.Id"
      @select-student="navigateToStudent"
      @navigate-prev="navigateToPrevious"
      @navigate-next="navigateToNext"
    />

    <!-- Level 2: Global Inventory Modal -->
    <GlobalInventoryModal
      v-if="isInventoryOpen"
      :resource-form-data="itemFormData"
      :equipment-form-data="equipmentFormData"
      @close="closeInventory"
      @update-resource="handleItemInput"
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
  font-size: 1.4rem;
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

/* BODY: Tab content area */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 15px 20px;
}

.modal-grid {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}


@media (max-width: 576px) {
  .modal-header-row {
    padding: 8px 12px;
  }

  .modal-body {
    padding: 10px;
  }

  .inventory-btn span {
    display: none;
  }
}
</style>
