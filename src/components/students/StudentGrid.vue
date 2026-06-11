<script setup lang="ts">
import { StudentProps } from '@/types/student'
import { ModalOriginRect } from '@/types/modal';
import StudentCard from './StudentCard.vue';
import { $t } from '@/locales';

defineProps<{
  studentsArray: StudentProps[];
  unownedStudentsArray?: StudentProps[];
}>();

type EmitEvents = {
  'openModal': [payload: { student: StudentProps; originRect: ModalOriginRect | null }];
}

const emit = defineEmits<EmitEvents>();

function handleOpenModal(payload: { student: StudentProps; originRect: ModalOriginRect | null }) {
  emit('openModal', payload);
}
</script>

<template>
  <div class="student-grid-wrapper">
    <div class="student-grid">
      <div
        v-for="student in studentsArray"
        :key="student.Id"
        class="student-card-slot"
      >
        <StudentCard
          :student="student"
          @click="handleOpenModal"
        />
      </div>

      <template v-if="unownedStudentsArray?.length">
        <div class="not-recruited-banner">{{ $t('ownership.notRecruited') }}</div>
        <div
          v-for="student in unownedStudentsArray"
          :key="student.Id"
          class="student-card-slot"
        >
          <StudentCard
            :student="student"
            @click="handleOpenModal"
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
  position: relative;
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
