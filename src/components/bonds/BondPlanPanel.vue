<script setup lang="ts">
import { computed, ref } from 'vue';
import { $t } from '@/locales';
import { CAFE_TAP_EXP, MAX_BOND_LEVEL } from '@/lib/constants/gameConstants';

const props = defineProps<{
  studentId: number;
  currentBond: number;
  currentBondExp: number;
  currentBondExpMax: number;
  targetBond: number;
  targetBondExp: number;
  targetBondExpMax: number;
  lessonExpRate: number;
  remainingExp: number;
  remainingXp: number;
  plannedExp: number;
  cafeExp: number;
  bonusExp: number;
  projectedBond: number;
}>();

const emit = defineEmits<{
  (e: 'update-current-exp', value: number): void;
  (e: 'update-target-bond', value: number): void;
  (e: 'update-target-exp', value: number): void;
}>();

const sourcesOpen = ref(false);
const cafeTapsNeeded = computed(() => Math.ceil(props.remainingExp / CAFE_TAP_EXP));
const lessonsNeeded = computed(() =>
  props.lessonExpRate > 0 ? Math.ceil(props.remainingExp / props.lessonExpRate) : 0,
);
const reachesMax = computed(() => props.projectedBond >= MAX_BOND_LEVEL);
const nextProjectedBond = computed(() => Math.min(props.projectedBond + 1, MAX_BOND_LEVEL));
const currentExpRequired = computed(() =>
  props.currentBond >= MAX_BOND_LEVEL ? 0 : props.currentBondExpMax + 1,
);
const targetExpRequired = computed(() =>
  props.targetBond >= MAX_BOND_LEVEL ? 0 : props.targetBondExpMax + 1,
);
const targetExpMin = computed(() =>
  props.targetBond === props.currentBond ? props.currentBondExp : 0,
);

function numberFromEvent(event: Event, fallback: number): number {
  const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
  return Number.isNaN(value) ? fallback : value;
}

function clampedNumberFromEvent(
  event: Event,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const input = event.target as HTMLInputElement;
  const value = Math.max(minimum, Math.min(maximum, numberFromEvent(event, fallback)));
  input.value = String(value);
  return value;
}
</script>

