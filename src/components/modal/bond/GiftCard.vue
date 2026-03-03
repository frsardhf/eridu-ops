<script setup lang="ts">
import { GiftProps } from '@/types/gift';
import '@/styles/resourceDisplay.css';
import { useFocusInput } from '@/composables/useInputEditor';
import { formatItemQuantity } from '@/consumables/utils/materialUtils';
import { getGiftIconUrl, getGiftGradeIconUrl } from '@/consumables/utils/iconUtils';

const props = defineProps<{
  item: GiftProps,
  value?: number | string,
  convertBox?: boolean,
  showGiftGrade?: boolean,
  isBox?: boolean
}>();

const emit = defineEmits<{'update:value': [event: Event];}>();

const { 
  isInputFocused, 
  inputEl, 
  handleFocus, 
  handleBlur, 
  forceInputFocus 
} = useFocusInput();
</script>

<template>
  <div class="gift-card" :class="{ 'box-card': isBox }" @click="forceInputFocus">
    <div class="gift-header">
      <div class="gift-icon-container">
        <img
          :src="getGiftIconUrl(props.item.gift.Icon, isBox ?? false)"
          :alt="props.item.gift.Name"
          class="gift-icon"
        />
        <img
          v-if="(!isBox || showGiftGrade)"
          :src="getGiftGradeIconUrl(item.grade)"
          :alt="item.grade.toString()"
          class="grade-icon"
        />
        
        <!-- Quantity display (similar to resource-quantity) -->
        <div
          class="resource-quantity"
          v-if="!isInputFocused && value"
        >
          {{ formatItemQuantity(value) }}
        </div>
        
        <!-- Input for editing quantity -->
        <div class="input-container">
          <input
            ref="inputEl"
            type="number"
            :value="value"
            :name="`${isBox ? 'box' : 'gift'}-${props.item.gift.Id}`"
            @input="(e) => emit('update:value', e)"
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
