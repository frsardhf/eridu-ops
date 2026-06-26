<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import GlobalNavbar from '@/components/navbar/GlobalNavbar.vue';
import Bond100EntriesModal from '@/components/bond100/Bond100EntriesModal.vue';
import Bond100SubmitModal from '@/components/bond100/Bond100SubmitModal.vue';
import Bond100StatsPopover from '@/components/bond100/Bond100StatsPopover.vue';
import Bond100Wall from '@/components/bond100/Bond100Wall.vue';
import SelectMenu from '@/components/shared/SelectMenu.vue';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { useOwnerMode } from '@/composables/useOwnerMode';
import { useImageExport } from '@/composables/useImageExport';
import { BOND100_SERVER_OPTIONS, BOND100_SORT_MODES } from '@/lib/constants/bond100';
import { filterSecondaryStudents } from '@/lib/constants/linkedStudents';
import { useStudentData } from '@/lib/hooks/useStudentData';
import {
  getBond100StudentEntries,
  getBond100Summary,
} from '@/lib/services/bond100Service';
import { getSettings, updateSetting } from '@/lib/utils/settingsStorage';
import { $t } from '@/locales';
import type {
  Bond100ServerFilter,
  Bond100SortMode,
  Bond100StudentEntriesResponse,
  Bond100StudentSummary,
  Bond100SummaryResponse,
} from '@/types/bond100';
import type { StudentProps } from '@/types/student';

const { studentData, isReady } = useStudentData();

const summary = ref<Bond100SummaryResponse | null>(null);
const isSummaryLoading = ref(false);
const summaryError = ref('');

const searchQuery = ref('');
const selectedServer = ref<Bond100ServerFilter>('all');
const showSubmit = ref(false);

const sortMode = ref<Bond100SortMode>(getSettings().bond100Sort ?? 'default');
watch(sortMode, (v) => updateSetting('bond100Sort', v));

const serverFilterOptions = computed<{ value: Bond100ServerFilter; label: string }[]>(() => [
  { value: 'all', label: $t('bond100.allServers') },
  ...BOND100_SERVER_OPTIONS.map(o => ({ value: o.code, label: $t(o.labelKey) })),
]);

const sortOptions = computed<{ value: Bond100SortMode; label: string }[]>(() =>
  BOND100_SORT_MODES.map(m => ({ value: m, label: $t(`bond100.sortModes.${m}`) }))
);

const infoOpen = ref(false);
const infoWrapEl = ref<HTMLElement | null>(null);

// Split the "about" blurb around the literal "arona.icu" so it can render as a
// link without baking markup into the locale string (works for EN + JP, both of
// which contain the literal token).
const ARONA_URL = 'https://arona.icu';
const aboutSourcesParts = computed(() => $t('bond100.aboutSources').split('arona.icu'));

const statsOpen = ref(false);
const statsWrapEl = ref<HTMLElement | null>(null);

function toggleInfo(event: Event) {
  event.stopPropagation();
  infoOpen.value = !infoOpen.value;
  if (infoOpen.value) statsOpen.value = false;
}

function toggleStats(event: Event) {
  event.stopPropagation();
  statsOpen.value = !statsOpen.value;
  if (statsOpen.value) infoOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (infoOpen.value && infoWrapEl.value && !infoWrapEl.value.contains(target)) {
    infoOpen.value = false;
  }
  if (statsOpen.value && statsWrapEl.value && !statsWrapEl.value.contains(target)) {
    statsOpen.value = false;
  }
}

useClickOutside(handleClickOutside);

const selectedStudent = ref<StudentProps | null>(null);
const selectedEntries = ref<Bond100StudentEntriesResponse | null>(null);
const isEntriesLoading = ref(false);
const entriesError = ref('');

const allStudents = computed<StudentProps[]>(() => {
  // The Hall is a Global-only wall: drop JP-only students (IsReleased[Global] is
  // false) so stray 0-count tiles don't appear and the "N of M" coverage uses
  // the real Global roster. Fail open if the flag is missing (keep the student).
  return filterSecondaryStudents(Object.values(studentData.value))
    .filter(s => s.IsReleased?.[1] !== false)
    .sort((a, b) => (a.DefaultOrder ?? a.Id) - (b.DefaultOrder ?? b.Id));
});

const summaryMap = computed(() => {
  return new Map<number, Bond100StudentSummary>(
    (summary.value?.students ?? []).map(item => [item.studentId, item])
  );
});

