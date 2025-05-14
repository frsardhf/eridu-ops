<script setup lang="ts">
import { GiftProps } from '../../../../types/gift';
import { computed, ref } from 'vue';
import '../../../../styles/resourceDisplay.css';

const props = defineProps<{
  item: GiftProps,
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

// Determine if this is a special box item that's part of the conversion process
const isConversionItem = computed(() => {
  if (!props.isBox) return false;
  const id = props.item.gift.Id;
  return id === 82 || id === 100000 || id === 100008;
});
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
        
        <!-- Input for editing quantity -->
        <div class="input-container">
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
          />
        </div>
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
  width: 90px;
  height: 90px;
}

.gift-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.grade-icon {
  position: absolute;
  bottom: 0px;
  left: 0px;
  width: 34px;
  height: 29px;
  object-fit: contain;
}

.input-container {
  position: relative;
}
</style>
