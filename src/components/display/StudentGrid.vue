<script setup lang="ts">
import { ref } from 'vue';
import { StudentProps } from '../../types/student'
import StudentCard from './StudentCard.vue';

const props = defineProps<{ 
  studentsArray: StudentProps[]
}>();

type EmitEvents = {
  'openModal': [student: StudentProps];
  'studentPinned': [studentId: string | number, isPinned: boolean];
  'reorderStudents': [fromId: number, toId: number];
}

const emit = defineEmits<EmitEvents>();
const draggedStudentId = ref<number | null>(null);
const dropTargetStudentId = ref<number | null>(null);

function handleOpenModal(student: StudentProps) {
  emit('openModal', student);
}

function handlePinToggled(studentId: string | number, isPinned: boolean) {
  emit('studentPinned', studentId, isPinned);
}

function handleDragStart(studentId: number, event: DragEvent) {
  draggedStudentId.value = studentId;
  event.dataTransfer?.setData('text/plain', String(studentId));
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function handleDragOver(studentId: number, event: DragEvent) {
  if (draggedStudentId.value == null || draggedStudentId.value === studentId) return;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dropTargetStudentId.value = studentId;
}

function handleDragLeave(studentId: number) {
  if (dropTargetStudentId.value === studentId) {
    dropTargetStudentId.value = null;
  }
}

function handleDrop(studentId: number, event: DragEvent) {
  event.preventDefault();
  const fallbackId = Number(event.dataTransfer?.getData('text/plain'));
  const fromId = draggedStudentId.value ?? (Number.isNaN(fallbackId) ? null : fallbackId);

  if (fromId != null && fromId !== studentId) {
    emit('reorderStudents', fromId, studentId);
  }

  draggedStudentId.value = null;
  dropTargetStudentId.value = null;
}

function handleDragEnd() {
  draggedStudentId.value = null;
  dropTargetStudentId.value = null;
}
</script>

<template>
  <div class="student-grid-wrapper">
    <div class="student-grid">
      <div
        v-for="student in studentsArray"
        :key="student.Id"
        class="student-card-slot"
        :class="{
          dragging: draggedStudentId === student.Id,
          'drop-target': dropTargetStudentId === student.Id
        }"
        draggable="true"
        @dragstart="handleDragStart(student.Id, $event)"
        @dragover="handleDragOver(student.Id, $event)"
        @dragleave="handleDragLeave(student.Id)"
        @drop="handleDrop(student.Id, $event)"
        @dragend="handleDragEnd"
      >
        <StudentCard
          :student="student"
          @click="handleOpenModal(student)"
          @pin-toggled="handlePinToggled"
        />
      </div>
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

.student-card-slot {
  border-radius: 10px;
}

.student-card-slot.dragging {
  opacity: 0.55;
}

.student-card-slot.drop-target {
  box-shadow: 0 0 0 2px var(--accent-color);
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