// Metrics follow the server dropdown (but NOT the search box) — they're
// dataset stats for the selected server, not the visible/filtered subset.
const totals = computed(() => {
  const students = summary.value?.students ?? [];

  if (selectedServer.value === 'all') {
    return {
      total: summary.value?.total ?? students.reduce((sum, item) => sum + item.count, 0),
      studentsRepresented: students.filter(item => item.count > 0).length,
    };
  }

  let total = 0;
  let studentsRepresented = 0;
  for (const item of students) {
    const n = item.byServer[selectedServer.value] ?? 0;
    if (n > 0) {
      total += n;
      studentsRepresented += 1;
    }
  }
  return { total, studentsRepresented };
});

const visibleCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return allStudents.value
    .map(student => {
      const item = summaryMap.value.get(student.Id) ?? null;
      return {
        student,
        summary: item,
        count: getVisibleCount(item),
      };
    })
    .filter(card => {
      const matchesQuery = !query || card.student.Name.toLowerCase().includes(query);
      return matchesQuery;
    })
    .sort((a, b) => {
      const byOrder = (a.student.DefaultOrder ?? a.student.Id) - (b.student.DefaultOrder ?? b.student.Id);

      if (sortMode.value === 'name') {
        return a.student.Name.localeCompare(b.student.Name) || byOrder;
      }

      if (sortMode.value === 'bond100') {
        const diff = b.count - a.count;
        return diff !== 0 ? diff : byOrder;
      }

      return byOrder;
    });
});

function getVisibleCount(item: Bond100StudentSummary | null): number {
  if (!item) return 0;
  if (selectedServer.value === 'all') return item.count;
  return item.byServer[selectedServer.value] ?? 0;
}

async function loadSummary() {
  isSummaryLoading.value = true;
  summaryError.value = '';

  try {
    summary.value = await getBond100Summary();
  } catch (error) {
    summaryError.value = error instanceof Error ? error.message : $t('bond100.summaryUnavailable');
    summary.value = {
      total: 0,
      students: [],
    };
  } finally {
    isSummaryLoading.value = false;
  }
}

// Guards against a stale fetch winning when the user reopens quickly:
// only the most recent openEntries call may write the result.
let entriesToken = 0;

async function openEntries(student: StudentProps) {
  const token = ++entriesToken;
  selectedStudent.value = student;
  selectedEntries.value = null;
  entriesError.value = '';
  isEntriesLoading.value = true;

  try {
    const res = await getBond100StudentEntries(student.Id);
    if (token === entriesToken) selectedEntries.value = res;
  } catch (error) {
    if (token === entriesToken) {
      entriesError.value = error instanceof Error ? error.message : $t('bond100.entriesUnavailable');
    }
  } finally {
    if (token === entriesToken) isEntriesLoading.value = false;
  }
}

function closeEntries() {
  selectedStudent.value = null;
  selectedEntries.value = null;
  entriesError.value = '';
}

// ── Owner-only high-res export ────────────────────────────────────────────────
const { isOwner } = useOwnerMode();
const { exporting, captureToPng } = useImageExport();
const exportHeaderRef = ref<HTMLElement | null>(null);

const snapshotLabel = computed(() => {
  const iso = summary.value?.snapshotDate;
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? ''
    : new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
});

// Fixed export layout: a wide 25-column grid rather than the responsive
// on-screen count, so the image is consistent regardless of window size.
const EXPORT_COLS = 25;
const EXPORT_TILE = 64;  // px
const EXPORT_GAP = 6;    // matches .bond100-wall gap
const EXPORT_BORDER = '#c8ccd2';  // soft neutral that reads cleanly on the white sheet

async function exportWall() {
  const wrap = document.querySelector<HTMLElement>('.bond100-wall-wrap');
  const wall = wrap?.querySelector<HTMLElement>('.bond100-wall') ?? null;
  const header = exportHeaderRef.value;
  if (!wrap || !header || exporting.value) return;

  // Capture the LIVE on-screen wall (near normal coords so modern-screenshot
  // renders it). Append a *clone* of the credit as a footer (cloning keeps
  // Vue's vdom untouched); it shows briefly during capture, then we remove it.
  const creditClone = header.cloneNode(true) as HTMLElement;
  wrap.appendChild(creditClone);

  // Snapshot styles we're about to override, then restore in finally.
  const prev = {
    width: wrap.style.width,
    maxWidth: wrap.style.maxWidth,
    cols: wall?.style.gridTemplateColumns ?? '',
  };
  // Widen to fit exactly 25 columns and pin the grid to 25 tracks.
  wrap.style.width = `${EXPORT_COLS * EXPORT_TILE + (EXPORT_COLS - 1) * EXPORT_GAP}px`;
  wrap.style.maxWidth = 'none';
  if (wall) wall.style.gridTemplateColumns = `repeat(${EXPORT_COLS}, minmax(0, 1fr))`;
  // Force the tile background + border vars so the (transparent) icons sit on
  // white and the cards get a clean neutral edge. Cascades via inheritance.
  wrap.style.setProperty('--background-primary', '#ffffff');
  wrap.style.setProperty('--border-color', EXPORT_BORDER);
  try {
    const date = summary.value?.snapshotDate ?? new Date().toISOString().slice(0, 10);
    await captureToPng(wrap, {
      scale: 2,
      backgroundColor: '#ffffff',   // always a clean white sheet, theme-independent
      fileName: `bond100-hall-${date}.png`,
    });
  } finally {
    creditClone.remove();
    wrap.style.removeProperty('--background-primary');
    wrap.style.removeProperty('--border-color');
    wrap.style.width = prev.width;
    wrap.style.maxWidth = prev.maxWidth;
    if (wall) wall.style.gridTemplateColumns = prev.cols;
  }
}

