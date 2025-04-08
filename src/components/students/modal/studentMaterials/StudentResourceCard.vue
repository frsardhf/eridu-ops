<script setup lang="ts">
import { ref } from 'vue';
import { ResourceProps } from '../../../../types/resource';
import '../../../../styles/resourceDisplay.css';

const props = defineProps<{
  item: ResourceProps,
  value?: any,
  formatQuantity?: (quantity: number) => string,
  itemType?: 'resource' | 'equipment'
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

// Determine the correct icon path based on itemType
function getIconPath(): string {
  const type = props.itemType === 'equipment' ? 'equipment' : 'item';
  return `https://schaledb.com/images/${type}/icon/${props.item.Icon}.webp`;
}

// Format the quantity value
function formatValue(value: any): string {
  if (!value || value === '0') return '';
  
  // If formatQuantity prop is provided, use it
  if (props.formatQuantity) {
    return props.formatQuantity(Number(value));
  }
  
  // Otherwise use default formatting
  return `×${value}`;
}
</script>

<template>
  <div class="resource-item" @click="forceInputFocus">
    <div class="resource-content">
      <img 
        :src="getIconPath()"
        :alt="props.item.Name"
        class="resource-icon"
      />
      <div 
        class="resource-quantity" 
        v-if="!isInputFocused"
      >
        {{ formatValue(props.value) }}
      </div>
      <input
        ref="inputEl"
        type="number"
        :value="props.value"
        :name="`${props.item.Name}-${props.item.Id}`"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        min="0"
        class="resource-input"
      />
    </div>
  </div>
</template>