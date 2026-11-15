<script setup lang="ts">
import type { PullRecapPityMark } from '@/types/pullRecap';

defineProps<{ mark: PullRecapPityMark }>();
</script>

<template>
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="mark !== 'hardPity'">
      <circle cx="12" cy="12" r="9" />
      <path
        :d="mark === 'fiftyFifty' ? 'M12 3a9 9 0 0 0 0 18Z' : 'M12 3a9 9 0 0 1 0 18Z'"
        fill="currentColor"
        stroke="none"
      />
      <template v-if="mark === 'fiftyFiftyLost'">
        <path
          d="M3 21 21 3"
          stroke="var(--pull-recap-pity-icon-background, var(--background-primary))"
          stroke-width="5"
        />
        <path d="M3 21 21 3" />
      </template>
    </template>
    <template v-else>
      <path d="M12 2.5 20 6v5.5c0 4.6-3.5 8-8 10-4.5-2-8-5.4-8-10V6Z" />
      <path d="m8.5 12 2.3 2.3 4.7-4.7" />
    </template>
  </svg>
</template>
