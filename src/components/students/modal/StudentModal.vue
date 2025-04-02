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

const activeTab = ref('bond'); // 'bond' or 'upgrade'
const resourceView = ref('input'); // 'input' or 'summary'

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
  toggleMaxTargetSkills
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
              :potential-levels="potentialLevels"
              @update-current-potential="handleCurrentPotentialInput"
              @update-target-potential="handleTargetPotentialInput"
              @update-potential="handlePotentialUpdate"
            />
            
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
            
            <StudentMaterialsSection
              :skill-materials="skillMaterialsNeeded || []"
              :potential-materials="potentialMaterialsNeeded || []"
            />
          </div>
        </div>

        <!-- Resources Tab -->
        <div v-if="activeTab === 'resources'">
          <div class="resources-tabs">
            <button 
              :class="['resource-tab-button', { active: resourceView === 'input' }]" 
              @click="resourceView = 'input'"
            >
              Input Resources
            </button>
            <button 
              :class="['resource-tab-button', { active: resourceView === 'summary' }]" 
              @click="resourceView = 'summary'"
            >
              Resource Summary
            </button>
          </div>
          
          <div class="resources-placeholder">
            <StudentResourceGrid
              v-if="resourceView === 'input'"
              :student="student"
              :resource-form-data="resourceFormData"
              @update-resource="handleResourceInput"
            />
            <StudentResourceSummary
              v-else
            />
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

.resources-tabs {
  display: flex;
  margin-bottom: 10px;
}

.resource-tab-button {
  padding: 8px 15px;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.resource-tab-button:first-child {
  border-top-left-radius: 2px;
  border-bottom-left-radius: 2px;
}

.resource-tab-button:last-child {
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
}

.resource-tab-button.active {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}
</style>