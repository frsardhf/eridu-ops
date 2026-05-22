<script setup lang="ts">
import { computed, ref } from 'vue';
import GiftCard from '@/components/bonds/gift/GiftCard.vue';
import GiftBreakdownTable, {
  type BreakdownRow,
} from '@/components/bonds/gift/GiftBreakdownTable.vue';
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

function buildBreakdown(
  items: GiftProps[] | undefined,
  values: Record<string | number, number> | undefined,
): BreakdownRow[] {
  if (!items?.length || !values) return [];
  const rows: BreakdownRow[] = [];
  for (const item of items) {
    const qty = values[item.gift.Id] ?? 0;
    if (qty <= 0) continue;
    const exp = item.exp ?? 0;
    if (exp <= 0) continue;
    rows.push({ id: item.gift.Id, name: item.gift.Name, exp, qty, total: qty * exp });
  }
  return rows;
}

// Per-section breakdown rows — only gifts the user has allocated. Renders
// nothing when no allocations, so the section stays compact at empty state.
const favoredBreakdown = computed<BreakdownRow[]>(() => [
  ...buildBreakdown(props.student.Gifts, props.giftFormData),
  ...buildBreakdown(props.student.Boxes, props.boxFormData),
]);

const otherBreakdown = computed<BreakdownRow[]>(() =>
  buildBreakdown(props.nonFavorGifts, props.nonFavorValues),
);

const favoredTotalExp = computed(() =>
  favoredBreakdown.value.reduce((s, r) => s + r.total, 0),
);

const otherTotalExp = computed(() =>
  otherBreakdown.value.reduce((s, r) => s + r.total, 0),
);

// Breakdown collapse state — default closed so the editor stays compact;
// users click the total chip to expand the per-gift contributions.
const showFavoredBreakdown = ref(false);
const showOtherBreakdown = ref(false);

const convertBox = computed(() => !!props.convertBox);
</script>

<template>
  <div class="gifts-grid-wrapper">
    <div
      v-if="showFavoredLabel && (hasGifts || hasBoxes)"
      class="gifts-section-label gifts-section-label--row"
    >
      <span>{{ $t('favoredGifts') }}</span>
      <button
        v-if="favoredTotalExp > 0"
        type="button"
        class="gifts-breakdown-toggle"
        :aria-expanded="showFavoredBreakdown"
        @click="showFavoredBreakdown = !showFavoredBreakdown"
      >
        <span class="gifts-breakdown-arrow" :class="{ 'is-open': showFavoredBreakdown }">▸</span>
        {{ favoredTotalExp.toLocaleString() }} {{ $t('exp') }}
      </button>
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

    <GiftBreakdownTable
      v-if="showFavoredBreakdown && favoredBreakdown.length"
      :rows="favoredBreakdown"
    />

    <!-- Non-favored gifts section (BondsPage only) -->
    <template v-if="hasNonFavor">
      <div class="gifts-section-label gifts-section-label--row">
        <span>{{ $t('otherGifts') }}</span>
        <span class="gifts-section-totals">
          <span>{{ $t('totalSr') }}: <strong>{{ nonFavorTotals.sr }}</strong></span>
          <span>{{ $t('totalSsr') }}: <strong>{{ nonFavorTotals.ssr }}</strong></span>
          <button
            v-if="otherTotalExp > 0"
            type="button"
            class="gifts-breakdown-toggle"
            :aria-expanded="showOtherBreakdown"
            @click="showOtherBreakdown = !showOtherBreakdown"
          >
            <span class="gifts-breakdown-arrow" :class="{ 'is-open': showOtherBreakdown }">▸</span>
            {{ otherTotalExp.toLocaleString() }} {{ $t('exp') }}
          </button>
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

      <GiftBreakdownTable
        v-if="showOtherBreakdown && otherBreakdown.length"
        :rows="otherBreakdown"
      />
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

.gifts-breakdown-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}

.gifts-breakdown-toggle:hover {
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.gifts-breakdown-arrow {
  display: inline-block;
  font-size: 0.65rem;
  transition: transform 0.15s ease;
}

.gifts-breakdown-arrow.is-open {
  transform: rotate(90deg);
}

</style>
