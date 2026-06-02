<script setup lang="ts">
import StarIcon from '@/components/shared/StarIcon.vue';

const props = defineProps<{
  stars: { position: number; active: boolean; isGold: boolean }[];
  labelPrefix: string;
}>();

const emit = defineEmits<{
  (e: 'select', position: number): void;
}>();
</script>

<template>
  <div class="grade-stars-group">
    <button
      v-for="star in props.stars"
      :key="`star-${star.position}`"
      class="grade-star-button"
      :class="[star.isGold ? 'gold-star' : 'blue-star', { active: star.active }]"
      type="button"
      :aria-label="`${props.labelPrefix} ${star.position}`"
      @click="emit('select', star.position)"
    >
      <StarIcon class="star-icon" />
    </button>
  </div>
</template>
