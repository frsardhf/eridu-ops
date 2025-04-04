<script setup lang="ts">
import { StudentProps } from '../../../types/student'
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ student: StudentProps}>();

const isMobile = ref(false);

function checkScreenWidth() {
  isMobile.value = window.innerWidth <= 768;
}

onMounted(() => {
  // Initial check
  checkScreenWidth();
  // Add resize listener
  window.addEventListener('resize', checkScreenWidth);
});

onUnmounted(() => {
  // Clean up listener
  window.removeEventListener('resize', checkScreenWidth);
});

function getFontSizeClass(name: string): string {
  // For mobile screens (max-width: 768px)
  if (isMobile.value) {
    if (name.length < 10) {
      return 'text-lg'; 
    } else {
      return 'text-sm'; 
    }
  }
  
  // For desktop screens (normal sizing)
  if (name.length < 10) {
    return 'text-xl'; 
  } else if (name.length <= 15) {
    return 'text-lg'; 
  } else {
    return 'text-normal';
  }
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

<style scoped>
.student-card {
  width: 150px;
}

.selection-grid-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-background);
  box-shadow: 0 2px 4px var(--box-shadow);
  transition: transform 0.2s;
  cursor: pointer;
}

.selection-grid-card:hover {
  transform: translateY(-5px);
}

.card-img {
  width: 150px;
  height: 150px;
  overflow: hidden;
}

.card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-label {
  margin-top: 0;
  padding: 4px;
  text-align: center;
  background-color: var(--card-label-background);
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.label-text {
  line-height: 1;
  width: 100%;
  padding: 0 2px;
  color: var(--text-primary);
}

.label-text:hover {
  color: var(--accent-color);
}

/* Font size classes */
.text-xl {
  font-size: 1.25rem;
}

.text-lg {
  font-size: 1.125rem;
}

.text-normal {
  font-size: 1rem;
}

.text-sm {
  font-size: 0.875rem;
}

@media screen and (max-width: 768px) {
  .student-card {
    width: 100px;
  }

  .card-img {
    width: 100px;
    height: 100px;
  }

  .card-label {
    height: 36px;
  }
}
</style>