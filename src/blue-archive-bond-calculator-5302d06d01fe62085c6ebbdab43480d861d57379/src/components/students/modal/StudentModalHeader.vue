<script setup lang="ts">
import { StudentProps } from '../../../types/student';

const props = defineProps<{
  student: StudentProps | null
}>();

function getFontSizeClass(name: string) {
  return name.length <= 15 ? 'text-xl' : 'text-normal';
}
</script>

<template>
  <div class="student-section">
    <img 
      :src="`https://schaledb.com/images/student/collection/${student!.Id}.webp`"
      :alt="student!.Name"
      class="student-image"
    />
    <h2 
      class="student-name text-xl font-bold" 
      :class="getFontSizeClass(student!.Name)">
      {{ student!.Name }}
    </h2>
  </div>
</template>