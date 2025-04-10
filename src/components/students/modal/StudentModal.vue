<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { ModalProps, StudentProps } from '../../../types/student';
import { useStudentGifts } from '../../../consumables/hooks/useStudentGifts';
import { useStudentUpgrade } from '../../../consumables/hooks/useStudentUpgrade';
import { useStudentResources } from '../../../consumables/hooks/useStudentResources';
import { useResourceCalculation } from '../../../consumables/hooks/useResourceCalculation';
import { useStudentEquipment } from '../../../consumables/hooks/useStudentEquipment';
import { useStudentGear } from '../../../consumables/hooks/useStudentGear';
import StudentModalHeader from './StudentModalHeader.vue';
import StudentBondSection from './studentBond/StudentBondSection.vue';
import StudentConvertBox from './studentBond/StudentConvertBox.vue';
import StudentGiftGrid from './studentBond/StudentGiftGrid.vue';
import StudentLevelSection from './studentUpgrade/StudentLevelSection.vue';
import StudentPotentialSection from './studentUpgrade/StudentPotentialSection.vue';
import StudentSkillSection from './studentUpgrade/StudentSkillSection.vue';
import StudentMaterialsSection from './studentUpgrade/StudentMaterialsSection.vue';
import StudentResourceGrid from './studentMaterials/StudentResourceGrid.vue';
import StudentResourceSummary from './studentMaterials/StudentResourceSummary.vue';
import StudentEquipmentGrid from './studentMaterials/StudentEquipmentGrid.vue';
import StudentEquipmentGrowth from './studentUpgrade/EquipmentGrowthSection.vue';
import EquipmentMaterialsSection from './studentUpgrade/EquipmentMaterialsSection.vue';
import '../../../styles/studentModal.css'

const props = defineProps<{
  student: ModalProps | null,
  isVisible?: boolean,
  studentsArray?: StudentProps[]
}>();

type EmitFn = (event: 'close' | 'navigate', payload?: any) => void;
const emit = defineEmits<EmitFn>();

const activeTab = ref('upgrade'); // 'bond', 'upgrade', 'resources', 'equipment', or 'summary'

const {
  closeModal,
  currentBond,
  newBondLevel,
  remainingXp,
  totalCumulativeExp,
  convertBox,
  convertBoxes,
  handleBondInput,
  giftFormData,
  boxFormData,
  handleGiftInput,
  handleBoxInput,
  shouldShowGiftGrade
} = useStudentGifts(props, emit);

const {
  currentCharacterLevel,
  targetCharacterLevel,
  currentPotentialLevel,
  targetPotentialLevel,
  potentialLevels,
  skillLevels,
  potentialMaterialsNeeded,
  skillMaterialsNeeded,
  handleCharacterLevelInput,
  handleTargetCharacterLevelInput,
  handleCurrentPotentialInput,
  handleTargetPotentialInput,
  handlePotentialUpdate,
  handleSkillUpdate,
  remainingXp: characterRemainingXp,
  totalCumulativeExp: characterTotalXp,
  allSkillsMaxed,
  toggleMaxAllSkills,
  targetSkillsMaxed,
  toggleMaxTargetSkills,
  charExpMaterialsNeeded
} = useStudentUpgrade(props, emit);

const {
  resourceFormData,
  handleResourceInput
} = useStudentResources(props, emit);

// Add equipment hook
const {
  equipmentFormData,
  handleEquipmentInput
} = useStudentEquipment(props, emit);

// Add gear hook for equipment upgrades
const {
  equipmentLevels,
  handleEquipmentUpdate,
  equipmentMaterialsNeeded
} = useStudentGear(props, emit);

// Get the refresh function from useResourceCalculation
const { refreshData } = useResourceCalculation();

// Watch for tab changes to refresh data as needed
watch(activeTab, (newTab) => {
  if (newTab === 'upgrade' || newTab === 'summary' || newTab === 'gear') {
    // Refresh data when switching to tabs that need updated calculation
    refreshData();
  }
});