onMounted(loadSummary);
</script>

<template>
  <div class="bond100-page">
    <GlobalNavbar />

    <main class="bond100-body">
      <div class="bond100-toolbar">
        <label class="bond100-search">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="m21 20.3-5.5-5.5a7 7 0 1 0-1.1 1.1l5.5 5.5 1.1-1.1zM4.5 10a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0z"/>
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            :placeholder="$t('bond100.searchPlaceholder')"
          />
        </label>

        <button type="button" class="bond100-submit-btn" @click="showSubmit = true">
          + {{ $t('bond100.submit') }}
        </button>

        <SelectMenu
          v-model="selectedServer"
          :options="serverFilterOptions"
          :aria-label="$t('bond100.server')"
        />

        <SelectMenu
          v-model="sortMode"
          :options="sortOptions"
          :aria-label="$t('bond100.sort')"
        />

        <button
          v-if="isOwner"
          type="button"
          class="bond100-export-btn"
          :disabled="exporting"
          title="Generate high-res image"
          @click="exportWall"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{{ exporting ? 'Generating…' : 'Export' }}</span>
        </button>
      </div>

      <div class="bond100-metrics">
        <span><strong>{{ totals.total }}</strong> {{ $t('bond100.atBond100') }}</span>
        <span class="sep">·</span>
        <span><strong>{{ totals.studentsRepresented }}</strong> {{ $t('bond100.studentsRepresented').toLowerCase() }}</span>
        <span v-if="summary?.isMock || summaryError" class="bond100-note">
          {{ summaryError || $t('bond100.demoDataNote') }}
        </span>

        <div class="bond100-intro">
          <p class="bond100-subtitle">{{ $t('bond100.subtitle') }}</p>
          <div ref="statsWrapEl" class="bond100-info-wrap">
            <button
              type="button"
              class="bond100-info-btn"
              :class="{ open: statsOpen }"
              :aria-label="$t('bond100.stats.aria')"
              :aria-expanded="statsOpen"
              @click="toggleStats"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M4 19h4V9H4v10zm6 0h4V5h-4v14zm6 0h4v-7h-4v7z" />
              </svg>
            </button>
            <Bond100StatsPopover
              v-if="statsOpen"
              :summary="summary"
              :server-options="BOND100_SERVER_OPTIONS"
              :roster="allStudents"
            />
          </div>
          <div ref="infoWrapEl" class="bond100-info-wrap">
            <button
              type="button"
              class="bond100-info-btn"
              :class="{ open: infoOpen }"
              :aria-label="$t('bond100.aboutInfo')"
              :aria-expanded="infoOpen"
              @click="toggleInfo"
            >
              ?
            </button>
            <div v-if="infoOpen" class="bond100-info-popover" role="dialog" :aria-label="$t('bond100.aboutTitle')">
              <h3>{{ $t('bond100.aboutTitle') }}</h3>
              <p class="bond100-info-text">{{ $t('bond100.aboutCount') }}</p>
              <p class="bond100-info-text">
                <template v-if="aboutSourcesParts.length === 2">{{ aboutSourcesParts[0]
                  }}<a class="bond100-info-link" :href="ARONA_URL" target="_blank" rel="noopener noreferrer">arona.icu</a>{{ aboutSourcesParts[1] }}</template>
                <template v-else>{{ $t('bond100.aboutSources') }}</template>
              </p>
              <p class="bond100-info-text">{{ $t('bond100.aboutDelay') }}</p>
            </div>
          </div>
        </div>
      </div>

      <Bond100Wall
        :cards="visibleCards"
        :loading="isSummaryLoading || !isReady"
        @select-student="openEntries"
      />

      <!-- Parked export header (display:none). At export time a clone is
           prepended to the live wall and captured, so it never shows here. -->
      <div v-if="isOwner" class="bond100-export-frame" aria-hidden="true">
        <div ref="exportHeaderRef" class="bond100-export-header">
          <span class="bond100-export-handle">@idxyllune</span>
          <span class="bond100-export-sep">·</span>
          <span class="bond100-export-total"><strong>{{ totals.total }}</strong> {{ $t('bond100.atBond100') }}</span>
          <span class="bond100-export-sep">·</span>
          <span class="bond100-export-students"><strong>{{ totals.studentsRepresented }}</strong> {{ $t('bond100.stats.ofStudents', { total: allStudents.length }) }}</span>
          <span v-if="snapshotLabel" class="bond100-export-sep">·</span>
          <span v-if="snapshotLabel" class="bond100-export-date">{{ snapshotLabel }}</span>
        </div>
      </div>
    </main>

    <Bond100EntriesModal
      v-if="selectedStudent"
      :student="selectedStudent"
      :summary="summaryMap.get(selectedStudent.Id) ?? null"
      :entries-response="selectedEntries"
      :server-options="BOND100_SERVER_OPTIONS"
      :server-filter="selectedServer"
      :loading="isEntriesLoading"
      :error="entriesError"
      @close="closeEntries"
    />

    <Bond100SubmitModal
      v-if="showSubmit"
      :server-options="BOND100_SERVER_OPTIONS"
      @close="showSubmit = false"
    />
  </div>
