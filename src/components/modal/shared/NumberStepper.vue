<script setup lang="ts">
import { $t } from '@/locales';

const props = withDefaults(defineProps<{
  value: number;
  min: number;
  max: number;
  name: string;
  ariaLabel?: string;
  disabled?: boolean;
  variant?: 'current' | 'target';
}>(), {
  variant: 'current',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'change', value: number): void;
}>();
</script>

<template>
  <div class="custom-number-input" :class="{ disabled: props.disabled }">
    <button
      class="control-button min-button"
      :class="{ disabled: props.disabled || props.value <= props.min }"
      :disabled="props.disabled || props.value <= props.min"
      :aria-label="$t('setMinLevel')"
      @click="emit('change', props.min)"
    ><span>«</span></button>

    <button
      class="control-button decrement-button"
      :class="{ disabled: props.disabled || props.value <= props.min }"
      :disabled="props.disabled || props.value <= props.min"
      :aria-label="$t('decreaseLevel')"
      @click="emit('change', props.value - 1)"
    ><span>−</span></button>

    <input
      type="number"
      :name="props.name"
      :value="props.value"
      :min="props.min"
      :max="props.max"
      :disabled="props.disabled"
      :aria-label="props.ariaLabel"
      class="level-input"
      :class="[
        props.variant === 'target' ? 'target-level' : 'current-level',
        { 'max-level': props.variant === 'target' && props.value >= props.max }
      ]"
      @input="(e) => emit('change', parseInt((e.target as HTMLInputElement).value))"
    />

    <button
      class="control-button increment-button"
      :class="{ disabled: props.disabled || props.value >= props.max }"
      :disabled="props.disabled || props.value >= props.max"
      :aria-label="$t('increaseLevel')"
      @click="emit('change', props.value + 1)"
    ><span>+</span></button>

    <button
      class="control-button max-button"
      :class="{ disabled: props.disabled || props.value >= props.max }"
      :disabled="props.disabled || props.value >= props.max"
      :aria-label="$t('setMaxLevel')"
      @click="emit('change', props.max)"
    ><span>»</span></button>
  </div>
</template>
