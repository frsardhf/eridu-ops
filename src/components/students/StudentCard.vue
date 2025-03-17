<script setup lang="ts">
import { StudentProps } from '../../types/student'

const props = defineProps<{ student: StudentProps}>();

function getFontSizeClass(name: string): string {
  return name.length <= 10 ? 'text-normal' : 'text-small'
}
</script>

<template>
  <div class="student-card">
    <a class="selection-grid-card" @click.prevent>
      <div class="card-img">
        <img 
          :src="`https://schaledb.com/images/student/collection/${student.Id}.webp`"
          :alt="student.Name"
        >
      </div>
      <div class="card-label">
        <span :class="['label-text', getFontSizeClass(student.Name)]">
          {{ student.Name }}
        </span>
      </div>
    </a>
  </div>
</template>