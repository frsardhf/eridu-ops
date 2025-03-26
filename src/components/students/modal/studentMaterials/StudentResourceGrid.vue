<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { StudentProps } from '../../../../types/student';
import StudentResourceCard from './StudentResourceCard.vue';

const props = defineProps<{
  student: StudentProps | null,
  resourceFormData: Record<string, number>,
}>();

type EmitFn = {
  (e: 'update-resource', id: string, event: Event): void;
}
const emit = defineEmits<EmitFn>();

const currentPage = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const currentX = ref(0);
const slideOffset = ref(0);

const resources = computed(() => {
  if (!props.student) return [];
  return Object.values(props.student.Materials);
});

const totalPages = computed(() => {
  return Math.ceil(resources.value.length / 84); // Show 84 items per page
});

function handleResourceInput(item: any, event: Event) {
  emit('update-resource', item.Id.toString(), event);
}

function handleDragStart(event: MouseEvent | TouchEvent) {
  isDragging.value = true;
  startX.value = 'touches' in event ? event.touches[0].clientX : event.clientX;
  currentX.value = startX.value;
  slideOffset.value = currentPage.value * -100;
}

function handleDragMove(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) return;
  
  event.preventDefault();
  currentX.value = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const diff = currentX.value - startX.value;
  const newOffset = slideOffset.value + (diff / window.innerWidth * 100);
  
  // Limit the drag to the first and last page
  if (newOffset > 0 || newOffset < -(totalPages.value - 1) * 100) return;
  
  slideOffset.value = newOffset;
}

function handleDragEnd() {
  if (!isDragging.value) return;
  isDragging.value = false;
  
  const diff = currentX.value - startX.value;
  const threshold = window.innerWidth * 0.2; // 20% of screen width threshold
  
  if (Math.abs(diff) > threshold) {
    if (diff > 0 && currentPage.value > 0) {
      currentPage.value--;
    } else if (diff < 0 && currentPage.value < totalPages.value - 1) {
      currentPage.value++;
    }
  }
  
  slideOffset.value = currentPage.value * -100;
}

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  window.removeEventListener('mousemove', handleDragMove);
  window.removeEventListener('mouseup', handleDragEnd);
  window.removeEventListener('touchmove', handleDragMove);
  window.removeEventListener('touchend', handleDragEnd);
});
</script>

<template>
  <div class="resources-tab">
    <div class="resources-container">
      <div 
        class="resources-slider" 
        :class="{ 'is-dragging': isDragging }"
        :style="{ transform: `translateX(${slideOffset}%)` }"
        @mousedown="handleDragStart"
        @touchstart="handleDragStart"
        @mousemove="handleDragMove"
        @touchmove="handleDragMove"
        @mouseup="handleDragEnd"
        @touchend="handleDragEnd"
        @mouseleave="handleDragEnd"
      >
        <div 
          v-for="page in totalPages" 
          :key="page"
          class="resources-page"
        >
          <div class="resources-grid">
            <StudentResourceCard 
              v-for="(item) in resources.slice((page - 1) * 84, page * 84)" 
              :key="`resource-${item.Id}`"
              :item="item"
              :value="resourceFormData[item.Id]"
              @update:value="(e) => handleResourceInput(item, e)"
            />
          </div>
        </div>
      </div>
    </div>
    
    <div class="resources-pagination">
      <div class="page-indicator">
        <div 
          v-for="page in totalPages" 
          :key="page"
          class="page-dot"
          :class="{ active: currentPage === page - 1 }"
        ></div>
      </div>
    </div>
  </div>
</template>