<template>
  <section class="bond-plan" :aria-label="$t('bondPlan')">
    <div class="bond-plan__positions">
      <div class="bond-plan__position">
        <span class="bond-plan__eyebrow">{{ $t('current') }}</span>
        <strong class="bond-plan__level">{{ $t('bond') }} {{ currentBond }}</strong>
        <div v-if="currentBond >= MAX_BOND_LEVEL" class="bond-plan__exp-field">
          <span>{{ $t('levelProgress') }}</span>
          <strong class="bond-plan__maxed">{{ $t('bondMaxed') }}</strong>
        </div>
        <label v-else class="bond-plan__exp-field" :for="`current-bond-exp-${studentId}`">
          <span>{{ $t('levelProgress') }}</span>
          <span class="bond-plan__exp-control">
            <input
              :id="`current-bond-exp-${studentId}`"
              :name="`current-bond-exp-${studentId}`"
              type="number"
              :min="0"
              :max="currentBondExpMax"
              :value="currentBondExp"
              @change="
                emit(
                  'update-current-exp',
                  clampedNumberFromEvent($event, currentBondExp, 0, currentBondExpMax),
                )
              "
            />
            <span>/ {{ currentExpRequired.toLocaleString() }} {{ $t('exp') }}</span>
          </span>
        </label>
      </div>

      <div class="bond-plan__position bond-plan__position--target">
        <span class="bond-plan__eyebrow">{{ $t('target') }}</span>
        <label class="bond-plan__level-input" :for="`target-bond-${studentId}`">
          <span>{{ $t('bond') }}</span>
          <input
            :id="`target-bond-${studentId}`"
            :name="`target-bond-${studentId}`"
            type="number"
            :min="currentBond"
            :max="MAX_BOND_LEVEL"
            :value="targetBond"
            @change="
              emit(
                'update-target-bond',
                clampedNumberFromEvent($event, targetBond, currentBond, MAX_BOND_LEVEL),
              )
            "
          />
        </label>
        <div v-if="targetBond >= MAX_BOND_LEVEL" class="bond-plan__exp-field">
          <span>{{ $t('levelProgress') }}</span>
          <strong class="bond-plan__maxed">{{ $t('bondMaxed') }}</strong>
        </div>
        <label v-else class="bond-plan__exp-field" :for="`target-bond-exp-${studentId}`">
          <span>{{ $t('levelProgress') }}</span>
          <span class="bond-plan__exp-control">
            <input
              :id="`target-bond-exp-${studentId}`"
              :name="`target-bond-exp-${studentId}`"
              type="number"
              :min="targetExpMin"
              :max="targetBondExpMax"
              :value="targetBondExp"
              @change="
                emit(
                  'update-target-exp',
                  clampedNumberFromEvent($event, targetBondExp, targetExpMin, targetBondExpMax),
                )
              "
            />
            <span>/ {{ targetExpRequired.toLocaleString() }} {{ $t('exp') }}</span>
          </span>
        </label>
      </div>
    </div>

    <div class="bond-plan__result" :class="{ 'bond-plan__result--complete': remainingExp === 0 }">
      <div class="bond-plan__result-grid">
        <div class="bond-plan__remaining">
          <span class="bond-plan__eyebrow">{{ $t('remaining') }}</span>
          <strong v-if="remainingExp > 0">
            {{ $t('expRemaining', { count: remainingExp.toLocaleString() }) }}
          </strong>
          <strong v-else>{{ $t('goalCovered') }}</strong>
          <span v-if="plannedExp > 0" class="bond-plan__planned">
            {{ $t('plannedExp', { count: plannedExp.toLocaleString() }) }}
          </span>
        </div>

        <div class="bond-plan__after-plan">
          <span class="bond-plan__eyebrow">{{ $t('afterPlan') }}</span>
          <strong>{{ $t('bond') }} {{ projectedBond }}</strong>
          <span v-if="reachesMax" class="bond-plan__next-level bond-plan__next-level--complete">
            {{ $t('bondMaxed') }}
          </span>
          <span v-else class="bond-plan__next-level">
            {{
              $t('expUntilBond', {
                count: remainingXp.toLocaleString(),
                level: nextProjectedBond,
              })
            }}
          </span>
        </div>

        <div v-if="remainingExp > 0" class="bond-plan__helpers">
          <span class="bond-plan__eyebrow">{{ $t('helperEquivalents') }}</span>
          <div class="bond-plan__helper-values">
            <span>{{ $t('cafeTapCount', { count: cafeTapsNeeded.toLocaleString() }) }}</span>
            <span class="bond-plan__or">{{ $t('or') }}</span>
            <span>
              {{
                $t('lessonRunCount', {
                  count: lessonsNeeded.toLocaleString(),
                  exp: lessonExpRate,
                })
              }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="bond-plan__sources-toggle"
      :aria-expanded="sourcesOpen"
      :aria-controls="`bond-plan-sources-${studentId}`"
      @click="sourcesOpen = !sourcesOpen"
    >
      <span>
        <strong>{{ $t('plannedSources') }}</strong>
        <small v-if="cafeExp > 0 || bonusExp > 0">
          {{ $t('cafeTaps') }} +{{ cafeExp.toLocaleString() }} · {{ $t('lessonsAndOtherExp') }} +{{
            bonusExp.toLocaleString()
          }}
        </small>
        <small v-else>{{ $t('addPlannedSources') }}</small>
      </span>
      <span class="bond-plan__chevron" :class="{ 'is-open': sourcesOpen }" aria-hidden="true">
        ▾
      </span>
    </button>

    <div v-if="sourcesOpen" :id="`bond-plan-sources-${studentId}`" class="bond-plan__sources">
      <slot name="sources" />
    </div>
  </section>
</template>

<style scoped>
.bond-plan {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--background-primary);
  overflow: hidden;
}

.bond-plan__positions {
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 1fr));
  align-items: center;
  gap: 24px;
  padding: 12px 14px;
  min-width: 0;
}

