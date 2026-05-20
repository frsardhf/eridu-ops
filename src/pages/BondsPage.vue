<script setup lang="ts">
import GlobalNavbar from '@/components/navbar/GlobalNavbar.vue';
import { $t } from '@/locales';
</script>

<template>
  <div class="bonds-page">
    <GlobalNavbar />

    <main class="bonds-body">
      <div class="bonds-stub">
        <h1>{{ $t('bonds') }}</h1>
        <p class="muted">Coming soon.</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.bonds-page {
  position: fixed;
  inset: 0;
  background-color: var(--background-primary);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bonds-body {
  flex: 1;
  overflow: auto;
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
</style>
