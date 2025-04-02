<script setup lang="ts">
import { ref } from 'vue';
import { ResourceProps } from '../../../../types/resource';

const props = defineProps<{
  item: ResourceProps,
  value?: any
}>();

const emit = defineEmits<{
  'update:value': [event: Event];
}>();

const isInputFocused = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);

function handleInput(event: Event) {
  emit('update:value', event);
}

function handleFocus() {
  isInputFocused.value = true;
}

function handleBlur() {
  isInputFocused.value = false;
}

function forceInputFocus() {
  if (inputEl.value) {
    inputEl.value.focus();
  }
}
</script>

<template>
  <div class="resource-card" @click="forceInputFocus">
    <div class="resource-content">
      <img 
        :src="`https://schaledb.com/images/item/icon/${props.item.Icon}.webp`"
        :alt="props.item.Name"
        class="resource-icon"
      />
      <div 
        class="resource-quantity" 
        v-if="!isInputFocused"
      >
        {{ props.value && props.value !== '0' ? `×${props.value}` : '' }}
      </div>
      <input
        ref="inputEl"
        type="number"
        :value="props.value"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        min="0"
        class="resource-input"
      />
    </div>
  </div>
</template>

<style scoped>
.resource-card {
  position: relative;
  aspect-ratio: 1;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
}

.resource-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
}

.resource-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.resource-quantity {
  position: absolute;
  bottom: 0px;
  right: 0px;
  font-size: 1em;
  color: var(--text-tertiary);
  font-weight: 500;
  text-shadow: 
    -0.5px -0.5px 0 #fff,
    0.5px -0.5px 0 #fff,
    -0.5px 0.5px 0 #fff,
    0.5px 0.5px 0 #fff;
  z-index: 1;
}
</style>