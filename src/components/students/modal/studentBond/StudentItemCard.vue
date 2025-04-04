<script setup lang="ts">
import { GiftDataProps, BoxDataProps } from '../../../../types/gift';

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

function handleInput(event: Event) {
  emit('update:value', event);
}

const gift = props.item.gift;

const isInputDisabled = props.isBox && props.convertBox;
</script>

<template>
  <div class="gift-card" :class="{ 'box-card': isBox }">
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
      </div>
    </div>
    <div class="gift-details">
      <div class="gift-exp-info">
        <input
          type="number"
          :name="`${isBox ? 'box' : 'gift'}-${gift.Id}`"
          :value="value"
          @input="handleInput"
          class="gift-input"
          min="0"
          placeholder="Amount"
          :disabled="isInputDisabled"
        />
      </div>
    </div>
  </div>
</template>