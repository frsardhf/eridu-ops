<script setup lang="ts">
import { GiftDataProps, BoxDataProps } from '../../../../types/gift';
import { ref } from 'vue';
import '../../../../styles/resourceDisplay.css';

type ItemProps = GiftDataProps | BoxDataProps;

const props = defineProps<{
  item: ItemProps,
  value?: number | string,
  convertBox?: boolean,
  showGiftGrade?: boolean,
  isBox?: boolean
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

// Format the quantity value
function formatValue(value: any): string {
  if (!value || value === '0') return '';
  return `×${value}`;
}

const gift = props.item.gift;

const isInputDisabled = props.isBox && props.convertBox;
</script>

<template>
  <div class="gift-card" :class="{ 'box-card': isBox }" @click="forceInputFocus">
    <div class="gift-header">
      <div class="gift-icon-container">
        <img 
          :src="`https://schaledb.com/images/${isBox ? 'item/full' : 'item/icon'}/${gift.Icon}.webp`"
          :alt="gift.Name"
          class="gift-icon"
        />
        <img 
          v-if="(!isBox || showGiftGrade)"
          :src="`https://schaledb.com/images/ui/Cafe_Interaction_Gift_0${item.grade}.png`"
          :alt="item.grade.toString()"
          class="grade-icon"
        />
        
        <!-- Quantity display (similar to resource-quantity) -->
        <div 
          class="resource-quantity" 
          v-if="!isInputFocused && value"
        >
          {{ formatValue(value) }}
        </div>
        
        <!-- Hidden input for editing quantity -->
        <input
          ref="inputEl"
          type="number"
          :value="value"
          :name="`${isBox ? 'box' : 'gift'}-${gift.Id}`"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          min="0"
          class="resource-input"
          :disabled="isInputDisabled"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.gift-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  background-color: var(--card-background);
  display: flex;
  flex-direction: column;
}

.gift-header {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.gift-icon-container {
  position: relative;
  width: 80px;
  height: 80px;
}

.gift-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.grade-icon {
  position: absolute;
  bottom: 0px;
  left: -10px;
  width: 34px;
  height: 30px;
  object-fit: contain;
}
</style>
