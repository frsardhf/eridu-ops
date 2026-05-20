<script setup lang="ts">
import { $t } from '@/locales';
</script>

<template>
  <div class="bonds-page">
    <div class="bonds-stub">
      <h1>{{ $t('bonds') }}</h1>
      <p class="muted">Coming soon.</p>
      <RouterLink to="/" class="back-link">← Home</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.bonds-page {
  position: fixed;
  inset: 0;
  background-color: var(--background-primary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bonds-stub {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bonds-stub h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}

.muted {
  color: var(--text-secondary);
}

.back-link {
  color: var(--accent-color);
  text-decoration: none;
  font-weight: 500;
  margin-top: 8px;
}

.back-link:hover {
  text-decoration: underline;
}
</style>
