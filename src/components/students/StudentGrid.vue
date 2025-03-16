<script setup>
import { defineProps, defineEmits } from 'vue'
import StudentCard from './StudentCard.vue'

const props = defineProps({
  students: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['openModal'])

function handleOpenModal(student) {
  emit('openModal', student)
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