</template>

<style scoped>
.bond100-page {
  position: fixed;
  inset: 0;
  background-color: var(--background-primary);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bond100-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.bond100-intro {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;   /* push the subtitle + ? to the end of the metrics row */
}

.bond100-subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.4;
}

.bond100-info-wrap {
  position: relative;
  flex: 0 0 auto;
}

.bond100-info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  transition: border-color 0.15s, color 0.15s;
}

.bond100-info-btn:hover,
.bond100-info-btn.open {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

/* Explicit size + fill so the lone SVG child can't collapse to 0 inside the
   fixed-size button (it has no CSS dimensions otherwise — only HTML attrs). */
.bond100-info-btn svg {
  display: block;
  width: 13px;
  height: 13px;
  fill: currentColor;
  flex: 0 0 auto;
}

.bond100-info-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;   /* anchored to the right since the ? now sits at the row's end */
  z-index: 1100;
  width: 300px;
  max-width: calc(100vw - 32px);
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--background-primary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.bond100-info-popover h3 {
  margin: 0 0 10px;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.bond100-info-text {
  margin: 0 0 8px;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.bond100-info-link {
  color: var(--accent-color);
  text-decoration: none;
}

.bond100-info-link:hover {
  text-decoration: underline;
}

.bond100-info-text:last-child {
  margin-bottom: 0;
}

.bond100-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.bond100-submit-btn {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--accent-color);
  background: var(--accent-color);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.bond100-submit-btn:hover {
  opacity: 0.9;
}

/* ── Owner-only export ─────────────────────────────────────── */
.bond100-export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  transition: border-color 0.15s, color 0.15s;
}

.bond100-export-btn:hover:not(:disabled) {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.bond100-export-btn:disabled {
  opacity: 0.6;
  cursor: progress;
}

/* Parks the export header out of the layout; a clone is what gets captured. */
.bond100-export-frame {
  display: none;
}

/* Rendered as a footer on the export (white sheet), so fixed dark-on-white
   colors keep it readable independent of the user's current theme. */
.bond100-export-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
  padding: 12px 4px 2px;
  border-top: 1px solid #e3e6ea;
  font-size: 1.05rem;
  color: #5b6470;
}

.bond100-export-handle {
  font-weight: 800;
  color: #000;
}

.bond100-export-header strong {
  color: #1c2430;
  font-weight: 800;
}

.bond100-export-sep {
  opacity: 0.45;
}

.bond100-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-secondary);
  flex: 1 1 180px;
  max-width: 260px;
  min-width: 140px;
}

.bond100-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 0.88rem;
}

.bond100-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.bond100-metrics strong {
  color: var(--text-primary);
  font-weight: 700;
  margin-right: 3px;
}

.bond100-metrics .sep {
  opacity: 0.5;
}

.bond100-note {
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--accent-color) 6%, var(--background-primary));
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
}

@media (max-width: 600px) {
  .bond100-intro {
    margin-left: 0;
    width: 100%;
  }
}
</style>
