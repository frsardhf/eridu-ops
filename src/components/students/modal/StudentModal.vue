<script setup lang="ts">
import { ref } from 'vue';
import { StudentProps } from '../../../types/student';
import { useStudentModalGift } from '../../../consumables/useStudentModalGift';
import { useStudentModalUpgrade } from '../../../consumables/useStudentModalUpgrade';
import { useStudentModalResource } from '../../../consumables/useStudentModalResource';
import StudentModalHeader from './StudentModalHeader.vue';
import StudentBondSection from './studentBond/StudentBondSection.vue';
import StudentConvertBox from './studentBond/StudentConvertBox.vue';
import StudentGiftGrid from './studentBond/StudentGiftGrid.vue';
import StudentLevelSection from './studentUpgrade/StudentLevelSection.vue';
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
} = useStudentModalGift(props, emit);

const {
  currentCharacterLevel,
  targetCharacterLevel,
  handleCharacterLevelInput,
  handleTargetCharacterLevelInput,
  remainingXp: characterRemainingXp,
  totalCumulativeExp: characterTotalXp,
  // currentStars,
  // targetStars,
  // totalXpNeeded,
  // materialsNeeded,
  // handleLevelInput,
  // handleStarInput
} = useStudentModalUpgrade(props, emit);

const {
  resourceFormData,
  handleResourceInput
} = useStudentModalResource(props, emit);
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
            <!-- Placeholder for your materials grid -->
            <div class="materials-placeholder">
              Materials grid will be displayed here
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