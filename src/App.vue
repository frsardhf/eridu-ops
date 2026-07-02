<script setup>
import { useStudentData } from '@/lib/hooks/useStudentData';

// Initialize the one-time student data pipeline.
useStudentData();
</script>

<template>
  <RouterView />
</template>
