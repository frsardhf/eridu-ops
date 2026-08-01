<script setup lang="ts">
import { $t } from '@/locales';
</script>

<template>
  <span class="chibi-orbit-hint">
    <span class="chibi-orbit-hint__mouse">{{ $t('chibi.orbitHintMouse') }}</span>
    <span class="chibi-orbit-hint__touch">{{ $t('chibi.orbitHintTouch') }}</span>
  </span>
</template>

<style scoped>
.chibi-orbit-hint__touch {
  display: none;
}

@media (pointer: coarse) {
  .chibi-orbit-hint__mouse {
    display: none;
  }

  .chibi-orbit-hint__touch {
    display: inline;
  }
}
</style>
