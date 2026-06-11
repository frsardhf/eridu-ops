<script setup>
import { useStudentData } from '@/lib/hooks/useStudentData';

// Kick off the one-shot data pipeline as soon as the app shell mounts. The
// pipeline itself preloads the per-student materials/gears aggregates, so no
// follow-up watcher is needed here.
useStudentData();
</script>

<template>
  <RouterView />
</template>
