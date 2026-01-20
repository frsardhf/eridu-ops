<script setup>
import { onMounted } from 'vue';
import StudentDisplay from './components/display/StudentDisplay.vue';
import { initializeAllCaches } from './consumables/stores/resourceCacheStore';

// Initialize resource and equipment caches on app mount
onMounted(async () => {
  await initializeAllCaches();
});
</script>

<template>
  <StudentDisplay />
</template>