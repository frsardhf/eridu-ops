<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import GlobalNavbar from '@/components/navbar/GlobalNavbar.vue';
import SelectMenu from '@/components/shared/SelectMenu.vue';
import ActivityTable from '@/components/activity/ActivityTable.vue';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { useNavbarSettings } from '@/lib/hooks/useNavbarSettings';
import { $t } from '@/locales';
import type { ActivityEventRow, ActivityReport } from '@/types/analytics';

type ActivityRange = 7 | 30 | 90;

const { getActivityReport } = useAnalytics();
const { currentLanguage } = useNavbarSettings();
const range = ref<ActivityRange>(7);
const report = ref<ActivityReport | null>(null);
const loading = ref(false);
const error = ref('');

const rangeOptions = computed<{ value: ActivityRange; label: string }[]>(() => [
  { value: 7, label: $t('activity.ranges.seven') },
  { value: 30, label: $t('activity.ranges.thirty') },
  { value: 90, label: $t('activity.ranges.ninety') },
]);

const failureRate = computed(() => {
  const summary = report.value?.summary;
  if (!summary) return 0;
  const total = summary.completed + summary.failed;
  return total ? (summary.failed / total) * 100 : 0;
});

const maxDailyEvents = computed(() =>
  Math.max(1, ...(report.value?.daily.map((point) => Number(point.events)) ?? [])),
);

const numberFormatter = computed(() => new Intl.NumberFormat(localeCode()));

function localeCode(): string {
  if (currentLanguage.value === 'jp') return 'ja-JP';
  if (currentLanguage.value === 'kr') return 'ko-KR';
  return 'en-US';
}

function formatNumber(value: number): string {
  return numberFormatter.value.format(Number(value));
}

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(localeCode(), { month: 'short', day: 'numeric' }).format(date);
}