// Navigation functions
function navigateToPrevious() {
  if (!props.studentsArray || !props.student || props.studentsArray.length <= 1) return;
  
  const currentIndex = props.studentsArray.findIndex(s => s.Id === props.student?.Id);
  // Loop to the last student if at the beginning
  const previousIndex = currentIndex > 0 ? currentIndex - 1 : props.studentsArray.length - 1;
  const previousStudent = props.studentsArray[previousIndex];
  emit('navigate', previousStudent);
}

function navigateToNext() {
  if (!props.studentsArray || !props.student || props.studentsArray.length <= 1) return;
  
  const currentIndex = props.studentsArray.findIndex(s => s.Id === props.student?.Id);
  // Loop to the first student if at the end
  const nextIndex = currentIndex < props.studentsArray.length - 1 ? currentIndex + 1 : 0;
  const nextStudent = props.studentsArray[nextIndex];
  emit('navigate', nextStudent);
}

// Keyboard event handler
function handleKeyDown(event: KeyboardEvent) {
  if (!props.isVisible) return;
  
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

// Setup event listeners
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <!-- Navigation buttons moved outside the modal -->
    <button 
      class="nav-button prev-button" 
      @click="navigateToPrevious"
      v-if="studentsArray && student && studentsArray.length > 1"
      aria-label="Previous student"
      title="Previous student (Left arrow key)"
    >
      <svg class="nav-icon" viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>
    </button>
    
    <div class="modal-content">
      <!-- Add tabs -->
      <div class="modal-tabs">
        <button 
          :class="['tab-button', { active: activeTab === 'bond' }]" 
          @click="activeTab = 'bond'"
        >
          Bond
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'upgrade' }]" 
          @click="activeTab = 'upgrade'"
        >
          Upgrade
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'gear' }]" 
          @click="activeTab = 'gear'"
        >
          Gear
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'resources' }]" 
          @click="activeTab = 'resources'"
        >
          Items
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'equipment' }]" 
          @click="activeTab = 'equipment'"
        >
          Equipment
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'summary' }]" 
          @click="activeTab = 'summary'"
        >
          Summary
        </button>
      </div>

      <div class="modal-grid">
        <!-- Bond Calculator Tab -->
        <div v-if="activeTab === 'bond'" class="tab-content">
          <div class="left-column">
            <StudentModalHeader :student="student" />
            
            <StudentBondSection
              :current-bond="currentBond"
              :new-bond-level="newBondLevel"
              :remaining-xp="remainingXp"
              :total-exp="totalCumulativeExp"
              @update-bond="handleBondInput"
            />
          </div>
          
          <div class="right-column">
            <div class="gift-section">
              <StudentConvertBox
                :convert-box="convertBox"
                @toggle-convert="convertBoxes"
              />
              
              <StudentGiftGrid
                :student="student"
                :gift-form-data="giftFormData"
                :box-form-data="boxFormData"
                :convert-box="convertBox"
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
              :current-level="currentCharacterLevel"
              :target-level="targetCharacterLevel"
              :total-xp-needed="characterRemainingXp"
              @update-level="handleCharacterLevelInput"
              @update-target-level="handleTargetCharacterLevelInput"
            />
          </div>
          
          <div class="right-column">
            <StudentSkillSection
              :student="student"
              :skill-levels="skillLevels || {
                Ex: { current: 1, target: 1 },
                Public: { current: 1, target: 1 },
                Passive: { current: 1, target: 1 },
                ExtraPassive: { current: 1, target: 1 }
              }"
              :materials="skillMaterialsNeeded || []"
              :all-skills-maxed="allSkillsMaxed"
              :target-skills-maxed="targetSkillsMaxed"
              @update-skill="handleSkillUpdate"
              @toggle-max-skills="toggleMaxAllSkills"
              @toggle-max-target="toggleMaxTargetSkills"
            />
            
            <StudentPotentialSection
              :current-potential="currentPotentialLevel"
              :target-potential="targetPotentialLevel"
              :materials="potentialMaterialsNeeded"
              :potential-levels="potentialLevels"
              @update-current-potential="handleCurrentPotentialInput"
              @update-target-potential="handleTargetPotentialInput"
              @update-potential="handlePotentialUpdate"
            />
            
            <StudentMaterialsSection
              :skill-materials="skillMaterialsNeeded || []"
              :potential-materials="potentialMaterialsNeeded || []"
              :exp-materials="charExpMaterialsNeeded || []"
              :student="student"
            />
          </div>
        </div>

        <!-- Upgrade Gear and Unique Equipment Tab -->
        <div v-if="activeTab === 'gear'" class="tab-content">
          <div class="left-column">
            <StudentModalHeader :student="student" />
          </div>
          
          <div class="right-column">
            <StudentEquipmentGrowth
              :student="student"
              :is-visible="isVisible"
              :equipment-levels="equipmentLevels"
              :equipment-materials-needed="equipmentMaterialsNeeded"
              @update-equipment="handleEquipmentUpdate"
              @close="closeModal"
            />
            
            <EquipmentMaterialsSection
              :materials="equipmentMaterialsNeeded"
              :student="student"
            />
          </div>
        </div>

        <!-- Resources Tab - Just the input grid -->
        <div v-if="activeTab === 'resources'">
          <div class="resources-placeholder">
            <StudentResourceGrid
              :student="student"
              :resource-form-data="resourceFormData"
              @update-resource="handleResourceInput"
            />
          </div>
        </div>
        
        <!-- Equipment Tab -->
        <div v-if="activeTab === 'equipment'">
          <div class="resources-placeholder">
            <StudentEquipmentGrid
              :student="student"
              :equipment-form-data="equipmentFormData"
              @update-equipment="handleEquipmentInput"
            />
          </div>
        </div>
        
        <!-- Summary Tab - Just the resource summary -->
        <div v-if="activeTab === 'summary'">
          <div class="resources-placeholder">
            <StudentResourceSummary />
          </div>
        </div>
      </div>
    </div>
    
    <button 
      class="nav-button next-button" 
      @click="navigateToNext"
      v-if="studentsArray && student && studentsArray.length > 1"
      aria-label="Next student"
      title="Next student (Right arrow key)"
    >
      <svg class="nav-icon" viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.resources-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  border-radius: 8px;
  padding: 5px;
  background-color: var(--background-primary);
}

