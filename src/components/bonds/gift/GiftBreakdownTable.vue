<script setup lang="ts">
import { computed } from 'vue';

export interface BreakdownRow {
  id: number;
  name: string;
  exp: number;
  qty: number;
  total: number;
}

const props = defineProps<{
  rows: BreakdownRow[];
}>();

const cols = computed<[BreakdownRow[], BreakdownRow[]]>(() => {
  const mid = Math.ceil(props.rows.length / 2);
  return [props.rows.slice(0, mid), props.rows.slice(mid)];
});
</script>

<template>
  <div class="breakdown-grid">
    <table
      v-for="(col, idx) in cols"
      :key="idx"
      class="breakdown-table"
    >
      <tbody>
        <tr v-for="row in col" :key="row.id">
          <td class="breakdown-name">{{ row.name }}</td>
          <td class="breakdown-exp">{{ row.exp.toLocaleString() }}</td>
          <td class="breakdown-mult">× {{ row.qty }}</td>
          <td class="breakdown-total">= {{ row.total.toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.breakdown-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 6px;
}

.breakdown-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.breakdown-table tbody tr:nth-child(even) {
  background: var(--background-primary);
}

.breakdown-table td {
  padding: 2px 6px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.breakdown-table td.breakdown-name {
  color: var(--text-primary);
  width: 100%;
  text-align: left;
}

.breakdown-table td.breakdown-exp {
  text-align: right;
}

.breakdown-table td.breakdown-mult,
.breakdown-table td.breakdown-total {
  text-align: left;
}
</style>
