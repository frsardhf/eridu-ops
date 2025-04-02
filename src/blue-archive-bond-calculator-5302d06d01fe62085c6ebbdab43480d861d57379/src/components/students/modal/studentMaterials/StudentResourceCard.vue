<script setup lang="ts">
import { ref } from 'vue';
import { ResourceProps } from '../../../../types/resource';

defineProps<{
  item: ResourceProps,
  value?: any
}>();

const emit = defineEmits<{
  'update:value': [event: Event];
}>();

const isInputFocused = ref(false);

function handleInput(event: Event) {
  emit('update:value', event);
}

function handleFocus() {
  isInputFocused.value = true;
}

function handleBlur() {
  isInputFocused.value = false;
}
</script>

<template>
  <div class="resource-card">
    <div class="resource-content">
      <img 
        :src="`https://schaledb.com/images/item/icon/${item.Icon}.webp`"
        :alt="item.Name"
        class="resource-icon"
      />
      <div 
        class="resource-quantity" 
        v-if="value && value !== '0' && !isInputFocused"
      >
        ×{{ value }}
      </div>
      <input
        type="number"
        :value="value"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        class="resource-input"
        min="0"
      />
    </div>
  </div>
</template>