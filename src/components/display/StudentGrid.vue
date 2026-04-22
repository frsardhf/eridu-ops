<script setup lang="ts">
import { StudentProps } from '@/types/student'
import { ModalOriginRect } from '@/types/modal';
import { useDragReorder } from '@/composables/useDragReorder';
import StudentCard from './StudentCard.vue';
import { $t } from '@/locales';

const props = defineProps<{
  studentsArray: StudentProps[];
  unownedStudentsArray?: StudentProps[];
}>();

type EmitEvents = {
  'openModal': [payload: { student: StudentProps; originRect: ModalOriginRect | null }];
  'studentPinned': [studentId: string | number, isPinned: boolean];
  'reorderStudents': [fromId: number, toId: number];
}

const emit = defineEmits<EmitEvents>();

const { onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, isDragging, isDropTarget } =
  useDragReorder<number>((fromId, toId) => emit('reorderStudents', fromId, toId));

function handleOpenModal(payload: { student: StudentProps; originRect: ModalOriginRect | null }) {
  emit('openModal', payload);
}

function handlePinToggled(studentId: string | number, isPinned: boolean) {
  emit('studentPinned', studentId, isPinned);
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
          dragging: isDragging(student.Id),
          'drop-target': isDropTarget(student.Id)
        }"
        draggable="true"
        @dragstart="onDragStart(student.Id, $event)"
        @dragover="onDragOver(student.Id, $event)"
        @dragleave="onDragLeave(student.Id)"
        @drop="onDrop(student.Id)"
        @dragend="onDragEnd"
      >
        <StudentCard
          :student="student"
          @click="handleOpenModal"
          @pin-toggled="handlePinToggled"
        />
      </div>

      <template v-if="unownedStudentsArray?.length">
        <div class="not-recruited-banner">{{ $t('ownership.notRecruited') }}</div>
        <div
          v-for="student in unownedStudentsArray"
          :key="student.Id"
          class="student-card-slot"
          :class="{
            dragging: isDragging(student.Id),
            'drop-target': isDropTarget(student.Id)
          }"
          draggable="true"
          @dragstart="onDragStart(student.Id, $event)"
          @dragover="onDragOver(student.Id, $event)"
          @dragleave="onDragLeave(student.Id)"
          @drop="onDrop(student.Id)"
          @dragend="onDragEnd"
        >
          <StudentCard
            :student="student"
            @click="handleOpenModal"
            @pin-toggled="handlePinToggled"
          />
        </div>
      </template>
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

.not-recruited-banner {
  grid-column: 1 / -1;
  padding: 8px 16px;
  margin: 8px 0 4px;
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-align: center;
  letter-spacing: 0.06em;
}

.student-card-slot.dragging {
  opacity: 0.55;
}

.student-card-slot.drop-target {
  box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb), 0.6);
  animation: drop-pulse 0.9s ease-in-out infinite;
}

@keyframes drop-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb), 0.6);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(var(--accent-color-rgb), 0.2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .student-card-slot.drop-target {
    animation: none;
  }
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
