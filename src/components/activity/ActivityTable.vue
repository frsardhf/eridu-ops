<script setup lang="ts">
import { $t } from '@/locales';
import type { ActivityEventRow } from '@/types/analytics';

defineProps<{
  title: string;
  hint: string;
  rows: ActivityEventRow[];
  mode: 'top' | 'recent';
  eventLabel: (row: ActivityEventRow) => string;
  routeLabel: (row: ActivityEventRow) => string;
  detailLabel: (row: ActivityEventRow) => string;
  formatNumber: (value: number) => string;
  formatTimestamp: (value?: string) => string;
}>();
</script>

<template>
  <section class="activity-table-panel">
    <div class="activity-table-heading">
      <h2>{{ title }}</h2>
      <p>{{ hint }}</p>
    </div>

    <div v-if="rows.length" class="activity-table-wrap">
      <table class="activity-table">
        <thead>
          <tr v-if="mode === 'top'">
            <th>{{ $t('activity.event') }}</th>
            <th>{{ $t('activity.route') }}</th>
            <th>{{ $t('activity.detail') }}</th>
            <th class="numeric">{{ $t('activity.count') }}</th>
          </tr>
          <tr v-else>
            <th>{{ $t('activity.time') }}</th>
            <th>{{ $t('activity.event') }}</th>
            <th>{{ $t('activity.context') }}</th>
            <th class="numeric">{{ $t('activity.count') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="mode === 'top'">
            <tr v-for="(row, index) in rows" :key="`${row.name}-${row.route}-${index}`">
              <td>{{ eventLabel(row) }}</td>
              <td>
                <span class="activity-route-chip">{{ routeLabel(row) }}</span>
              </td>
              <td>{{ detailLabel(row) }}</td>
              <td class="numeric strong">{{ formatNumber(row.count) }}</td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="(row, index) in rows" :key="`${row.timestamp}-${index}`">
              <td class="activity-time">{{ formatTimestamp(row.timestamp) }}</td>
              <td>{{ eventLabel(row) }}</td>
              <td>
                <span class="activity-route-chip">{{ routeLabel(row) }}</span>
                <span class="activity-row-detail">{{ detailLabel(row) }}</span>
              </td>
              <td class="numeric strong">{{ formatNumber(row.count) }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <p v-else class="activity-table-empty">{{ $t('activity.noData') }}</p>
  </section>
</template>

<style scoped>
.activity-table-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: color-mix(in srgb, var(--background-secondary) 70%, var(--background-primary));
}

.activity-table-heading {
  padding: 15px 16px;
  border-bottom: 1px solid var(--border-color);
}

.activity-table-heading h2 {
  margin: 0;
  font-size: 1rem;
}

.activity-table-heading p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.activity-table-wrap {
  overflow-x: auto;
}

.activity-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.activity-table th,
.activity-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
  vertical-align: middle;
}

.activity-table tbody tr:last-child td {
  border-bottom: 0;
}

.activity-table th {
  color: var(--text-secondary);
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.activity-table .numeric {
  text-align: right;
}

.activity-table .strong {
  color: var(--text-primary);
  font-weight: 800;
}

.activity-route-chip {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  color: var(--accent-color);
  font-weight: 700;
  white-space: nowrap;
}

.activity-row-detail {
  margin-left: 6px;
  color: var(--text-secondary);
}

.activity-time {
  color: var(--text-secondary);
  white-space: nowrap;
}

.activity-table-empty {
  margin: 0;
  padding: 42px 16px;
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 480px) {
  .activity-table {
    min-width: 540px;
  }
}
</style>
