<script setup lang="ts">
import { computed } from 'vue';
import { getStudentIconUrl } from '@/lib/utils/iconUtils';
import { colorWithOpacity, getBond100ServerColor } from '@/lib/utils/colorUtils';
import { $t } from '@/locales';
import type {
  Bond100ServerOption,
  Bond100ServerRegion,
  Bond100SummaryResponse,
} from '@/types/bond100';
import type { StudentProps } from '@/types/student';

const props = defineProps<{
  summary: Bond100SummaryResponse | null;
  serverOptions: Bond100ServerOption[];
  roster: StudentProps[];
}>();

const students = computed(() => props.summary?.students ?? []);
const total = computed(() => props.summary?.total ?? students.value.reduce((s, x) => s + x.count, 0));
const represented = computed(() => students.value.filter(x => x.count > 0).length);
const rosterCount = computed(() => props.roster.length);
const coveragePct = computed(() =>
  rosterCount.value ? Math.round((represented.value / rosterCount.value) * 100) : 0
);

const studentName = computed(() => {
  const map = new Map<number, string>(props.roster.map(s => [s.Id, s.Name]));
  return (id: number) => map.get(id) ?? `#${id}`;
});

const serverRows = computed(() => {
  const totals = new Map<string, number>();
  for (const s of students.value) {
    for (const [region, n] of Object.entries(s.byServer)) {
      if (n) totals.set(region, (totals.get(region) ?? 0) + n);
    }
  }
  const labels = new Map(props.serverOptions.map(o => [o.code, { label: $t(o.labelKey), short: o.shortLabel }]));
  const max = Math.max(1, ...totals.values());
  return [...totals.entries()]
    .map(([region, count]) => ({
      region,
      label: labels.get(region as Bond100ServerRegion)?.label ?? region,
      short: labels.get(region as Bond100ServerRegion)?.short ?? region,
      count,
      barPct: Math.round((count / max) * 100),
      sharePct: total.value ? Math.round((count / total.value) * 100) : 0,
      color: getBond100ServerColor(region),
    }))
    .sort((a, b) => b.count - a.count);
});

const topStudents = computed(() =>
  [...students.value]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(s => ({ id: s.studentId, name: studentName.value(s.studentId), count: s.count }))
);

const snapshotLabel = computed(() => {
  const iso = props.summary?.snapshotDate;
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
});

function barStyle(color: string, pct: number) {
  return { width: `${pct}%`, background: color };
}
function chipStyle(color: string) {
  return { color, background: colorWithOpacity(color, 0.14), borderColor: colorWithOpacity(color, 0.4) };
}
</script>

<template>
  <div class="bond100-stats-popover" role="dialog" :aria-label="$t('bond100.stats.aria')">
    <h3>{{ $t('bond100.stats.title') }}</h3>

    <p v-if="!total" class="bond100-stats-empty">{{ $t('bond100.stats.empty') }}</p>

    <template v-else>
    <p class="bond100-stats-headline">
      <strong>{{ total }}</strong> {{ $t('bond100.atBond100') }}
      <span class="sep">·</span>
      <strong>{{ represented }}</strong> {{ $t('bond100.studentsRepresented').toLowerCase() }}
    </p>

    <!-- By server -->
    <section class="bond100-stats-section">
      <p class="bond100-stats-label">{{ $t('bond100.stats.byServer') }}</p>
      <div v-for="row in serverRows" :key="row.region" class="bond100-stats-srv">
        <span class="bond100-stats-srv-chip" :style="chipStyle(row.color)">{{ row.short }}</span>
        <span class="bond100-stats-bar-track">
          <span class="bond100-stats-bar" :style="barStyle(row.color, row.barPct)"></span>
        </span>
        <span class="bond100-stats-srv-count">{{ row.count }}</span>
        <span class="bond100-stats-srv-pct">{{ row.sharePct }}%</span>
      </div>
    </section>

    <!-- Top students -->
    <section class="bond100-stats-section">
      <p class="bond100-stats-label">{{ $t('bond100.stats.topStudents') }}</p>
      <div v-for="s in topStudents" :key="s.id" class="bond100-stats-top">
        <img class="bond100-stats-top-icon" :src="getStudentIconUrl(s.id)" :alt="s.name" loading="lazy" />
        <span class="bond100-stats-top-name">{{ s.name }}</span>
        <span class="bond100-stats-top-count">{{ s.count }}</span>
      </div>
    </section>

    <!-- Coverage -->
    <section class="bond100-stats-section">
      <p class="bond100-stats-label">{{ $t('bond100.stats.coverage') }}</p>
      <p class="bond100-stats-coverage">
        <strong>{{ represented }}</strong>
        {{ $t('bond100.stats.ofStudents', { total: rosterCount }) }}
        <span class="sep">·</span>
        <strong>{{ coveragePct }}%</strong>
      </p>
      <span class="bond100-stats-bar-track wide">
        <span class="bond100-stats-bar" :style="{ width: `${coveragePct}%`, background: 'var(--accent-color)' }"></span>
      </span>
    </section>

    <p v-if="snapshotLabel" class="bond100-stats-footer">
      {{ $t('bond100.stats.updated') }} · {{ snapshotLabel }}
    </p>
    </template>
  </div>
</template>

<style scoped>
.bond100-stats-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1100;
  width: 290px;
  max-width: calc(100vw - 32px);
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--background-primary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  text-align: left;
}

.bond100-stats-popover h3 {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.bond100-stats-empty {
  margin: 6px 0 2px;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.bond100-stats-headline {
  margin: 0 0 12px;
  font-size: 0.84rem;
  color: var(--text-secondary);
}

.bond100-stats-headline strong {
  color: var(--text-primary);
  font-weight: 800;
}

.bond100-stats-headline .sep,
.bond100-stats-coverage .sep {
  opacity: 0.45;
  margin: 0 4px;
}

.bond100-stats-section + .bond100-stats-section {
  margin-top: 12px;
}

.bond100-stats-label {
  margin: 0 0 6px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-secondary);
  opacity: 0.85;
}

/* ── By-server rows ── */
.bond100-stats-srv {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}

.bond100-stats-srv-chip {
  flex: 0 0 52px;   /* fixed — wide enough for TW/HK, the longest label */
  width: 52px;
  text-align: center;
  padding: 2px 6px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  box-sizing: border-box;
}

.bond100-stats-bar-track {
  flex: 1;
  height: 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-secondary) 16%, transparent);
  overflow: hidden;
}

.bond100-stats-bar-track.wide {
  display: block;
  margin-top: 4px;
}

.bond100-stats-bar {
  display: block;
  height: 100%;
  border-radius: 999px;
}

.bond100-stats-srv-count {
  flex: 0 0 auto;
  min-width: 30px;
  text-align: right;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.bond100-stats-srv-pct {
  flex: 0 0 auto;
  min-width: 30px;
  text-align: right;
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

/* ── Top students ── */
.bond100-stats-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.bond100-stats-top-icon {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  object-fit: cover;
  border: 1px solid var(--border-color);
  background: var(--card-background);
}

.bond100-stats-top-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-primary);
}

.bond100-stats-top-count {
  flex: 0 0 auto;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

/* ── Coverage + footer ── */
.bond100-stats-coverage {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.bond100-stats-coverage strong {
  color: var(--text-primary);
  font-weight: 800;
}

.bond100-stats-footer {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  font-size: 0.74rem;
  color: var(--text-secondary);
}
</style>
