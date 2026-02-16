<script setup lang="ts">
import { ref } from 'vue';
import { adjustTooltipPosition } from '../../../../consumables/utils/materialUtils';
import { $t } from '../../../../locales';

const emit = defineEmits(['toggle-convert', 'auto-fill-gift', 'reset-gifts', 'undo-changes']);

// Tooltip state
const hoveredTooltipType = ref<'convert' | 'autofill' | 'reset' | 'undo' | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });

function handleConvert() {
  emit('toggle-convert');
}

function handleAutoFill() {
  emit('auto-fill-gift');
}

function handleReset() {
  emit('reset-gifts');
}

function handleUndo() {
  emit('undo-changes');
}

// Function to show tooltip
function showTooltip(event: MouseEvent, type: 'convert' | 'autofill' | 'reset' | 'undo') {
  hoveredTooltipType.value = type;
  
  // Set initial position
  tooltipPosition.value = adjustTooltipPosition(event);
  
  // Adjust tooltip position after it's rendered
  setTimeout(() => {
    const tooltip = document.querySelector('.gift-tooltip') as HTMLElement;
    if (tooltip) {
      tooltipPosition.value = adjustTooltipPosition(event, tooltip);
    }
  }, 0);
}

// Function to hide tooltip
function hideTooltip() {
  hoveredTooltipType.value = null;
}
</script>

<template>
  <div class="convert-box-section">
    <h3 class="section-title">{{ $t('giftOptions') }}</h3>
    <div class="options-container">
      <div class="button-group">
        <button
          class="button button-secondary"
          @click="handleReset"
          @mousemove="showTooltip($event, 'reset')"
          @mouseleave="hideTooltip()"
        >
          <span class="button-text">{{ $t('resetGifts') }}</span>
        </button>
        
        <button
          class="button button-secondary"
          @click="handleUndo"
          @mousemove="showTooltip($event, 'undo')"
          @mouseleave="hideTooltip()"
        >
          <span class="button-text">{{ $t('undoChanges') }}</span>
        </button>
        
        <button
          class="button button-convert"
          @click="handleConvert"
          @mousemove="showTooltip($event, 'convert')"
          @mouseleave="hideTooltip()"
        >
          <span class="button-text">{{ $t('convertGiftBox') }}</span>
        </button>
        
        <button
          class="button button-primary"
          @click="handleAutoFill"
          @mousemove="showTooltip($event, 'autofill')"
          @mouseleave="hideTooltip()"
        >
          <span class="button-text">{{ $t('autoFillGifts') }}</span>
        </button>
      </div>
      
      <!-- Tooltip for all buttons -->
      <div 
        v-if="hoveredTooltipType !== null" 
        class="gift-tooltip"
        :style="{ 
          left: `${tooltipPosition.x}px`, 
          top: `${tooltipPosition.y}px`
        }"
      >
        <template v-if="hoveredTooltipType === 'convert'">
          {{ $t('convertGiftBoxTooltip') }}
        </template>
        <template v-else-if="hoveredTooltipType === 'autofill'">
          {{ $t('autoFillGiftsTooltip') }}
        </template>
        <template v-else-if="hoveredTooltipType === 'reset'">
          {{ $t('resetGiftsTooltip') }}
        </template>
        <template v-else-if="hoveredTooltipType === 'undo'">
          {{ $t('undoChangesTooltip') }}
        </template>
      </div>
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

.button-secondary {
  background-color: var(--secondary-color, #b8b8b8);
  color: white;
  border: 1px solid var(--border-color, #ccc);
}

.button-secondary:hover:not(:disabled) {
  background-color: var(--secondary-hover, #8d8d8d);
}

.button-convert {
  background-color: var(--convert-color, #f7ac4a);
  color: white;
  border: 1px solid var(--convert-color, #f7ac4a);
}

.button-convert:hover:not(:disabled) {
  background-color: var(--convert-hover, #e49329);
}

.button-disabled {
  background-color: var(--disabled-bg, #e0e0e0) !important;
  color: var(--disabled-text, #888) !important;
  cursor: not-allowed;
  border: 1px solid var(--disabled-border, #ccc);
  opacity: 0.8;
}

/* Tooltip styles */
.gift-tooltip {
  position: fixed;
  z-index: 1000;
  background: rgba(12, 12, 20, 0.92);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  backdrop-filter: blur(5px);
  color: white;
  text-align: left;
  font-size: 0.8em;
  width: max-content;
  max-width: 250px;
}

@media (max-width: 768px) {
  .options-container {
    flex-direction: column;
    align-items: center;
  }
  
  .button-group {
    width: 100%;
    justify-content: space-between;
  }
}
</style>