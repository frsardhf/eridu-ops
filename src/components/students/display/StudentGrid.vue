<script setup lang="ts">
import { defineProps, defineEmits, computed, ref } from 'vue';
import { StudentProps } from '../../../types/student'
import StudentCard from './StudentCard.vue';
import { getPinnedStudents } from '../../../consumables/utils/studentStorage';

// Update props to accept the array directly
const props = defineProps<{ 
  studentsArray: StudentProps[]
}>();

type EmitEvents = {
  'openModal': [student: StudentProps];
  'studentPinned': [studentId: string | number, isPinned: boolean];
}

const emit = defineEmits<EmitEvents>();

// Use a reactive ref to track pinned students
const pinnedStudents = ref<string[]>([]);

// Initialize with data from localStorage
pinnedStudents.value = getPinnedStudents();

// Sort students with pinned ones first
const sortedStudents = computed(() => {
  // Split students into pinned and unpinned
  const pinnedStudentsList: StudentProps[] = [];
  const unpinnedStudentsList: StudentProps[] = [];
  
  props.studentsArray.forEach(student => {
    if (pinnedStudents.value.includes(student.Id.toString())) {
      pinnedStudentsList.push(student);
    } else {
      unpinnedStudentsList.push(student);
    }
  });
  
  // Return pinned students first, then unpinned
  return [...pinnedStudentsList, ...unpinnedStudentsList];
});

function handleOpenModal(student: StudentProps) {
  emit('openModal', student);
}

function handlePinToggled(studentId: string | number, isPinned: boolean) {
  // Update our local pinnedStudents ref for immediate reactivity
  const studentIdStr = studentId.toString();
  
  if (isPinned) {
    // Add to pinned list if not already present
    if (!pinnedStudents.value.includes(studentIdStr)) {
      pinnedStudents.value = [...pinnedStudents.value, studentIdStr];
    }
  } else {
    // Remove from pinned list
    pinnedStudents.value = pinnedStudents.value.filter(id => id !== studentIdStr);
  }
  
  // Emit the event to parent
  emit('studentPinned', studentId, isPinned);
}
</script>

<template>
  <div class="student-grid-wrapper">
    <div class="student-grid">
      <StudentCard
        v-for="student in sortedStudents"
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
    padding: 0 0 4rem 0;
  }
  
  .student-grid {
    grid-template-columns: repeat(auto-fit, 100px);
    gap: 0.75rem;
  }
}
</style>