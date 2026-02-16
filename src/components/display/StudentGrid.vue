<script setup lang="ts">
import { StudentProps } from '../../types/student'
import StudentCard from './StudentCard.vue';

const props = defineProps<{ 
  studentsArray: StudentProps[]
}>();

type EmitEvents = {
  'openModal': [student: StudentProps];
  'studentPinned': [studentId: string | number, isPinned: boolean];
}

const emit = defineEmits<EmitEvents>();

function handleOpenModal(student: StudentProps) {
  emit('openModal', student);
}

function handlePinToggled(studentId: string | number, isPinned: boolean) {
  emit('studentPinned', studentId, isPinned);
}
</script>

<template>
  <div class="student-grid-wrapper">
    <div class="student-grid">
      <StudentCard
        v-for="student in studentsArray"
        :key="student.Id"
        :student="student"
        @click="handleOpenModal(student)"
        @pin-toggled="handlePinToggled"
      />
    </div>
  </div>
</template>

<style scoped>
.student-grid-wrapper {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  padding: 2rem;
}

.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, 150px);
  gap: 1rem;
  justify-content: center;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

/* Media Queries */
@media screen and (max-width: 768px) {
  .student-grid-wrapper {
    padding: 1.5rem 0 4rem 0.5rem;
  }
  
  .student-grid {
    grid-template-columns: repeat(auto-fit, 100px);
    gap: 0.75rem;
  }
}
</style>