function formatTimestamp(value?: string): string {
  if (!value) return $t('activity.notAvailable');
  return new Intl.DateTimeFormat(localeCode(), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function eventLabel(row: ActivityEventRow): string {
  return $t(`activity.events.${row.name}`);
}

function routeLabel(row: ActivityEventRow): string {
  return $t(`activity.routes.${row.route}`);
}

function detailLabel(row: ActivityEventRow): string {
  const parts: string[] = [];
  if (row.feature) parts.push($t(`activity.features.${row.feature}`));
  if (row.action) parts.push($t(`activity.actions.${row.action}`));
  return parts.join(' · ') || $t('activity.notAvailable');
}

async function loadReport(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    report.value = await getActivityReport(range.value);
  } catch {
    error.value = $t('activity.unavailable');
  } finally {
    loading.value = false;
  }
}

watch(range, loadReport);
onMounted(loadReport);
</script>

<template>
  <div class="activity-page">
    <GlobalNavbar compact />

    <main class="activity-body">
      <header class="activity-header">
        <div>
          <div class="activity-kicker">{{ $t('activity.private') }}</div>
          <h1>{{ $t('activity.title') }}</h1>
          <p>{{ $t('activity.subtitle') }}</p>
        </div>

        <div class="activity-controls">
          <SelectMenu
            v-model="range"
            :options="rangeOptions"
            :aria-label="$t('activity.range')"
            align="right"
          />
          <button type="button" class="activity-button" :disabled="loading" @click="loadReport">
            {{ loading ? $t('activity.loading') : $t('activity.refresh') }}
          </button>
        </div>
      </header>

      <div v-if="error" class="activity-state activity-state--error">
        <span>{{ error }}</span>
        <button type="button" class="activity-button" @click="loadReport">
          {{ $t('activity.retry') }}
        </button>
      </div>

      <template v-else-if="report">
        <section class="activity-summary" :aria-label="$t('activity.summary')">
          <article class="activity-stat">
            <span>{{ $t('activity.totalEvents') }}</span>
            <strong>{{ formatNumber(report.summary.events) }}</strong>
          </article>
          <article class="activity-stat">
            <span>{{ $t('activity.sessions') }}</span>
            <strong>{{ formatNumber(report.summary.sessions) }}</strong>
          </article>
          <article class="activity-stat">
            <span>{{ $t('activity.completed') }}</span>
            <strong>{{ formatNumber(report.summary.completed) }}</strong>
          </article>
          <article class="activity-stat">
            <span>{{ $t('activity.failureRate') }}</span>
            <strong>{{ failureRate.toFixed(1) }}%</strong>
          </article>
        </section>

        <section class="activity-panel activity-chart-panel">
          <div class="activity-panel-heading">
            <div>
              <h2>{{ $t('activity.dailyActivity') }}</h2>
              <p>{{ $t('activity.dailyHint') }}</p>
            </div>
            <span>{{ $t('activity.updated', { time: formatTimestamp(report.generatedAt) }) }}</span>
          </div>

          <div v-if="report.daily.length" class="activity-chart-scroll">
            <div class="activity-chart" :style="{ '--point-count': report.daily.length }">
              <div v-for="point in report.daily" :key="point.day" class="activity-bar-column">
                <div class="activity-bar-track">
                  <div
                    class="activity-bar"
                    :style="{ height: `${Math.max(3, (point.events / maxDailyEvents) * 100)}%` }"
                    :title="`${formatDay(point.day)}: ${formatNumber(point.events)}`"
                  ></div>
                </div>
                <span>{{ formatDay(point.day) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="activity-empty">{{ $t('activity.noData') }}</p>
        </section>

        <div class="activity-data-grid">
          <ActivityTable
            :title="$t('activity.topActions')"
            :hint="$t('activity.topActionsHint')"
            :rows="report.top"
            mode="top"
            :event-label="eventLabel"
            :route-label="routeLabel"
            :detail-label="detailLabel"
            :format-number="formatNumber"
            :format-timestamp="formatTimestamp"
          />
          <ActivityTable
            :title="$t('activity.recentActivity')"
            :hint="$t('activity.recentHint')"
            :rows="report.recent"
            mode="recent"
            :event-label="eventLabel"
            :route-label="routeLabel"
            :detail-label="detailLabel"
            :format-number="formatNumber"
            :format-timestamp="formatTimestamp"
          />
        </div>
      </template>

      <div v-else class="activity-state">{{ $t('activity.loading') }}</div>
    </main>
  </div>
</template>

<style scoped>
.activity-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--background-primary);
  color: var(--text-primary);
}

.activity-body {
  flex: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;
  overflow: auto;
}

.activity-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.activity-kicker {
  margin-bottom: 5px;
  color: var(--accent-color);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.activity-header h1 {
  margin: 0;
  font-size: clamp(1.7rem, 3vw, 2.35rem);
}

.activity-header p {
  margin: 5px 0 0;
  color: var(--text-secondary);
}

.activity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.activity-button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.activity-button:hover:not(:disabled) {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.activity-button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.activity-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.activity-stat,
.activity-chart-panel,
.activity-state {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: color-mix(in srgb, var(--background-secondary) 70%, var(--background-primary));
}

.activity-stat {
  min-width: 0;
  padding: 15px 16px;
}

.activity-stat span {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
}

.activity-stat strong {
  display: block;
  color: var(--accent-color);
  font-size: clamp(1.35rem, 3vw, 1.8rem);
}

.activity-chart-panel {
  margin-bottom: 10px;
  overflow: hidden;
}

.activity-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 16px;
  border-bottom: 1px solid var(--border-color);
}

.activity-panel-heading h2 {
  margin: 0;
  font-size: 1rem;
}

.activity-panel-heading p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.activity-panel-heading > span {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.activity-chart-scroll {
  overflow-x: auto;
}

.activity-chart {
  --point-count: 7;
  display: grid;
  grid-template-columns: repeat(var(--point-count), minmax(34px, 1fr));
  align-items: end;
  gap: 7px;
  min-width: calc(var(--point-count) * 42px);
  height: 190px;
  padding: 18px 16px 12px;
}

.activity-bar-column {
  display: grid;
  grid-template-rows: 1fr auto;
  align-items: end;
  gap: 7px;
  height: 100%;
  min-width: 0;
}

.activity-bar-track {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 7px;
  background: color-mix(in srgb, var(--border-color) 45%, transparent);
}

.activity-bar {
  position: absolute;
  inset: auto 0 0;
  min-height: 3px;
  border-radius: 7px;
  background: var(--accent-color);
}

.activity-bar-column > span {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 0.65rem;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-data-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
  gap: 10px;
}

.activity-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 120px;
  padding: 20px;
  color: var(--text-secondary);
}

.activity-state--error {
  border-color: color-mix(in srgb, var(--color-negative) 55%, var(--border-color));
}

.activity-empty {
  margin: 0;
  padding: 42px 16px;
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 800px) {
  .activity-body {
    padding: 16px;
  }

  .activity-header {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .activity-controls {
    justify-content: space-between;
  }

  .activity-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .activity-data-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .activity-body {
    padding: 12px;
  }

  .activity-panel-heading {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
