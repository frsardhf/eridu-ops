<script setup lang="ts">
import { computed, ref } from 'vue';
import { StudentProps } from '../../types/student'
import { getPinnedStudents } from '../../consumables/utils/studentStorage';
import StudentCard from './StudentCard.vue';

const props = defineProps<{ 
  studentsArray: StudentProps[]
}>();

type EmitEvents = {
  'openModal': [student: StudentProps];
  'studentPinned': [studentId: string | number, isPinned: boolean];
}

const emit = defineEmits<EmitEvents>();

const pinnedStudents = ref<string[]>([]);
pinnedStudents.value = getPinnedStudents();

// Sort students with pinned ones first
const sortedStudents = computed(() => {
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

// Handle pin toggle by refresh from storage and re-render
function handlePinToggled(studentId: string | number, isPinned: boolean) {
  pinnedStudents.value = getPinnedStudents();
  pinnedStudents.value = [...pinnedStudents.value];
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