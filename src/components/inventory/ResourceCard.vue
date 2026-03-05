<script setup lang="ts">
import { ResourceProps } from '@/types/resource';
import '@/styles/resourceDisplay.css';
import { useFocusInput } from '@/composables/useInputEditor';
import { formatLargeNumber } from '@/consumables/utils/materialUtils';
import { getItemIconUrl } from '@/consumables/utils/iconUtils';

const props = defineProps<{
  item: ResourceProps,
  value?: any,
  itemType?: 'resource' | 'equipment',
  inputTabIndex?: number
}>();

const emit = defineEmits<{
  'update:value': [event: Event];
  'keydown:input': [event: KeyboardEvent];
}>();

const { isInputFocused, inputEl, handleFocus, handleBlur, forceInputFocus } = useFocusInput();
</script>

<template>
  <div class="resource-item" @click="forceInputFocus">
    <div class="resource-content">
      <img
        :src="getItemIconUrl(props.item.Icon, 
          props.itemType === 'equipment' ? 'equipment' : 'item', props.item.Tier)"
        :alt="props.item.Name"
        class="resource-icon"
      />
      <div
        class="resource-quantity"
        v-if="!isInputFocused"
      >
        {{ formatLargeNumber(Number(props.value)) }}
      </div>
      <input
        ref="inputEl"
        type="number"
        :value="props.value"
        :name="`${props.item.Name}-${props.item.Id}`"
        @input="emit('update:value', $event)"
        @keydown="emit('keydown:input', $event as KeyboardEvent)"
        @focus="handleFocus"
        @blur="handleBlur"
        min="0"
        :tabindex="props.inputTabIndex ?? 0"
        class="resource-input"
      />
    </div>
  </div>
</template>
