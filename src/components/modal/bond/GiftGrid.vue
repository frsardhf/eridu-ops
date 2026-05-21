<script setup lang="ts">
import { computed } from 'vue';
import GiftCard from '@/components/modal/bond/GiftCard.vue';
import { StudentProps } from '@/types/student';
import { GiftProps } from '@/types/gift';
import { $t } from '@/locales';

const props = defineProps<{
  student: StudentProps,
  giftFormData: Record<string, number>,
  boxFormData: Record<string, number>,
  convertBox?: boolean,
  shouldShowGiftGrade: (id: number) => boolean,
  // Optional: when provided (BondsPage), renders a second "Other gifts" section
  // below the favored gifts. Modal Bond tab omits this — only the favored
  // section renders. Empty array also renders nothing.
  nonFavorGifts?: GiftProps[],
  // Per-gift quantity source for the non-favored section. BondsPage passes
  // `nonFavorGiftsMap` from useStudentGifts so the cards reflect the actual
  // tracked individual values (not 0 from giftFormData).
  nonFavorValues?: Record<number, number>,
  // When true, renders a "Favored gifts" section header above the main grid
  // for visual parity with the "Other gifts" section. BondsPage sets this true.
  showFavoredLabel?: boolean,
}>();

const emit = defineEmits<{
  (e: 'update-gift', id: number, event: Event): void,
  (e: 'update-box', id: number, event: Event): void,
  (e: 'update-nonfavor', id: number, event: Event): void,
}>();

const hasGifts = computed(() => (props.student.Gifts?.length ?? 0) > 0);
const hasBoxes = computed(() => (props.student.Boxes?.length ?? 0) > 0);
const hasNonFavor = computed(() => (props.nonFavorGifts?.length ?? 0) > 0);

// SR and SSR non-favored gifts each share a single EXP value within their rarity,
// so a per-rarity total doubles as a sanity check against the aggregate that
// bond EXP is computed from (boxFormData[SR_GIFT_MATERIAL_ID] / [SSR_]).
const nonFavorTotals = computed(() => {
  const values = props.nonFavorValues ?? {};
  let sr = 0;
  let ssr = 0;
  for (const item of props.nonFavorGifts ?? []) {
    const qty = values[item.gift.Id] ?? 0;
    if (qty <= 0) continue;
    if (item.gift.Rarity === 'SR') sr += qty;
    else if (item.gift.Rarity === 'SSR') ssr += qty;
  }
  return { sr, ssr };
});

const convertBox = computed(() => !!props.convertBox);
</script>

<template>
  <div class="gifts-grid-wrapper">
    <div v-if="showFavoredLabel && (hasGifts || hasBoxes)" class="gifts-section-label">
      {{ $t('favoredGifts') }}
    </div>
    <!-- Favored gifts section -->
    <div v-if="hasGifts || hasBoxes" class="gifts-grid">
      <template v-if="hasGifts">
        <GiftCard
          v-for="(item) in student.Gifts"
          :key="`gift-${item.gift.Id}`"
          :name="`gift-${item.gift.Id}`"
          :item="item"
          :value="giftFormData[item.gift.Id]"
          :is-box="false"
          @update:value="(e) => emit('update-gift', item.gift.Id, e)"
        />
      </template>

      <template v-if="hasBoxes">
        <GiftCard
          v-for="(item) in student.Boxes"
          :key="`box-${item.gift.Id}`"
          :name="`box-${item.gift.Id}`"
          :item="item"
          :value="boxFormData[item.gift.Id]"
          :convert-box="convertBox"
          :show-gift-grade="shouldShowGiftGrade(Number(item.gift.Id))"
          :is-box="true"
          @update:value="(e) => emit('update-box', Number(item.gift.Id), e)"
        />
      </template>
    </div>

    <!-- Non-favored gifts section (BondsPage only) -->
    <template v-if="hasNonFavor">
      <div class="gifts-section-label gifts-section-label--row">
        <span>{{ $t('otherGifts') }}</span>
        <span class="gifts-section-totals">
          <span>{{ $t('totalSr') }}: <strong>{{ nonFavorTotals.sr }}</strong></span>
          <span>{{ $t('totalSsr') }}: <strong>{{ nonFavorTotals.ssr }}</strong></span>
        </span>
      </div>
      <div class="gifts-grid">
        <GiftCard
          v-for="item in nonFavorGifts"
          :key="`nonfav-${item.gift.Id}`"
          :name="`nonfav-${item.gift.Id}`"
          :item="item"
          :value="(nonFavorValues ?? {})[item.gift.Id]"
          :is-box="false"
          @update:value="(e) => emit('update-nonfavor', item.gift.Id, e)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.gifts-grid-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gifts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
  height: auto;
  background-color: var(--background-primary);
}

.gifts-section-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  padding: 8px 4px 4px;
  border-top: 1px solid var(--border-color);
}

.gifts-section-label--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.gifts-section-totals {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
}

.gifts-section-totals strong {
  color: var(--text-primary);
  font-weight: 700;
}
</style>