.bond-plan__position {
  display: grid;
  grid-template-rows: auto 32px auto;
  gap: 6px;
  min-width: 0;
}

.bond-plan__eyebrow {
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.bond-plan__level,
.bond-plan__level-input {
  min-height: 32px;
  color: var(--text-primary);
  font-size: 1.05rem;
  line-height: 1.2;
}

.bond-plan__level {
  display: flex;
  align-items: center;
}

.bond-plan__level-input {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}

.bond-plan__level-input input,
.bond-plan__exp-control input {
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--background-secondary);
  color: var(--text-primary);
  font: inherit;
  font-variant-numeric: tabular-nums;
}

.bond-plan__level-input input {
  width: 66px;
  padding: 4px 7px;
  color: var(--accent-color);
  font-weight: 700;
}

.bond-plan__exp-field {
  display: grid;
  grid-template-rows: auto minmax(30px, auto);
  gap: 3px;
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
}

.bond-plan__exp-control {
  display: flex;
  align-items: center;
  min-height: 30px;
  gap: 6px;
  color: var(--text-tertiary);
  font-size: 0.78rem;
  font-weight: 500;
  white-space: nowrap;
}

.bond-plan__maxed {
  display: flex;
  align-items: center;
  min-height: 30px;
  color: var(--color-bond-100);
  font-size: 0.82rem;
}

.bond-plan__exp-control input {
  width: 82px;
  padding: 5px 7px;
}

.bond-plan__level-input input:focus,
.bond-plan__exp-control input:focus {
  outline: 2px solid color-mix(in srgb, var(--accent-color) 25%, transparent);
  border-color: var(--accent-color);
}

.bond-plan__level-input input:disabled,
.bond-plan__exp-control input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.bond-plan__result {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-left: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--accent-color) 6%, var(--card-background));
  min-width: 0;
}

.bond-plan__result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 18px;
  width: 100%;
  min-width: 0;
}

.bond-plan__next-level {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
}

.bond-plan__next-level--complete {
  color: var(--color-bond-100);
}

.bond-plan__result--complete {
  background: color-mix(in srgb, var(--color-positive) 8%, var(--card-background));
}

.bond-plan__remaining,
.bond-plan__after-plan,
.bond-plan__helpers {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bond-plan__remaining strong,
.bond-plan__after-plan strong {
  color: var(--accent-color);
  font-size: 1rem;
}

.bond-plan__after-plan {
  padding-left: 18px;
  border-left: 1px solid var(--border-color);
}

.bond-plan__helpers {
  grid-column: 1 / -1;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.bond-plan__result--complete .bond-plan__remaining strong {
  color: var(--color-positive);
}

.bond-plan__planned {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.bond-plan__helper-values {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
}

.bond-plan__or {
  color: var(--text-tertiary);
  font-size: 0.72rem;
  font-weight: 500;
}

.bond-plan__sources-toggle {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 16px;
  border: none;
  border-top: 1px solid var(--border-color);
  background: var(--card-background);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  min-width: 0;
}

.bond-plan__sources-toggle > span:first-child {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.bond-plan__sources-toggle strong {
  font-size: 0.82rem;
}

.bond-plan__sources-toggle small {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bond-plan__sources-toggle:hover {
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 6%, var(--card-background));
}

.bond-plan__chevron {
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.bond-plan__chevron.is-open {
  transform: rotate(180deg);
}

.bond-plan__sources {
  grid-column: 1 / -1;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--card-background);
  min-width: 0;
}

@media (max-width: 760px) {
  .bond-plan {
    grid-template-columns: 1fr;
  }

  .bond-plan__result {
    border-top: 1px solid var(--border-color);
    border-left: none;
  }
}

@media (max-width: 480px) {
  .bond-plan__positions {
    grid-template-columns: 1fr;
  }

  .bond-plan__sources-toggle > span:first-child {
    flex-direction: column;
    gap: 2px;
  }

  .bond-plan__result-grid {
    grid-template-columns: 1fr;
  }

  .bond-plan__after-plan {
    padding-top: 8px;
    padding-left: 0;
    border-top: 1px solid var(--border-color);
    border-left: none;
  }
}
</style>
