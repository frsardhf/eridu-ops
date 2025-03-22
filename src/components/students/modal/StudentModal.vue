<script setup lang="ts">
import { StudentProps } from '../../../types/student';
import { useStudentModal } from '../../../consumables/useStudentModal';
import StudentModalHeader from './StudentModalHeader.vue';
import StudentBondSection from './StudentBondSection.vue';
import StudentConvertBox from './StudentConvertBox.vue';
import StudentGiftGrid from './StudentGiftGrid.vue';
import '../../../styles/studentModal.css'

const props = defineProps<{
  student: StudentProps | null,
  isVisible?: boolean
}>();

type EmitFn = (event: 'close') => void;
const emit = defineEmits<EmitFn>();

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
} = useStudentModal(props, emit);
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-grid">
        <!-- Left Column -->
        <div class="left-column">
          <!-- Student Header Section -->
          <StudentModalHeader 
            :student="student"
          />
          
          <!-- Bond Section -->
          <StudentBondSection 
            :current-bond="currentBond"
            :new-bond-level="newBondLevel"
            :remaining-xp="remainingXp"
            :total-exp="totalCumulativeExp"
            @update-bond="handleBondInput"
          />
          
          <!-- Convert Box Section -->
          <StudentConvertBox 
            :convert-box="convertBox"
            @toggle-convert="convertBoxes"
          />
        </div>
        
        <!-- Right Column - Gifts Grid -->
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
    </div>
  </div>
</template>