<script setup lang="ts">
import { ref } from 'vue';
import { StudentProps } from '../../../types/student';
import { useStudentGifts } from '../../../consumables/hooks/useStudentGifts';
import { useStudentUpgrade } from '../../../consumables/hooks/useStudentUpgrade';
import { useStudentResources } from '../../../consumables/hooks/useStudentResources';
import StudentModalHeader from './StudentModalHeader.vue';
import StudentBondSection from './studentBond/StudentBondSection.vue';
import StudentConvertBox from './studentBond/StudentConvertBox.vue';
import StudentGiftGrid from './studentBond/StudentGiftGrid.vue';
import StudentLevelSection from './studentUpgrade/StudentLevelSection.vue';
import StudentPotentialSection from './studentUpgrade/StudentPotentialSection.vue';
import StudentResourceGrid from './studentMaterials/StudentResourceGrid.vue';
import '../../../styles/studentModal.css'

const props = defineProps<{
  student: StudentProps | null,
  isVisible?: boolean
}>();

type EmitFn = (event: 'close') => void;
const emit = defineEmits<EmitFn>();

const activeTab = ref('bond'); // 'bond' or 'upgrade'

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
  potentialMaterials,
  potentialMaterialsNeeded,
  handleCharacterLevelInput,
  handleTargetCharacterLevelInput,
  handleCurrentPotentialInput,
  handleTargetPotentialInput,
  handlePotentialUpdate,
  remainingXp: characterRemainingXp,
  totalCumulativeExp: characterTotalXp,
} = useStudentUpgrade(props, emit);

const {
  resourceFormData,
  handleResourceInput
} = useStudentResources(props, emit);
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <!-- Add tabs -->
      <div class="modal-tabs">
        <button 
          :class="['tab-button', { active: activeTab === 'bond' }]" 
          @click="activeTab = 'bond'"
        >
          Bond Calculator
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'upgrade' }]" 
          @click="activeTab = 'upgrade'"
        >
          Upgrade Materials
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'resources' }]" 
          @click="activeTab = 'resources'"
        >
          Resources
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
            
            <StudentConvertBox
              :convert-box="convertBox"
              @toggle-convert="convertBoxes"
            />
          </div>
          
          <div class="right-column">
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
        
        <!-- Upgrade Materials Tab -->
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
            <StudentPotentialSection
              :current-potential="currentPotentialLevel"
              :target-potential="targetPotentialLevel"
              :materials="potentialMaterialsNeeded"
              @update-current-potential="handleCurrentPotentialInput"
              @update-target-potential="handleTargetPotentialInput"
              @update-potential="handlePotentialUpdate"
            />
            <!-- This will be replaced with actual materials grid later -->
            <div class="materials-placeholder">
              <div class="placeholder-message">
                <p>Upgrade materials calculation is in development</p>
                <p class="note">The potential materials calculator is now available!</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Resources Tab -->
        <div v-if="activeTab === 'resources'">
          <div class="resources-placeholder">
            <StudentResourceGrid
              :student="student"
              :resource-form-data="resourceFormData"
              @update-resource="handleResourceInput"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.materials-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 20px;
  background-color: var(--background-primary);
}

.placeholder-message {
  text-align: center;
  color: var(--text-secondary);
}

.note {
  margin-top: 10px;
  font-size: 0.9em;
  color: var(--accent-color);
}
</style>