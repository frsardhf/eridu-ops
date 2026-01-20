<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue';
import { ModalProps } from '../../../../types/student';
import StudentResourceCard from './StudentResourceCard.vue';
import { formatLargeNumber } from '../../../../consumables/utils/materialUtils';
import { applyFilters } from '../../../../consumables/utils/filterUtils';
import { EQUIPMENT } from '../../../../types/resource';
import '../../../../styles/resourceDisplay.css';

const props = defineProps<{
  student: ModalProps | null,
  equipmentFormData: Record<string, number>,
}>();

type EmitFn = {
  (e: 'update-equipment', id: string, event: Event): void;
}
const emit = defineEmits<EmitFn>();

const currentPage = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const currentX = ref(0);
const slideOffset = ref(0);
const containerWidth = ref(0);

const equipments = computed(() => {
  if (!props.student) return [];

  // Apply EQUIPMENT filters to show only planner-relevant equipment
  const allEquipments = props.student.Equipments || {};
  const filteredEquipments = applyFilters(allEquipments, EQUIPMENT);

  return Object.values(filteredEquipments);
});

const totalPages = computed(() => {
  return Math.ceil(equipments.value.length / 98); // Show 98 items per page
});

function handleEquipmentInput(item: any, event: Event) {
  emit('update-equipment', item.Id.toString(), event);
}

function handleDragStart(event: MouseEvent | TouchEvent) {
  event.preventDefault();
  isDragging.value = true;
  startX.value = 'touches' in event ? event.touches[0].clientX : event.clientX;
  currentX.value = startX.value;
  slideOffset.value = currentPage.value * -100;
  
  // Add global event listeners for smoother dragging
  if ('touches' in event) {
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  } else {
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }
  
  // Get container width for more accurate threshold calculation
  const container = event.currentTarget as HTMLElement;
  if (container) {
    containerWidth.value = container.offsetWidth;
  }
}

function handleDragMove(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) return;
  
  event.preventDefault();
  currentX.value = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const diff = currentX.value - startX.value;
  
  // Use container width instead of window width for more precise calculations
  const newOffset = slideOffset.value + (diff / (containerWidth.value || window.innerWidth) * 100);
  
  // Limit the drag to the first and last page
  if (newOffset > 0 || newOffset < -(totalPages.value - 1) * 100) return;
  
  slideOffset.value = newOffset;
}

function handleDragEnd() {
  if (!isDragging.value) return;
  isDragging.value = false;
  
  // Remove global event listeners
  window.removeEventListener('mousemove', handleDragMove);
  window.removeEventListener('mouseup', handleDragEnd);
  window.removeEventListener('touchmove', handleDragMove);
  window.removeEventListener('touchend', handleDragEnd);
  
  const diff = currentX.value - startX.value;
  // Lower threshold for desktop - 15% of container width
  const threshold = (containerWidth.value || window.innerWidth) * 0.15; 
  
  if (Math.abs(diff) > threshold) {
    if (diff > 0 && currentPage.value > 0) {
      currentPage.value--;
    } else if (diff < 0 && currentPage.value < totalPages.value - 1) {
      currentPage.value++;
    }
  }
  
  // Smoothly animate to the target page
  slideOffset.value = currentPage.value * -100;
}

// Handle pagination buttons
function goToPage(pageIndex: number) {
  currentPage.value = pageIndex;
  slideOffset.value = currentPage.value * -100;
}

// Add window resize event listener
onMounted(() => {
  window.addEventListener('resize', handleResize);
  // Initial container width
  const container = document.querySelector('.equipment-slider') as HTMLElement;
  if (container) {
    containerWidth.value = container.offsetWidth;
  }
});

// Handle window resize
function handleResize() {
  // Reset any fixed heights and recalculate layout
  slideOffset.value = currentPage.value * -100;
  // Update container width
  const container = document.querySelector('.equipment-slider') as HTMLElement;
  if (container) {
    containerWidth.value = container.offsetWidth;
  }
}

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  window.removeEventListener('mousemove', handleDragMove);
  window.removeEventListener('mouseup', handleDragEnd);
  window.removeEventListener('touchmove', handleDragMove);
  window.removeEventListener('touchend', handleDragEnd);
  window.removeEventListener('resize', handleResize);
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
        @touchstart.passive="handleDragStart"
      >
        <div 
          v-for="page in totalPages" 
          :key="page"
          class="resources-page"
        >
          <div class="resources-grid">
            <StudentResourceCard 
              v-for="(item) in equipments.slice((page - 1) * 98, page * 98)" 
              :key="`equipment-${item.Id}`"
              :item="item"
              :value="equipmentFormData[item.Id]"
              :format-quantity="formatLargeNumber"
              :item-type="'equipment'"
              @update:value="(e) => handleEquipmentInput(item, e)"
            />
          </div>
        </div>
      </div>
      
      <!-- Add navigation buttons for easier desktop navigation -->
      <button 
        v-if="totalPages > 1 && currentPage > 0" 
        class="nav-button prev-button"
        @click="goToPage(currentPage - 1)"
      >
        ←
      </button>
      <button 
        v-if="totalPages > 1 && currentPage < totalPages - 1" 
        class="nav-button next-button"
        @click="goToPage(currentPage + 1)"
      >
        →
      </button>
    </div>
    
    <div class="resources-pagination">
      <div class="page-indicator">
        <div 
          v-for="page in totalPages" 
          :key="page"
          class="page-dot"
          :class="{ active: currentPage === page - 1 }"
          @click="goToPage(page - 1)"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Only keep component-specific styles */
.resources-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.resources-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  height: 100%;
  min-height: 500px; /* Fallback height */
}

.resources-slider {
  display: flex;
  transition: transform 0.3s ease;
  height: 100%;
  width: 100%;
  cursor: grab;
}

.resources-slider.is-dragging {
  cursor: grabbing;
  transition: none;
}

.resources-page {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.resources-pagination {
  padding-top: 20px;
  display: flex;
  justify-content: center;
}

.page-indicator {
  display: flex;
  gap: 8px;
}

.page-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--border-color);
  transition: all 0.2s ease;
  cursor: pointer;
}

.page-dot.active {
  background-color: var(--accent-color);
  transform: scale(1.2);
}

.page-dot:hover {
  transform: scale(1.2);
}

/* Navigation buttons */
.nav-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  z-index: 5;
}

.nav-button:hover {
  opacity: 1;
}

.prev-button {
  left: 10px;
}

.next-button {
  right: 10px;
}

@media (max-width: 600px) {
  .nav-button {
    display: none;
  }
}
</style> 