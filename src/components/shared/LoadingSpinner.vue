<script setup lang="ts">
import { $t } from '@/locales';

defineProps<{
  small?: boolean;
  block?: boolean;
  decorative?: boolean;
}>();
</script>

<template>
  <span
    class="loading-spinner"
    :class="{ 'loading-spinner--small': small, 'loading-spinner--block': block }"
    :role="decorative ? undefined : 'status'"
    :aria-label="decorative ? undefined : $t('loading')"
    :aria-hidden="decorative ? true : undefined"
  >
    <span class="loading-spinner-ring" aria-hidden="true"></span>
  </span>
</template>

<style scoped>
.loading-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  vertical-align: middle;
  color: var(--accent-color);
}

.loading-spinner-ring {
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  border: 2px solid color-mix(in srgb, currentColor 25%, transparent);
  border-bottom-color: currentColor;
  border-radius: 50%;
  animation: loading-spin 0.9s linear infinite;
}

.loading-spinner--small {
  margin-inline-end: 0.35em;
  color: inherit;
}

.loading-spinner--small .loading-spinner-ring {
  width: 1em;
  height: 1em;
}

.loading-spinner--block {
  display: flex;
  min-height: 160px;
  padding: 32px;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-spinner-ring {
    animation: none;
  }
}
</style>
