<script setup lang="ts">
import { useStudentData } from '@/lib/hooks/useStudentData';
import { $t } from '@/locales';

// Shown only when a SchaleDB fetch failure leaves the app with no data at all
// (first visit offline etc.); a stale cache keeps working without a banner.
const { loadError, isLoading, retryDataLoad } = useStudentData();
</script>

<template>
  <div v-if="loadError && !isLoading" class="data-error-banner" role="alert">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <span class="data-error-text">{{ $t('dataLoadError') }}</span>
    <button type="button" class="data-error-retry" @click="retryDataLoad">
      {{ $t('retry') }}
    </button>
  </div>
</template>

<style scoped>
.data-error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px auto;
  padding: 10px 14px;
  max-width: 640px;
  border: 1px solid var(--color-negative);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-negative) 10%, var(--background-primary));
  color: var(--text-primary);
  font-size: 0.9rem;
}

.data-error-banner svg {
  flex-shrink: 0;
  color: var(--color-negative);
}

.data-error-text {
  flex: 1 1 auto;
  min-width: 0;
}

.data-error-retry {
  flex-shrink: 0;
  padding: 5px 14px;
  border: 1px solid var(--color-negative);
  border-radius: 8px;
  background: transparent;
  color: var(--color-negative);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
}

.data-error-retry:hover {
  background: color-mix(in srgb, var(--color-negative) 15%, transparent);
}
</style>
