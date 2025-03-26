<script setup lang="ts">
import { computed } from 'vue';
import { StudentProps } from '../../../../types/student';
import StudentGiftCard from './StudentGiftCard.vue';
import StudentBoxCard from './StudentBoxCard.vue';

const props = defineProps<{
  student: StudentProps | null,
  giftFormData: Record<string, number>,
  boxFormData: Record<string, number>,
  convertBox: boolean,
  shouldShowGiftGrade: (index: number) => boolean
}>();

const emit = defineEmits<{
  (e: 'update-gift', index: number, event: Event): void,
  (e: 'update-box', index: number, event: Event): void
}>();

function handleGiftInput(index: number, event: Event) {
  emit('update-gift', index, event);
}

function handleBoxInput(index: number, event: Event) {
  emit('update-box', index, event);
}

const hasGifts = computed(() => props.student?.Gifts && props.student.Gifts.length > 0);
const hasBoxes = computed(() => props.student?.Boxes && props.student.Boxes.length > 0);
</script>

<template>
  <div class="gifts-grid">
    <!-- Regular Gifts Section -->
    <template v-if="hasGifts">
      <StudentGiftCard 
        v-for="(gift, index) in student!.Gifts" 
        :key="`gift-${index}`"
        :item="gift"
        :value="giftFormData[index]"
        @update:value="(e) => handleGiftInput(index, e)"
      />
    </template>
    
    <!-- Gift Boxes Section -->
    <template v-if="hasBoxes">
      <StudentBoxCard 
        v-for="(box, index) in student!.Boxes" 
        :key="`box-${index}`"
        :item="box"
        :value="boxFormData[index]"
        :convert-box="convertBox"
        :show-gift-grade="shouldShowGiftGrade(index)"
        @update:value="(e) => handleBoxInput(index, e)"
      />
    </template>
  </div>
</template>