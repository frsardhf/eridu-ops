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
import StudentSkillSection from './studentUpgrade/StudentSkillSection.vue';
import StudentMaterialsSection from './studentUpgrade/StudentMaterialsSection.vue';
import StudentResourceGrid from './studentMaterials/StudentResourceGrid.vue';
import StudentResourceSummary from './studentMaterials/StudentResourceSummary.vue';
import '../../../styles/studentModal.css'

const props = defineProps<{
  student: StudentProps | null,
  isVisible?: boolean
}>();

type EmitFn = (event: 'close') => void;
const emit = defineEmits<EmitFn>();

const activeTab = ref('bond'); // 'bond', 'upgrade', 'resources', or 'summary'

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
          Bond
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'upgrade' }]" 
          @click="activeTab = 'upgrade'"
        >
          Upgrade
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'resources' }]" 
          @click="activeTab = 'resources'"
        >
          Resources
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
        
        <!-- Summary Tab - Just the resource summary -->
        <div v-if="activeTab === 'summary'">
          <div class="resources-placeholder">
            <StudentResourceSummary />
          </div>
        </div>
      </div>
    </div>
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

@media (max-width: 576px) {
  .left-column {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
}
</style>