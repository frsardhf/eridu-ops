<script setup lang="ts">
const props = defineProps<{
  convertBox: boolean
}>();

const emit = defineEmits(['toggle-convert', 'auto-fill-gift']);

function handleConvert() {
  emit('toggle-convert');
}

function handleAutoFill() {
  emit('auto-fill-gift');
}
</script>

<template>
  <div class="convert-box-section">
    <h3 class="section-title">Gift Options</h3>
    <div class="options-container">
      <div class="custom-checkbox">
        <input
          id="convert-input"
          name="convert-input"
          type="checkbox"
          :checked="convertBox"
          @change="handleConvert"
          class="convert-input"
        />
        <label for="convert-input" class="checkbox-label">
          <span class="checkbox-custom"></span>
          <span class="checkbox-text">Convert Gift Choice Box</span>
        </label>
      </div>
      <button
        class="button button-primary"
        @click="handleAutoFill"
        :disabled="convertBox"
        :class="{ 'button-disabled': convertBox }"
      >
        <span class="button-text">Auto-Fill Gifts</span>
        <span v-if="convertBox" class="tooltip">Disabled when Convert is checked</span>
      </button>
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
  margin-bottom: 10px;
  padding-bottom: 5px;
}

.section-title {
  font-size: 1.1em;
  font-weight: bold;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.options-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin: 0 5px;
}

.custom-checkbox {
  display: flex;
  align-items: center;
  position: relative;
}

.custom-checkbox .convert-input {
  opacity: 0;
  position: absolute;
  width: 0;
  height: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 8px;
  user-select: none;
  font-size: 0.9em;
  color: var(--text-secondary);
}

.checkbox-custom {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  background: var(--card-background);
  border: 2px solid var(--primary-color, #4a6cf7);
  border-radius: 3px;
  transition: all 0.2s ease;
}

.checkbox-custom::after {
  content: '';
  position: absolute;
  display: none;
  left: 5px;
  top: 1px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.convert-input:checked + .checkbox-label .checkbox-custom {
  background-color: var(--primary-color, #4a6cf7);
  border-color: var(--primary-color, #4a6cf7);
}

.convert-input:checked + .checkbox-label .checkbox-custom::after {
  display: block;
}

.convert-input:focus + .checkbox-label .checkbox-custom {
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.2);
}

.checkbox-label:hover .checkbox-custom {
  border-color: var(--primary-hover, #3a5ce7);
}

.convert-option input[type="checkbox"] {
  cursor: pointer;
}

.convert-option label {
  cursor: pointer;
  user-select: none;
}

.button {
  position: relative;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.9em;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.button-primary {
  background-color: var(--primary-color, #4a6cf7);
  color: white;
}

.button-primary:hover:not(:disabled) {
  background-color: var(--primary-hover, #3a5ce7);
}

.button-disabled {
  background-color: var(--disabled-bg, #e0e0e0) !important;
  color: var(--disabled-text, #888) !important;
  cursor: not-allowed;
  border: 1px solid var(--disabled-border, #ccc);
  opacity: 0.8;
}

.tooltip {
  visibility: hidden;
  position: absolute;
  bottom: 125%;
  left: 40%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  text-align: center;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  width: max-content;
  max-width: 200px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.3s;
}

.button:hover .tooltip {
  visibility: visible;
  opacity: 1;
}

/* Add a small triangle at the bottom of the tooltip */
.tooltip::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.75) transparent transparent transparent;
}
</style>