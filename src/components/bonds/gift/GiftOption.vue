<script setup lang="ts">
import { useTooltip } from '@/composables/useTooltip';
import { $t } from '@/locales';

const props = defineProps<{
  canConvert: boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** Suppresses the wrapping `.modal-section-card` card chrome (BondsPage embeds inline). */
  flat?: boolean;
}>();

const emit = defineEmits(['toggle-convert', 'sync-gifts', 'reset-gifts', 'undo-changes', 'redo-changes']);

const { activeTooltip, tooltipStyle, tooltipRef, showTooltip, hideTooltip } =
  useTooltip<'convert' | 'sync' | 'reset' | 'undo' | 'redo'>();
</script>

<template>
  <div :class="['modal-section-card', { 'modal-section-card--flat': flat }]">
    <div class="options-container">
      <div class="button-group">
        <button
          class="button button-convert"
          :class="{ 'button-disabled': !props.canConvert }"
          :disabled="!props.canConvert"
          @click="emit('toggle-convert')"
          @mouseenter="showTooltip($event, 'convert')"
          @mouseleave="hideTooltip()"
          :aria-label="$t('convertGiftBox')"
          :title="$t('convertGiftBox')"
        >
          <span class="button-text">{{ $t('convertGiftBox') }}</span>
        </button>

        <button
          class="button button-primary"
          @click="emit('sync-gifts')"
          @mouseenter="showTooltip($event, 'sync')"
          @mouseleave="hideTooltip()"
          :aria-label="$t('syncGifts')"
          :title="$t('syncGifts')"
        >
          <span class="button-text">{{ $t('syncGifts') }}</span>
        </button>

        <button
          class="button button-secondary"
          @click="emit('reset-gifts')"
          @mouseenter="showTooltip($event, 'reset')"
          @mouseleave="hideTooltip()"
          :aria-label="$t('resetGifts')"
          :title="$t('resetGifts')"
        >
          <span class="button-text">{{ $t('resetGifts') }}</span>
        </button>

        <button
          class="button button-secondary"
          :class="{ 'button-disabled': !props.canUndo }"
          :disabled="!props.canUndo"
          @click="emit('undo-changes')"
          @mouseenter="showTooltip($event, 'undo')"
          @mouseleave="hideTooltip()"
          :aria-label="$t('undoChanges')"
          :title="$t('undoChanges')"
        >
          <span class="button-text">{{ $t('undoChanges') }}</span>
        </button>

        <button
          class="button button-secondary"
          :class="{ 'button-disabled': !props.canRedo }"
          :disabled="!props.canRedo"
          @click="emit('redo-changes')"
          @mouseenter="showTooltip($event, 'redo')"
          @mouseleave="hideTooltip()"
          :aria-label="$t('redoChanges')"
          :title="$t('redoChanges')"
        >
          <span class="button-text">{{ $t('redoChanges') }}</span>
        </button>
      </div>

      <!-- Tooltip for all buttons -->
      <div
        v-if="activeTooltip !== null"
        ref="tooltipRef"
        class="modal-tooltip"
        :style="tooltipStyle"
      >
        <template v-if="activeTooltip === 'convert'">
          {{ $t('convertGiftBoxTooltip') }}
        </template>
        <template v-else-if="activeTooltip === 'sync'">
          {{ $t('syncGiftsTooltip') }}
        </template>
        <template v-else-if="activeTooltip === 'reset'">
          {{ $t('resetGiftsTooltip') }}
        </template>
        <template v-else-if="activeTooltip === 'undo'">
          {{ $t('undoChangesTooltip') }}
        </template>
        <template v-else-if="activeTooltip === 'redo'">
          {{ $t('redoChangesTooltip') }}
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.options-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin: 0 5px;
  position: relative;
}

.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.button {
  position: relative;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.9em;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.button-primary {
  background-color: var(--accent-color);
  color: white;
}

.button-primary:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

.button-secondary {
  background-color: var(--secondary-color, #b8b8b8);
  color: white;
  border: 1px solid var(--border-color, #ccc);
}

.button-secondary:hover:not(:disabled) {
  background-color: var(--secondary-hover, #8d8d8d);
}

.button-convert {
  background-color: var(--color-convert);
  color: white;
  border: 1px solid var(--color-convert);
}

.button-convert:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--color-convert) 82%, black);
}

.button-disabled {
  background-color: var(--disabled-bg, #e0e0e0) !important;
  color: var(--disabled-text, #888) !important;
  cursor: not-allowed;
  border: 1px solid var(--disabled-border, #ccc);
  opacity: 0.8;
}


</style>
