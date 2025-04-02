<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { StudentProps } from '../../../types/student'
import StudentCard from './StudentCard.vue';

// Update props to accept the array directly
const props = defineProps<{ 
  studentsArray: StudentProps[]
}>();

type EmitEvents = {
  'openModal': [student: StudentProps];
}

const emit = defineEmits<EmitEvents>();

function handleOpenModal(student: StudentProps) {
  emit('openModal', student);
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
      />
    </div>
  </div>
</template>