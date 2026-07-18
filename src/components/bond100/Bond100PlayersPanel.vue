<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import SearchSelect from '@/components/shared/SearchSelect.vue';
import { getStudentIconUrl } from '@/lib/utils/iconUtils';
import { colorWithOpacity, getBond100ServerColor } from '@/lib/utils/colorUtils';
import { $t } from '@/locales';
import type { Bond100Player, Bond100ServerFilter, Bond100ServerOption } from '@/types/bond100';
import type { StudentProps } from '@/types/student';

/**
 * Player-centric leaderboard: one dense row per player (rank, name, server,
 * count, student-icon strip), the inversion of the per-student wall. Replaces
 * arona's 10-per-page account ranking with client-side filters: count chips
 * (like arona's total filter) and a student picker ("most dedicated" view).
 */
const props = defineProps<{
  players: Bond100Player[];
  loading?: boolean;
  /** Page-toolbar search (filters player names here). */
  searchQuery: string;
  /** Page-toolbar server dropdown. */
  serverFilter: Bond100ServerFilter;
  serverOptions: Bond100ServerOption[];
  /** Global roster for student names (already linked-filtered by the page). */
  roster: StudentProps[];
}>();

const countFilter = ref<number | 'all'>('all');
const studentFilter = ref<number | null>(null);
// Incremental render: the full list is ~1400 rows; render in slices so the
// initial DOM stays light. Client-side only, no server pagination.
const PAGE_SIZE = 100;
const visibleLimit = ref(PAGE_SIZE);

watch(
  () => [props.searchQuery, props.serverFilter, countFilter.value, studentFilter.value],
  () => {
    visibleLimit.value = PAGE_SIZE;
  },
);

const shortLabelByServer = computed(() => {
  const map = new Map<string, string>();
  for (const o of props.serverOptions) map.set(o.code, o.shortLabel);
  return map;
});

const nameById = computed(() => {
  const map = new Map<number, string>();
  for (const s of props.roster) map.set(s.Id, s.Name);
  return map;
});

/** Count chips: the distinct collection sizes present, descending (arona's
 * total filter, one tap). Populations double as free stats. */
const countOptions = computed(() => {
  const byCount = new Map<number, number>();
  for (const p of props.players) byCount.set(p.count, (byCount.get(p.count) ?? 0) + 1);
  return Array.from(byCount.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([count, population]) => ({ count, population }));
});

/** Student picker options: students that appear on the leaderboard, ordered by
 * how many players maxed them (popular picks first). */
