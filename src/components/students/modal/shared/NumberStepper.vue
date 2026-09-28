<script setup lang="ts">
import { $t } from '@/locales';

const props = withDefaults(
  defineProps<{
    value: number;
    min: number;
    max: number;
    name: string;
    ariaLabel?: string;
    disabled?: boolean;
    variant?: 'current' | 'target';
  }>(),
  {
    variant: 'current',
    disabled: false,
  },
);

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
    >
      <span>«</span>
    </button>

    <button
      class="control-button decrement-button"
      :class="{ disabled: props.disabled || props.value <= props.min }"
      :disabled="props.disabled || props.value <= props.min"
      :aria-label="$t('decreaseLevel')"
      @click="emit('change', props.value - 1)"
    >
      <span>−</span>
    </button>

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
        { 'max-level': props.variant === 'target' && props.value >= props.max },
      ]"
      @input="(e) => emit('change', parseInt((e.target as HTMLInputElement).value))"
    />

    <button
      class="control-button increment-button"
      :class="{ disabled: props.disabled || props.value >= props.max }"
      :disabled="props.disabled || props.value >= props.max"
      :aria-label="$t('increaseLevel')"
      @click="emit('change', props.value + 1)"
    >
      <span>+</span>
    </button>

    <button
      class="control-button max-button"
      :class="{ disabled: props.disabled || props.value >= props.max }"
      :disabled="props.disabled || props.value >= props.max"
      :aria-label="$t('setMaxLevel')"
      @click="emit('change', props.max)"
    >
      <span>»</span>
    </button>
  </div>
</template>

<style scoped>
.custom-number-input {
  display: flex;
  align-items: center;
  height: 36px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--background-primary);
}

.level-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 0.25rem;
  border: none;
  background-color: transparent;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
}

.level-input::-webkit-outer-spin-button,
.level-input::-webkit-inner-spin-button {
  margin: 0;
  appearance: none;
}

.level-input:focus {
  outline: none;
  background-color: color-mix(in srgb, var(--accent-color) 6%, transparent);
}

.level-input.max-level {
  color: var(--accent-color);
}

.control-button {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 36px;
  padding: 0;
  border: none;
  background-color: transparent;
  color: var(--text-primary);
  font-size: 1.1rem;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.control-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent-color) 8%, transparent);
  color: var(--accent-color);
}

.control-button:active:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent-color) 14%, transparent);
}

.control-button.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.min-button,
.max-button {
  font-size: 0.9rem;
  font-weight: 700;
}

@media (max-width: 500px) {
  .control-button {
    width: 20px;
  }
}
</style>
