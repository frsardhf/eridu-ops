<script setup lang="ts">
import { computed, ref } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { $t } from '@/locales';
import {
  CAFE_TAP_EXP,
  MAX_CAFE_TAPS_PER_DAY,
} from '@/lib/constants/gameConstants';
import {
  computeCafeDays,
  computeCafeExp,
  isoToDate,
  dateToIso,
} from '@/lib/utils/bondExpUtils';
import type { OtherExpDataProps } from '@/types/gift';
import '@/styles/modalActions.css';

const props = defineProps<{
  data: OtherExpDataProps;
}>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<OtherExpDataProps>): void;
  (e: 'reset'): void;
  (e: 'close'): void;
}>();

// Datepicker min = today's Date object (VueDatePicker uses Date, our model
// uses ISO YYYY-MM-DD — convert at the boundary so storage stays clean).
const todayDate = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

// Start date — empty stored value displays as today (and `computeCafeDays`
// treats it as today too) so users don't have to set it unless they're
// planning a future-start campaign.
const cafeStartDate = computed<Date | null>({
  get: () => isoToDate(props.data.cafeStartDateIso) ?? todayDate,
  set: (v) => emit('update', { cafeStartDateIso: dateToIso(v) }),
});

const cafeEndDate = computed<Date | null>({
  get: () => isoToDate(props.data.cafeTargetDateIso),
  set: (v) => emit('update', { cafeTargetDateIso: dateToIso(v) }),
});

// End date can't precede start; falls back to today when start is empty.
const endMinDate = computed(() => isoToDate(props.data.cafeStartDateIso) ?? todayDate);

/**
 * Format the picked date for display inside the picker input. We use a
 * function (rather than a token string) because in VueDatePicker v12 the
 * formatter lives in `formats.input` — the top-level `format` prop is the
 * *parser* (string → Date), not the display formatter.
 */
