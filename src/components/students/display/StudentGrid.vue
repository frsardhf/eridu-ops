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
  
  // First collect all unpinned students (these will be sorted later)
  props.studentsArray.forEach(student => {
    if (!pinnedStudents.value.includes(student.Id.toString())) {
      unpinnedStudentsList.push(student);
    }
  });
  
  // Then collect pinned students in the exact order they appear in pinnedStudents
  const pinnedStudentsMap = new Map<string, StudentProps>();
  props.studentsArray.forEach(student => {
    if (pinnedStudents.value.includes(student.Id.toString())) {
      pinnedStudentsMap.set(student.Id.toString(), student);
    }
  });
  
  // Add pinned students to the list in the same order as pinnedStudents array
  pinnedStudents.value.forEach(id => {
    const student = pinnedStudentsMap.get(id);
    if (student) {
      pinnedStudentsList.push(student);
    }
  });
  
  // Return pinned students (in pin order) first, then unpinned (in sort order)
  return [...pinnedStudentsList, ...unpinnedStudentsList];
});

function handleOpenModal(student: StudentProps) {
  emit('openModal', student);
}

function handlePinToggled(studentId: string | number, isPinned: boolean) {
  // Update our local pinnedStudents ref for immediate reactivity
  const studentIdStr = studentId.toString();
  
  if (isPinned) {
    // Add newly pinned student to the end of the array
    // This matches the storage utility's behavior
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
    padding: 1.5rem 0 4rem 0.5rem;
  }
  
  .student-grid {
    grid-template-columns: repeat(auto-fit, 100px);
    gap: 0.75rem;
  }
}
</style>