.gift-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  background-color: var(--background-primary);
  border-radius: 8px;
  padding: 0 15px 15px 15px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.nav-button {
  background-color: transparent;
  color: var(--accent-color);
  border: none;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.85;
  z-index: 101;
  position: absolute;
  transform: translateY(-50%);
  top: 50%;
  overflow: hidden;
}

.nav-button::before {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.prev-button {
  left: 20px;
}

.next-button {
  right: 20px;
}

/* Remove the after pseudo-elements that were tied to the circular buttons */
.prev-button::after,
.next-button::after {
  display: none;
}

.nav-icon {
  font-size: 2rem;
  font-weight: bold;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  width: 60px;
  height: 60px;
  transition: transform 0.3s ease;
}

.prev-button:hover .nav-icon {
  transform: translateX(-3px);
}

.next-button:hover .nav-icon {
  transform: translateX(3px);
}

@keyframes subtle-glow {
  0% {
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
  }
  50% {
    filter: drop-shadow(0 2px 15px rgba(85, 128, 233, 0.8));
  }
  100% {
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
  }
}

.modal-overlay:hover .nav-button {
  animation: subtle-glow 2s infinite;
}

@media (max-width: 576px) {
  .left-column {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .nav-button {
    width: 60px;
    height: 60px;
  }
  
  .prev-button {
    left: 10px;
  }
  
  .next-button {
    right: 10px;
  }
  
  .nav-icon {
    font-size: 1.5rem;
    width: 40px;
    height: 40px;
  }
}
</style>