const dpFormats = {
  input: (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
};

const cafeDays = computed(() =>
  computeCafeDays(
    props.data.cafeStartDateIso,
    props.data.cafeTargetDateIso,
    props.data.cafeDateInclusive,
  ),
);

const cafeExp = computed(() => computeCafeExp(props.data.cafeTapsPerDay, cafeDays.value));
const bonusExp = computed(() => Math.max(0, props.data.bonusExp || 0));
const totalExp = computed(() => cafeExp.value + bonusExp.value);

function onTapsChange(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  const clamped = Math.max(0, Math.min(MAX_CAFE_TAPS_PER_DAY, Number.isNaN(v) ? 0 : v));
  emit('update', { cafeTapsPerDay: clamped });
}

function toggleInclusive() {
  emit('update', { cafeDateInclusive: !props.data.cafeDateInclusive });
}

function onBonusChange(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  emit('update', { bonusExp: Math.max(0, Number.isNaN(v) ? 0 : v) });
}

function onClearBonus() {
  emit('update', { bonusExp: 0 });
}

// Reference accordion: lesson EXP rates by area rank. The full SchaleDB
// table is 6 rows but rows 1–4 all give 15 EXP, so we collapse to 3.
const showLessonRates = ref(false);

const lessonRates = [
  { rank: '1–10', exp: 15, bonus: '10–25%' },
  { rank: '11',   exp: 20, bonus: '25%' },
  { rank: '12',   exp: 25, bonus: '25%' },
];
</script>

<template>
  <Teleport to="body">
    <div class="oe-backdrop" @click.self="emit('close')">
      <div class="oe-modal" role="dialog" :aria-label="$t('otherExpSources')">
        <div class="oe-header">
          <span class="oe-title">{{ $t('otherExpSources') }}</span>
          <button class="oe-close" :title="$t('close')" @click="emit('close')">✕</button>
        </div>

        <!-- Cafe taps -->
        <section class="oe-section">
          <h3 class="oe-section-title">
            {{ $t('cafeTaps') }}
            <img src="/assets/headpat.png" alt="" class="oe-section-icon" aria-hidden="true" />
          </h3>
          <div class="oe-row">
            <label class="oe-field">
              <span class="oe-label">{{ $t('tapsPerDay') }}</span>
              <input
                type="number"
                class="oe-input oe-input--num"
                :min="0"
                :max="MAX_CAFE_TAPS_PER_DAY"
                :value="data.cafeTapsPerDay"
                @input="onTapsChange"
              />
            </label>

            <label class="oe-field oe-field--half">
              <span class="oe-label">{{ $t('startDate') }}</span>
              <VueDatePicker
                v-model="cafeStartDate"
                :enable-time-picker="false"
                auto-apply
                :formats="dpFormats"
                :placeholder="$t('startDate')"
                :clearable="true"
                class="oe-datepicker"
              />
            </label>

            <label class="oe-field oe-field--half">
              <span class="oe-label">{{ $t('endDate') }}</span>
              <VueDatePicker
                v-model="cafeEndDate"
                :min-date="endMinDate"
                :enable-time-picker="false"
                auto-apply
                :formats="dpFormats"
                :placeholder="$t('endDate')"
                :clearable="true"
                class="oe-datepicker"
              />
            </label>
          </div>

          <div class="oe-cafe-total">
            <span class="oe-cafe-total-label">{{ $t('total') }}</span>
            <span class="oe-cafe-total-value">
              {{ cafeExp.toLocaleString() }} {{ $t('exp') }}
            </span>
            <span class="oe-cafe-total-formula">
              · {{ data.cafeTapsPerDay }} × {{ cafeDays }} × {{ CAFE_TAP_EXP }}
            </span>
            <span class="oe-cafe-total-meta">
              <span class="oe-derived-days">
                {{ cafeDays }} {{ cafeDays === 1 ? $t('day') : $t('days') }}
              </span>
              <button
                type="button"
                class="oe-chip"
                :class="{ 'oe-chip--active': data.cafeDateInclusive }"
                :title="$t('includeTodayTooltip')"
                @click="toggleInclusive"
              >
                {{ data.cafeDateInclusive ? $t('inclusiveAbbr') : $t('exclusiveAbbr') }}
              </button>
            </span>
          </div>
        </section>

        <!-- Bonus EXP -->
        <section class="oe-section">
          <h3 class="oe-section-title">
            {{ $t('bonusExp') }}
            <button
              type="button"
              class="oe-section-toggle"
              :aria-expanded="showLessonRates"
              @click="showLessonRates = !showLessonRates"
            >
              <span class="oe-section-toggle-arrow" :class="{ 'is-open': showLessonRates }">▸</span>
              {{ $t('lessonRates') }}
            </button>
          </h3>
          <div class="oe-row">
            <div class="oe-field oe-field--grow">
              <div class="oe-date-wrap">
                <input
                  type="number"
                  class="oe-input"
                  min="0"
                  :value="data.bonusExp || 0"
                  @input="onBonusChange"
                />
                <button
                  v-if="data.bonusExp > 0"
                  type="button"
                  class="oe-inline-clear"
                  :title="$t('clear')"
                  @click="onClearBonus"
                >✕</button>
              </div>
            </div>
          </div>

          <table v-if="showLessonRates" class="oe-rate-table">
            <thead>
              <tr>
                <th>{{ $t('areaRank') }}</th>
                <th>{{ $t('expPerLesson') }}</th>
                <th>{{ $t('bonusChance') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in lessonRates" :key="row.rank">
                <td>{{ row.rank }}</td>
                <td>{{ row.exp }}</td>
                <td>{{ row.bonus }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Totals -->
        <div class="oe-total-row">
          <span class="oe-total-label">{{ $t('total') }}</span>
          <span class="oe-total-value">{{ totalExp.toLocaleString() }} {{ $t('exp') }}</span>
        </div>

        <!-- Footer -->
        <div class="oe-footer">
          <button class="modal-btn modal-btn-cancel" @click="emit('reset')">
            {{ $t('clearAll') }}
          </button>
          <button class="modal-btn modal-btn-confirm" @click="emit('close')">
            {{ $t('done') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.oe-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.oe-modal {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 18px 20px;
  min-width: 320px;
  max-width: 460px;
  width: 92%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.oe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.oe-title {
  font-size: 1.05em;
  font-weight: 700;
  color: var(--text-primary);
}

.oe-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  padding: 4px 8px;
  border-radius: 6px;
}

.oe-close:hover {
  color: var(--color-negative);
  background: rgba(255, 80, 80, 0.08);
}

.oe-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--background-primary);
}

.oe-section-title {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.oe-section-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}

/* Section title's right-side toggle (accordion trigger for the lesson-rates
   reference). Plain text + chevron; no button chrome so it sits naturally
   inside the heading. */
.oe-section-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
  border-radius: 4px;
}

.oe-section-toggle:hover {
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.oe-section-toggle-arrow {
  display: inline-block;
  transition: transform 0.15s ease;
  font-size: 0.65rem;
}

.oe-section-toggle-arrow.is-open {
  transform: rotate(90deg);
}

/* Lesson-rates reference table. Compact, secondary styling so it reads as
   help content rather than competing with the main inputs. */
.oe-rate-table {
  width: 100%;
  margin-top: 8px;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.oe-rate-table th,
.oe-rate-table td {
  padding: 4px 8px;
  text-align: left;
}

.oe-rate-table th {
  color: var(--text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.68rem;
  border-bottom: 1px solid var(--border-color);
}

.oe-rate-table td {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.oe-rate-table tbody tr + tr td {
  border-top: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
}

.oe-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.oe-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.oe-field--grow {
  flex: 1;
}

/* Two date fields share the row, each taking half the remaining space
   after tapsPerDay's fixed column. min-width: 0 lets them shrink when
   the picker's intrinsic width would otherwise force a wrap. */
.oe-field--half {
  flex: 1 1 0;
  min-width: 0;
}

.oe-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.oe-input {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.oe-input--num {
  width: 64px;
}

/* Vue Datepicker — map their CSS vars to our theme so the calendar popup
   matches our colors instead of the library's default blue/light theme. */
.oe-datepicker {
  --dp-background-color: var(--background-secondary);
  --dp-text-color: var(--text-primary);
  --dp-hover-color: color-mix(in srgb, var(--accent-color) 14%, transparent);
  --dp-hover-text-color: var(--text-primary);
  --dp-primary-color: var(--accent-color);
  --dp-primary-text-color: white;
  --dp-secondary-color: var(--text-secondary);
  --dp-border-color: var(--border-color);
  --dp-border-color-hover: var(--accent-color);
  --dp-disabled-color: var(--background-primary);
  --dp-icon-color: var(--text-secondary);
  --dp-input-padding: 6px 30px 6px 10px;
  --dp-border-radius: 6px;
  --dp-cell-border-radius: 6px;
  --dp-font-family: inherit;
  --dp-font-size: 0.9rem;
}

.oe-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.oe-date-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.oe-inline-clear {
  position: absolute;
  right: 4px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.oe-inline-clear:hover {
  color: var(--color-negative);
}

.oe-derived-days {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
}

/* Cafe sub-total: label + value + formula on the left, days + chip
   pushed to the right via the meta group's margin-left: auto. */
.oe-cafe-total {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.85rem;
}

.oe-cafe-total-meta {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.oe-cafe-total-label {
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
}

.oe-cafe-total-value {
  color: var(--accent-color);
  font-weight: 700;
}

.oe-cafe-total-formula {
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

.oe-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--background-secondary);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.oe-chip--active {
  border-color: var(--accent-color);
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
}

.oe-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.oe-total-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-color) 10%, var(--background-primary));
  border: 1px solid color-mix(in srgb, var(--accent-color) 30%, var(--border-color));
}

.oe-total-label {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.oe-total-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--accent-color);
}

.oe-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
