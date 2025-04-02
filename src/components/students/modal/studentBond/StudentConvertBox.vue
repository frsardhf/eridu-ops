<script setup lang="ts">
const props = defineProps<{
  convertBox: boolean
}>();

const emit = defineEmits(['toggle-convert']);

function handleChange() {
  emit('toggle-convert');
}
</script>

<template>
  <div class="convert-box-section">
    <input
      id="convert-input"
      name="convert-input"
      type="checkbox"
      :checked="convertBox"
      @change="handleChange"
      class="convert-input"
    />
    <span>Convert Gift Choice Box</span>
  </div>
</template>