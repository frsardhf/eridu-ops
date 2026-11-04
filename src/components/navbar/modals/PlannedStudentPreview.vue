<script setup lang="ts">
import { $t } from '@/locales';
import '@/styles/studentCard.css';

defineProps<{
  portraitUrl: string;
  name: string;
}>();
</script>

<template>
  <div class="planned-student-preview selection-grid-card selection-grid-card--planned">
    <div class="card-img">
      <img :src="portraitUrl" alt="" class="img--unowned" loading="lazy" decoding="async" />
      <span class="planned-badge">{{ $t('ownership.planned') }}</span>
    </div>
    <div class="card-label">
      <span class="label-text">{{ name }}</span>
    </div>
  </div>
</template>

<style scoped>
.planned-student-preview {
  width: 150px;
  max-width: 100%;
  margin: 12px auto;
  font-size: 0.875rem;
}
</style>