const studentOptions = computed(() => {
  const freq = new Map<number, number>();
  for (const p of props.players) {
    for (const id of p.studentIds) freq.set(id, (freq.get(id) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([id]) => ({
      value: id,
      label: nameById.value.get(id) ?? String(id),
      icon: getStudentIconUrl(id),
    }));
});

const filteredPlayers = computed(() => {
  const query = props.searchQuery.trim().toLowerCase();
  const server = props.serverFilter;
  const count = countFilter.value;
  const student = studentFilter.value;

  return props.players.filter((p) => {
    if (server !== 'all' && p.serverRegion !== server) return false;
    if (count !== 'all' && p.count !== count) return false;
    if (student !== null && !p.studentIds.includes(student)) return false;
    if (query && !p.playerName.toLowerCase().includes(query)) return false;
    return true;
  });
});

const visiblePlayers = computed(() => filteredPlayers.value.slice(0, visibleLimit.value));
const hasMore = computed(() => filteredPlayers.value.length > visibleLimit.value);

// Expanded rows keyed by (server, name); session-scoped.
const expandedKeys = ref(new Set<string>());

function rowKey(p: Bond100Player): string {
  return `${p.serverRegion}|${p.playerName}`;
}

function toggleExpanded(p: Bond100Player) {
  const key = rowKey(p);
  const next = new Set(expandedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedKeys.value = next;
}

// Half-width cells fit ~5 icons at 48px before the name gets squeezed.
const STRIP_MAX = 5;

/** Icon strip ids: the picked student pins to the front (with a highlight ring
 * in the template) so filtered rows read as "them + what else". */
function stripIds(p: Bond100Player): number[] {
  const picked = studentFilter.value;
  if (picked === null || !p.studentIds.includes(picked)) return p.studentIds;
  return [picked, ...p.studentIds.filter((id) => id !== picked)];
}

function studentName(id: number): string {
  return nameById.value.get(id) ?? String(id);
}

// Same tinted server-pill treatment as the entries modal (12% bg, 40% border).
function pillStyle(server: string): Record<string, string> {
  const color = getBond100ServerColor(server);
  return {
    color,
    background: colorWithOpacity(color, 0.12),
    borderColor: colorWithOpacity(color, 0.4),
  };
}
</script>

<template>
  <section class="b100p">
    <div class="b100p-filters">
      <div class="b100p-chips" role="group" :aria-label="$t('bond100.players.countFilterAria')">
        <button
          type="button"
          class="b100p-chip"
          :class="{ active: countFilter === 'all' }"
          @click="countFilter = 'all'"
        >
          {{ $t('bond100.players.allCounts') }}
        </button>
        <button
          v-for="o in countOptions"
          :key="o.count"
          type="button"
          class="b100p-chip"
          :class="{ active: countFilter === o.count }"
          @click="countFilter = countFilter === o.count ? 'all' : o.count"
        >
          {{ o.count }} <span class="b100p-chip-pop">({{ o.population }})</span>
        </button>
      </div>

      <SearchSelect
        v-model="studentFilter"
        :options="studentOptions"
        :placeholder="$t('bond100.players.allStudents')"
        :clear-label="$t('bond100.players.allStudents')"
        :aria-label="$t('bond100.players.studentFilterAria')"
      />

      <span class="b100p-meta">{{
        $t('bond100.players.playerCount', { n: filteredPlayers.length })
      }}</span>
    </div>

    <div v-if="loading" class="b100p-state">{{ $t('loading') }}...</div>

    <div v-else-if="!filteredPlayers.length" class="b100p-state">
      {{ $t('bond100.players.noPlayers') }}
    </div>

    <ol v-else class="b100p-list">
      <li v-for="(p, i) in visiblePlayers" :key="rowKey(p)" class="b100p-item">
        <button
          type="button"
          class="b100p-row"
          :class="{ expanded: expandedKeys.has(rowKey(p)) }"
          :aria-expanded="expandedKeys.has(rowKey(p))"
          @click="toggleExpanded(p)"
        >
          <span class="b100p-rank">#{{ i + 1 }}</span>
          <span class="b100p-server" :style="pillStyle(p.serverRegion)">{{
            shortLabelByServer.get(p.serverRegion) ?? p.serverRegion
          }}</span>
          <span class="b100p-name" :title="p.playerName">{{ p.playerName }}</span>
          <span class="b100p-strip">
            <img
              v-for="id in stripIds(p).slice(0, STRIP_MAX)"
              :key="id"
              class="b100p-strip-icon"
              :class="{ picked: id === studentFilter }"
              :src="getStudentIconUrl(id)"
              :alt="studentName(id)"
              :title="studentName(id)"
              loading="lazy"
            />
            <span v-if="p.studentIds.length > STRIP_MAX" class="b100p-strip-more"
              >+{{ p.studentIds.length - STRIP_MAX }}</span
            >
          </span>
        </button>

        <div v-if="expandedKeys.has(rowKey(p))" class="b100p-detail">
          <div v-for="id in stripIds(p)" :key="id" class="b100p-detail-student">
            <img
              class="b100p-detail-icon"
              :class="{ picked: id === studentFilter }"
              :src="getStudentIconUrl(id)"
              :alt="studentName(id)"
              loading="lazy"
            />
            <span class="b100p-detail-name">{{ studentName(id) }}</span>
          </div>
        </div>
      </li>
    </ol>

    <button v-if="hasMore" type="button" class="b100p-more" @click="visibleLimit += PAGE_SIZE">
      {{ $t('bond100.players.showMore') }}
    </button>
  </section>
</template>

<style scoped>
.b100p-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.b100p-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.b100p-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
}

.b100p-chip:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.b100p-chip.active {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 14%, transparent);
  color: var(--accent-color);
}

.b100p-chip-pop {
  font-weight: 500;
  opacity: 0.75;
}

.b100p-meta {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.b100p-state {
  padding: 48px 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Two-up grid: full-width rows left a dead zone between the name (left) and
   the icon strip (right), so split the width instead. align-items: start keeps
   an expanded cell from stretching its row neighbor. */
.b100p-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 6px;
}

.b100p-item {
  min-width: 0;
}

.b100p-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--background-primary);
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color 0.15s;
}

.b100p-row:hover,
.b100p-row.expanded {
  border-color: var(--accent-color);
}

.b100p-rank {
  flex: 0 0 44px;
  color: var(--text-tertiary);
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.b100p-name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.88rem;
  font-weight: 700;
}

/* Fixed column so names align: sized for the longest short label (TW/HK). */
.b100p-server {
  flex: 0 0 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 0;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.b100p-strip {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
}

.b100p-strip-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
  flex: 0 0 auto;
}

.b100p-strip-icon.picked {
  border: 2px solid var(--accent-color);
}

.b100p-strip-more {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
}

.b100p-detail {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 6px;
  padding: 8px 10px 10px 54px;
}

.b100p-detail-student {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.b100p-detail-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
  flex: 0 0 auto;
}

.b100p-detail-icon.picked {
  border: 2px solid var(--accent-color);
}

.b100p-detail-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
}

.b100p-more {
  display: block;
  margin: 12px auto 0;
  padding: 6px 18px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.b100p-more:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

/* Below this the half-width cells get cramped (same breakpoint family as the
   entries modal's two-column collapse): back to one column. */
@media (max-width: 860px) {
  .b100p-list {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .b100p-rank {
    flex-basis: 32px;
  }

  .b100p-detail {
    padding-left: 10px;
  }
}
</style>
