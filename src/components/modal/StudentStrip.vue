<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { StudentProps } from '@/types/student';
import { $t } from '@/locales';

const props = defineProps<{
  students: StudentProps[],
  activeStudentId?: number
}>();

const emit = defineEmits<{
  (e: 'select-student', student: StudentProps): void,
  (e: 'navigate-prev'): void,
  (e: 'navigate-next'): void
}>();

const searchQuery = ref('');
const isExpanded = ref(false);
const scrollContainer = ref<HTMLElement | null>(null);

const filteredStudents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return props.students;

  return props.students.filter(student =>
    student.Name.toLowerCase().includes(query)
  );
});

function selectStudent(student: StudentProps) {
  emit('select-student', student);
}

function handleMouseEnter() {
  isExpanded.value = true;
}

function handleMouseLeave() {
  isExpanded.value = false;
}

// Auto-scroll to keep active student visible
watch(() => [props.activeStudentId, isExpanded.value], async () => {
  if (!isExpanded.value) return;
  await nextTick();
  if (!scrollContainer.value || props.activeStudentId == null) return;

  const activeEl = scrollContainer.value.querySelector(
    `[data-student-id="${props.activeStudentId}"]`
  ) as HTMLElement;

  if (activeEl) {
    activeEl.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }
}, { immediate: true });
</script>

<template>
  <div
    class="student-strip-container"
    :class="{ expanded: isExpanded }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Collapsed indicator -->
    <div v-if="!isExpanded" class="strip-indicator">
      <div class="indicator-line"></div>
    </div>

    <!-- Expanded content -->
    <div v-else class="student-strip">
      <!-- Filter row -->
      <div class="strip-filters">
        <input
          type="text"
          class="strip-search"
          :placeholder="$t('searchStudents')"
          v-model="searchQuery"
          @keydown.stop
        />
        <div class="strip-nav-arrows">
          <button class="strip-arrow" @click="emit('navigate-prev')" title="Previous">
            &#10094;
          </button>
          <button class="strip-arrow" @click="emit('navigate-next')" title="Next">
            &#10095;
          </button>
        </div>
      </div>

      <!-- Thumbnails -->
      <div class="strip-thumbnails" ref="scrollContainer">
        <button
          v-for="student in filteredStudents"
          :key="student.Id"
          :data-student-id="student.Id"
          :class="['strip-thumb', { active: student.Id === activeStudentId }]"
          @click="selectStudent(student)"
          :title="student.Name"
        >
          <img
            :src="`https://schaledb.com/images/student/icon/${student.Id}.webp`"
            :alt="student.Name"
            loading="lazy"
            class="thumb-img"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.student-strip-container {
  flex-shrink: 0;
  position: relative;
  transition: all 0.3s ease;
}

/* Collapsed indicator */
.strip-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  padding: 4px 12px;
  background: var(--background-secondary);
  border-top: 1px solid var(--border-color);
  cursor: pointer;
}

.indicator-line {
  width: 60px;
  height: 3px;
  background: var(--border-color);
  border-radius: 2px;
  transition: background 0.2s ease;
}

.student-strip-container:hover .indicator-line {
  background: var(--accent-color);
}

.indicator-text {
  font-size: 0.7rem;
  color: var(--text-secondary);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.student-strip-container:hover .indicator-text {
  opacity: 1;
}

/* Expanded strip */
.student-strip {
  border-top: 1px solid var(--border-color);
  background: var(--background-secondary);
  padding: 10px 12px 12px;
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.strip-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.strip-search {
  flex: 1;
  max-width: 220px;
  padding: 4px 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.8rem;
}

.strip-search:focus {
  border-color: var(--accent-color);
}

.strip-nav-arrows {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.strip-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.strip-arrow:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.strip-arrow svg {
  display: block;
  fill: currentColor;
}

.strip-thumbnails {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
  padding-bottom: 2px;
}

.strip-thumbnails::-webkit-scrollbar {
  height: 4px;
}

.strip-thumbnails::-webkit-scrollbar-track {
  background: transparent;
}

.strip-thumbnails::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.strip-thumb {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  background: var(--background-primary);
  overflow: hidden;
  transition: all 0.15s ease;
}

.strip-thumb:hover {
  border-color: var(--text-secondary);
  transform: scale(1.05);
}

.strip-thumb.active {
  border-color: var(--accent-color);
  box-shadow: 0 0 8px rgba(85, 128, 233, 0.5);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

@media (max-width: 576px) {
  .student-strip {
    padding: 8px 8px 10px;
  }

  .strip-thumb {
    width: 44px;
    height: 44px;
  }

  .strip-search {
    max-width: 150px;
  }
}
</style>
