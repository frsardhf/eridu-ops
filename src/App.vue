<script setup>
import { watch } from 'vue';
import StudentDisplay from '@/components/display/StudentDisplay.vue';
import { useStudentData } from '@/consumables/hooks/useStudentData';
import { preloadAllStudentsData } from '@/consumables/utils/materialUtils';

const { studentData, isReady } = useStudentData();

// Watch for when studentData is ready and populated, then preload materials/gears
watch(
  () => isReady.value,
  async (ready) => {
    if (ready && Object.keys(studentData.value).length > 0) {
      await preloadAllStudentsData();
      console.log('All data preloaded successfully');
    }
  },
  { immediate: true }
);
</script>

<template>
  <StudentDisplay />
</template>