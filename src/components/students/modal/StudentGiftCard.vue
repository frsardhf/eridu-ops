<script setup lang="ts">
import { GiftDataProps } from '../../../types/gift';

defineProps<{
  item: GiftDataProps,
  value?: number | string
}>();

const emit = defineEmits<{
  'update:value': [event: Event];
}>();

function handleInput(event: Event) {
  emit('update:value', event);
}
</script>

<template>
  <div class="gift-card">
    <div class="gift-header">
      <img 
        :src="`https://schaledb.com/images/item/icon/${item.gift.Icon}.webp`"
        :alt="item.gift.Name"
        class="gift-icon"
      />
    </div>
    <div class="gift-details">
      <div class="gift-grade">
        <img 
          :src="`https://schaledb.com/images/ui/Cafe_Interaction_Gift_0${item.grade}.png`"
          :alt="item.grade.toString()"
          class="grade-icon"
        />
        <span class="exp-value">{{ item.exp }} EXP</span>
      </div>
      <div class="gift-exp-info">
        <input
          type="number"
          :value="value"
          @input="handleInput"
          class="gift-input"
          min="0"
          placeholder="Amount"
        />
      </div>
    </div>
  </div>
</template>