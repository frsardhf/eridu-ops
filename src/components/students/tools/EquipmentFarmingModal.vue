<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEquipmentFarming, type FarmMultiplier } from '@/lib/hooks/useEquipmentFarming';
import { getEquipmentIconUrl } from '@/lib/utils/iconUtils';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import { $t } from '@/locales';

const emit = defineEmits<{ close: [] }>();

const { plan, multiplier, hasMissing } = useEquipmentFarming();
const multipliers: FarmMultiplier[] = [1, 2, 3];

// Per-stage breakdown is collapsed by default — the item rows are what eat space.
const expanded = ref<Record<number, boolean>>({});
const allExpanded = computed(
  () => plan.value.length > 0 && plan.value.every((s) => expanded.value[s.id]),
);
function toggleStage(id: number) {
  expanded.value[id] = !expanded.value[id];
}
function toggleAll() {
  const next = !allExpanded.value;
  const map: Record<number, boolean> = {};
  for (const s of plan.value) map[s.id] = next;
  expanded.value = map;
}

const totals = computed(() => {
  let runs = 0;
  let ap = 0;
  for (const s of plan.value) {
    runs += s.runs;
    ap += s.runs * s.ap;
  }
  return { runs, ap };
});

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}
useDocumentListener('keydown', onKeydown);
</script>

<template>
  <div class="efm-backdrop" @click.self="emit('close')">
    <section class="efm-modal" role="dialog" aria-modal="true" :aria-label="$t('equipmentFarming.title')">
      <header class="efm-head">
        <div class="efm-head-text">
          <h2>{{ $t('equipmentFarming.title') }}</h2>
          <p class="efm-sub">{{ $t('equipmentFarming.subtitle') }}</p>
        </div>
        <div class="efm-head-right">
          <div class="efm-mult" role="group" :aria-label="$t('equipmentFarming.dropEvent')">
            <button
              v-for="m in multipliers"
              :key="m"
              type="button"
              class="efm-mult-btn"
              :class="{ active: multiplier === m }"
              @click="multiplier = m"
            >{{ m }}×</button>
          </div>
          <button type="button" class="efm-close" :aria-label="$t('close')" @click="emit('close')">×</button>
        </div>
      </header>

      <!-- Totals + expand/collapse-all (sticky, above the scroll area) -->
      <div v-if="hasMissing" class="efm-summary">
        <div class="efm-summary-stats">
          <span class="efm-summary-runs">{{ $t('equipmentFarming.runs', { n: totals.runs.toLocaleString() }) }}</span>
          <span class="efm-dot">·</span>
          <span>{{ totals.ap.toLocaleString() }} AP</span>
          <span class="efm-dot">·</span>
          <span>{{ $t('equipmentFarming.stages', { n: plan.length }) }}</span>
        </div>
        <button type="button" class="efm-expand-all" @click="toggleAll">
          {{ allExpanded ? $t('equipmentFarming.collapseAll') : $t('equipmentFarming.expandAll') }}
        </button>
      </div>

      <div class="efm-body">
        <!-- Empty: nothing missing -->
        <div v-if="!hasMissing" class="efm-empty">
          <div class="efm-empty-check" aria-hidden="true">✓</div>
          <p>{{ $t('equipmentFarming.empty') }}</p>
        </div>

        <!-- Suggestions, grouped by stage; breakdown collapsed by default -->
        <div v-else class="efm-stages">
          <article v-for="s in plan" :key="s.id" class="efm-stage" :class="{ 'is-open': expanded[s.id] }">
            <button
              type="button"
              class="efm-stage-head"
              :aria-expanded="!!expanded[s.id]"
              @click="toggleStage(s.id)"
            >
              <span class="efm-stage-num">{{ s.area }}-{{ s.stage }}</span>
              <span class="efm-stage-runs">{{ $t('equipmentFarming.runs', { n: s.runs }) }}</span>
              <span class="efm-stage-ap">{{ (s.runs * s.ap).toLocaleString() }} AP</span>
              <svg class="efm-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <ul v-if="expanded[s.id]" class="efm-covers">
              <li v-for="c in s.covers" :key="c.equipId" class="efm-cover">
                <img :src="getEquipmentIconUrl(c.category, c.tier)" :alt="c.name" class="efm-cover-icon" loading="lazy" />
                <span class="efm-cover-name">{{ c.name }}</span>
                <span class="efm-cover-tier">T{{ c.tier }}</span>
                <span class="efm-cover-qty"><strong>≈{{ c.expected }}</strong> / {{ c.need }}</span>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.efm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.efm-modal {
  display: flex;
  flex-direction: column;
  width: min(640px, 100%);
  max-height: min(720px, calc(100vh - 48px));
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--background-primary);
  color: var(--text-primary);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
}

.efm-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.efm-head-text h2 {
  margin: 0;
  font-size: 1.02rem;
}

.efm-sub {
  margin: 2px 0 0;
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.efm-head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.efm-mult {
  display: inline-flex;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  overflow: hidden;
}

.efm-mult-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 10px;
  cursor: pointer;
}

.efm-mult-btn.active {
  background: var(--accent-color);
  color: #fff;
}

.efm-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}

.efm-close:hover {
  background: var(--card-background);
  color: var(--text-primary);
}

/* Totals bar */
.efm-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--card-background);
}

.efm-summary-stats {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.efm-summary-runs {
  font-weight: 800;
  color: var(--accent-color);
}

.efm-dot {
  opacity: 0.5;
}

.efm-expand-all {
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 4px 11px;
  cursor: pointer;
  white-space: nowrap;
}

.efm-expand-all:hover {
  background: var(--background-primary);
  color: var(--text-primary);
}

.efm-body {
  padding: 12px 16px;
  overflow-y: auto;
}

.efm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 36px 12px;
}

.efm-empty-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-positive) 16%, transparent);
  color: var(--color-positive);
  font-size: 1.4rem;
  font-weight: 900;
}

.efm-empty p {
  margin: 0;
  max-width: 34ch;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.efm-stages {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
  align-items: start;
}

.efm-stage {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-background);
  overflow: hidden;
}

/* An expanded card spans the full width so its breakdown has room to read. */
.efm-stage.is-open {
  grid-column: 1 / -1;
}

.efm-stage-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.efm-stage-head:hover {
  background: color-mix(in srgb, var(--text-primary) 4%, transparent);
}

.efm-stage.is-open .efm-stage-head {
  border-bottom: 1px solid var(--border-color);
}

.efm-stage-num {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.efm-stage-runs {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--accent-color);
}

.efm-stage-ap {
  margin-left: auto;
  font-size: 0.74rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.efm-chevron {
  align-self: center;
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
  transition: transform 0.16s ease;
}

.efm-stage.is-open .efm-chevron {
  transform: rotate(180deg);
}

.efm-covers {
  list-style: none;
  margin: 0;
  padding: 6px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.efm-cover {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 4px;
}

.efm-cover-icon {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  object-fit: cover;
  background: var(--background-primary);
}

.efm-cover-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.84rem;
}

.efm-cover-tier {
  flex: 0 0 auto;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  padding: 1px 5px;
}

.efm-cover-qty {
  flex: 0 0 auto;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.efm-cover-qty strong {
  color: var(--text-primary);
  font-weight: 800;
}
</style>
