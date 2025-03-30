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
  shouldShowGiftGrade: (id: number) => boolean
}>();

const emit = defineEmits<{
  (e: 'update-gift', id: number, event: Event): void,
  (e: 'update-box', id: number, event: Event): void
}>();

function handleGiftInput(id: number, event: Event) {
  emit('update-gift', id, event);
}

function handleBoxInput(id: number, event: Event) {
  emit('update-box', id, event);
}

const hasGifts = computed(() => props.student?.Gifts && Object.keys(props.student.Gifts).length > 0);
const hasBoxes = computed(() => props.student?.Boxes && Object.keys(props.student.Boxes).length > 0);
</script>

<template>
  <div class="gifts-grid">
    <!-- Regular Gifts Section -->
    <template v-if="hasGifts">
      <StudentGiftCard 
        v-for="(item) in student!.Gifts" 
        :key="`gift-${item.gift.Id}`"
        :item="item"
        :value="giftFormData[item.gift.Id]"
        @update:value="(e) => handleGiftInput(item.gift.Id, e)"
      />
    </template>
    
    <!-- Gift Boxes Section -->
    <template v-if="hasBoxes">
      <StudentBoxCard 
        v-for="(item) in student!.Boxes" 
        :key="`box-${item.gift.Id}`"
        :item="item"
        :value="boxFormData[item.gift.Id]"
        :convert-box="convertBox"
        :show-gift-grade="shouldShowGiftGrade(Number(item.gift.Id))"
        @update:value="(e) => handleBoxInput(Number(item.gift.Id), e)"
      />
    </template>
  </div>
</template>