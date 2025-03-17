<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { StudentProps } from '../../types/student'
import StudentCard from './StudentCard.vue';

const props = defineProps<{ students: Record<string, StudentProps> }>();

type EmitFn = (event: 'openModal', student: StudentProps) => void;
const emit = defineEmits<EmitFn>();

function handleOpenModal(student: StudentProps) {
  emit('openModal', student);
}
</script>

<template>
  <div class="student-grid-wrapper">
    <div class="student-grid">
      <StudentCard
        v-for="(student, index) in students"
        :key="index"
        :student="student"
        @click="handleOpenModal(student)"
      />
    </div>
  </div>
</template>
