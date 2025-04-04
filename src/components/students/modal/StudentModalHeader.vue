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

<style scoped>
.student-section {
  background: var(--card-background);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  align-self: center;
  position: relative;
  overflow: hidden;
}

.student-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
}

.student-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--card-label-background-transparent);
  color: var(--text-primary);
  height: 15%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 10px;
}
</style>