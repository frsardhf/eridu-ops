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
    <h3 class="section-title">Gift Box Options</h3>
    <div class="max-all-container">
      <input
        id="convert-input"
        name="convert-input"
        type="checkbox"
        :checked="convertBox"
        @change="handleChange"
        class="convert-input"
      />
      <label for="convert-input">Convert Gift Choice Box</label>
    </div>
  </div>
</template>

<style scoped>
.convert-box-section {
  background: var(--card-background);
  border-radius: 8px;
  padding: 12px 15px;
  border: 1px solid var(--border-color);
  width: 100%;
}

.convert-box-section h3.section-title {
  margin-bottom: 5px;
  padding-bottom: 0;
}

.section-title {
  font-size: 1.1em;
  font-weight: bold;
  margin-bottom: 10px;
  color: var(--text-primary);
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.max-all-container {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  color: var(--text-secondary);
}

.max-all-container input[type="checkbox"] {
  cursor: pointer;
}

.max-all-container label {
  cursor: pointer;
  user-select: none;
}
</style>
