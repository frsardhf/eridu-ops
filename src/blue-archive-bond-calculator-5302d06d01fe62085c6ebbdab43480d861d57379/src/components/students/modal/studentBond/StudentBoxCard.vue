<script setup lang="ts">
import { BoxDataProps } from '../../../../types/gift';

defineProps<{
  item: BoxDataProps,
  value?: number | string,
  convertBox: boolean,
  showGiftGrade: boolean
}>();

const emit = defineEmits<{
  'update:value': [event: Event];
}>();

function handleInput(event: Event) {
  emit('update:value', event);
}
</script>

<template>
  <div class="gift-card box-card">
    <div class="gift-header">
      <div class="gift-icon-container">
        <img 
          :src="`https://schaledb.com/images/item/full/${item.gift.Icon}.webp`"
          :alt="item.gift.Name"
          class="gift-icon"
        />
        <img 
          v-if="showGiftGrade"
          :src="`https://schaledb.com/images/ui/Cafe_Interaction_Gift_0${item.grade}.png`"
          :alt="item.grade.toString()"
          class="grade-icon"
        />
      </div>
    </div>
    <div class="gift-details">
      <div class="gift-exp-info">
        <input
          type="number"
          :value="value"
          @input="handleInput"
          class="gift-input"
          min="0"
          placeholder="Amount"
          :disabled="convertBox"
        />
      </div>
    </div>
  </div>
</template>