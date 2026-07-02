<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import { useWindowResize } from '@/composables/dom/useWindowResize';
import { useStudentImages } from '@/composables/useStudentImages';
import { colorWithOpacity, getBond100ServerColor } from '@/lib/utils/colorUtils';
import { formatBond100Freshness } from '@/lib/utils/bond100Freshness';
import { $t } from '@/locales';
import type {
  Bond100Entry,
  Bond100ServerFilter,
  Bond100ServerRegion,
  Bond100ServerOption,
  Bond100StudentEntriesResponse,
  Bond100StudentSummary,
} from '@/types/bond100';
import type { StudentProps } from '@/types/student';

const props = defineProps<{
  student: StudentProps;
  summary: Bond100StudentSummary | null;
  entriesResponse: Bond100StudentEntriesResponse | null;
  serverOptions: Bond100ServerOption[];
  serverFilter: Bond100ServerFilter;
  loading: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

// Hero portrait + background, matching StudentModal's header: a transparent
// character cutout over a blurred collection-BG scene, with a load shimmer.
const {
  portraitSrc, backgroundSrc, imageLoading,
  handlePortraitLoad, handlePortraitError, handleBackgroundLoad, handleBackgroundError,
} = useStudentImages(toRef(() => props.student));

const serverLabelMap = computed(() => {
  return new Map(props.serverOptions.map(option => [option.code, $t(option.labelKey)]));
});

const serverShortLabelMap = computed(() => {
  return new Map(props.serverOptions.map(option => [option.code, option.shortLabel]));
});

function resolveLabel(serverRegion: string): string {
  return serverLabelMap.value.get(serverRegion as Bond100ServerRegion) ?? serverRegion;
}

function resolveShortLabel(serverRegion: string): string {
  return serverShortLabelMap.value.get(serverRegion as Bond100ServerRegion) ?? serverRegion;
}

const allEntries = computed(() => props.entriesResponse?.entries ?? []);

// Entries shown respect the page's server dropdown ('all' = no filter).
const entries = computed(() =>
  props.serverFilter === 'all'
    ? allEntries.value
    : allEntries.value.filter(e => e.serverRegion === props.serverFilter)
);

const isFiltered = computed(() => props.serverFilter !== 'all');
const activeServerLabel = computed(() =>
  isFiltered.value ? resolveShortLabel(props.serverFilter) : ''
);

function deriveServerBreakdown(list: Bond100Entry[]): Partial<Record<Bond100ServerRegion, number>> {
  const counts: Partial<Record<Bond100ServerRegion, number>> = {};
  for (const entry of list) {
    counts[entry.serverRegion] = (counts[entry.serverRegion] ?? 0) + 1;
  }
  return counts;
}

const totalCount = computed(() => {
  if (isFiltered.value) {
    return props.summary?.byServer?.[props.serverFilter as Bond100ServerRegion] ?? entries.value.length;
  }
  return props.summary?.count ?? entries.value.length;
});

// Breakdown pills only make sense for the unfiltered view; when a single server
// is selected, the total + the server badge already convey it.
const serverRows = computed(() => {
  if (isFiltered.value) return [];
  const byServer = props.summary?.byServer ?? deriveServerBreakdown(allEntries.value);
  return Object.entries(byServer)
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([serverRegion, count]) => ({
      serverRegion,
      label: resolveLabel(serverRegion),
      shortLabel: resolveShortLabel(serverRegion),
      count: count ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
});

// Per-student data freshness (the rolling sweep refreshes students separately).
const freshnessLabel = computed(() =>
  formatBond100Freshness(props.entriesResponse?.fetchedAt ?? props.summary?.fetchedAt)
);

function pillStyle(server: string): Record<string, string> {
  const color = getBond100ServerColor(server);
  return {
    color,
    background: colorWithOpacity(color, 0.12),
    borderColor: colorWithOpacity(color, 0.4),
  };
}

// ── Layout ────────────────────────────────────────────────────
// Every entry is shown in one scrollable view (no pagination), so players who
// used to land on a later page are no longer buried. The list area is a fixed
// ROWS_PER_COLUMN rows tall (see the body height) so every modal is the same
// size; shorter lists leave empty rows, longer lists scroll.
const ROWS_PER_COLUMN = 10;
// Below this viewport width two columns get cramped, so the list collapses to a
// single column.
const SINGLE_COLUMN_MAX_WIDTH = 800;
const isNarrow = ref(false);
useWindowResize(() => { isNarrow.value = window.innerWidth < SINGLE_COLUMN_MAX_WIDTH; });

// ── Search: narrow the visible list by player name ────────────
// The footer search only appears once a list is long enough to be worth
// scanning. It filters the rows only; the header total + breakdown still
// describe the full set (the search is a find tool, not a re-count).
const SEARCH_MIN_COUNT = 1;
const searchQuery = ref('');
const showSearch = computed(() => entries.value.length >= SEARCH_MIN_COUNT);
const filteredEntries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return entries.value;
  return entries.value.filter(e => e.playerName.toLowerCase().includes(q));
});

// Fill the left column to ROWS_PER_COLUMN first, then spill into the right, so a
// 14-entry list reads 10 + 4 rather than a balanced 7 + 7. Stay single-column
// until the left overflows. For long lists where both columns pass the cap,
// balance them so the two sides scroll together evenly.
const entryColumns = computed<Bond100Entry[][]>(() => {
  const list = filteredEntries.value;
  if (list.length === 0) return [];
  if (isNarrow.value || list.length <= ROWS_PER_COLUMN) return [list];
  const col1 = Math.max(ROWS_PER_COLUMN, Math.ceil(list.length / 2));
  return [list.slice(0, col1), list.slice(col1)];
});

// ── View mode: entry list or removal guidelines ──────────────────────────────
// Submission ("add me") now lives in a global toolbar button on /hall, since
// arona's /refresh is account-level, not per-student.
type Mode = 'list' | 'guidelines';
const mode = ref<Mode>('list');

function openGuidelines() { mode.value = 'guidelines'; }
function backToList() { mode.value = 'list'; }

// Scrollable entry list element (reset to the top when the student changes).
const bodyEl = ref<HTMLElement | null>(null);

// Reset search + scroll to the top + close the guidelines panel whenever a new
// student is opened or the filter changes.
watch([() => props.entriesResponse, () => props.serverFilter], () => {
  backToList();
  searchQuery.value = '';
  if (bodyEl.value) bodyEl.value.scrollTop = 0;
});

// Escape clears a non-empty search (and is swallowed so it doesn't also close
// the modal); an empty search lets Escape fall through to the global handler.
function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && searchQuery.value) {
    searchQuery.value = '';
    event.stopPropagation();
  }
}

// Detect script from player name so the browser picks the right CJK font.
// Hangul, Hiragana/Katakana, and CJK Ideographs share U+4E00-9FFF; without
// a lang hint the browser always uses the first font in the stack that covers
// that block (Noto Serif KR), making all three scripts look identical.
function detectLang(text: string): string | undefined {
  if (/[가-힣ᄀ-ᇿ㄰-㆏]/.test(text)) return 'ko';
  if (/[぀-ヿ]/.test(text)) return 'ja';
  if (/[一-鿿豈-﫿]/.test(text)) return 'zh-TW';
  return undefined;
}

// ── Keyboard: Escape backs out of guidelines, else closes the modal ──────────
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (mode.value !== 'list') backToList();
  else emit('close');
}

useDocumentListener('keydown', onKeydown);
</script>

<template>
  <div class="bond100-modal-backdrop" @click.self="emit('close')">
    <section class="bond100-entry-modal" role="dialog" aria-modal="true" :aria-label="$t('bond100.entriesTitle', { name: student.Name })">
      <div class="bond100-hero">
        <div v-if="backgroundSrc" class="bond100-hero-bg">
          <img
            :src="backgroundSrc"
            alt=""
            aria-hidden="true"
            @load="handleBackgroundLoad"
            @error="handleBackgroundError"
          />
        </div>
        <div v-else class="bond100-hero-bg-fallback" aria-hidden="true"></div>

        <div class="bond100-hero-fg">
          <img
            :src="portraitSrc"
            :alt="student.Name"
            @load="handlePortraitLoad"
            @error="handlePortraitError"
          />
        </div>

        <div v-if="imageLoading" class="bond100-hero-shimmer" aria-hidden="true">
          <div class="bond100-hero-shimmer-bar"></div>
        </div>

        <div class="bond100-hero-overlay">
          <p class="bond100-hero-kicker">{{ $t('bond100.entriesKicker') }}</p>
          <h2 class="bond100-hero-name">{{ student.Name }}</h2>
        </div>
      </div>

      <div class="bond100-content">
        <header v-if="serverRows.length || totalCount || isFiltered" class="bond100-content-head">
          <p class="bond100-total">
            <strong>{{ totalCount }}</strong>
            <span>{{ $t('bond100.atBond100') }}</span>
            <span v-if="isFiltered" class="bond100-total-server">· {{ activeServerLabel }}</span>
          </p>
          <div class="bond100-server-chips">
            <span
              v-for="row in serverRows"
              :key="row.serverRegion"
              class="bond100-server-chip"
              :style="pillStyle(row.serverRegion)"
              :title="row.label"
            >
              <span class="bond100-server-chip-label">{{ row.shortLabel }}</span>
              <span class="bond100-server-chip-sep">·</span>
              <strong class="bond100-server-chip-count">{{ row.count }}</strong>
            </span>
          </div>
          <p v-if="freshnessLabel" class="bond100-freshness">{{ freshnessLabel }}</p>
        </header>

        <div ref="bodyEl" class="bond100-content-body">
          <!-- ── List ── -->
          <template v-if="mode === 'list'">
            <div v-if="loading" class="bond100-modal-state" role="status" :aria-label="$t('loading')">
              <span class="bond100-spinner" aria-hidden="true"></span>
            </div>
            <div v-else-if="error" class="bond100-modal-state error">
              {{ error }}
            </div>
            <div
              v-else-if="filteredEntries.length"
              class="bond100-entry-cols"
              :class="{ single: entryColumns.length === 1 }"
            >
              <table v-for="(col, ci) in entryColumns" :key="ci" class="bond100-entry-table">
                <tbody>
                  <tr v-for="(entry, ri) in col" :key="`${ci}-${ri}`" :lang="detectLang(entry.playerName)">
                    <td class="bond100-entry-server">
                      <span
                        class="bond100-server-pill"
                        :style="pillStyle(entry.serverRegion)"
                        :title="resolveLabel(entry.serverRegion)"
                      >
                        {{ resolveShortLabel(entry.serverRegion) }}
                      </span>
                    </td>
                    <td class="bond100-entry-name" :title="entry.playerName">{{ entry.playerName }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else-if="searchQuery" class="bond100-empty-line">{{ $t('bond100.noEntriesSearch') }}</p>
            <p v-else class="bond100-empty-line">{{ $t('bond100.noEntries') }}</p>
          </template>

          <!-- ── Removal guidelines (handled on arona's side) ── -->
          <div v-else-if="mode === 'guidelines'" class="bond100-guidelines">
            <p class="bond100-guidelines-body">{{ $t('bond100.form.guidelinesBody') }}</p>
            <a
              class="bond100-guidelines-link"
              href="https://arona.icu/searchFriendDetail"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>arona.icu/searchFriendDetail</span>
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M9 7h8v8"/>
              </svg>
            </a>
          </div>
        </div>

        <footer v-if="mode === 'list'" class="bond100-modal-footer">
          <div class="bond100-footer-left">
            <button
              type="button"
              class="bond100-footer-btn ghost bond100-removal-btn"
              :title="$t('bond100.requestRemoval')"
              :aria-label="$t('bond100.requestRemoval')"
              @click="openGuidelines"
            >
              <svg class="bond100-removal-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M17 8 22 13M22 8 17 13"/>
              </svg>
              <span class="bond100-removal-label">{{ $t('bond100.requestRemoval') }}</span>
            </button>
          </div>

          <div v-if="showSearch" class="bond100-footer-search">
            <svg class="bond100-search-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              class="bond100-search-input"
              :placeholder="$t('bond100.searchEntries')"
              :aria-label="$t('bond100.searchEntries')"
              @keydown="onSearchKeydown"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="bond100-search-clear"
              :aria-label="$t('clear')"
              @click="searchQuery = ''"
            >×</button>
          </div>
        </footer>

        <footer v-else-if="mode === 'guidelines'" class="bond100-modal-footer bond100-form-footer">
          <button type="button" class="bond100-footer-btn" @click="backToList">{{ $t('bond100.form.back') }}</button>
        </footer>
      </div>
    </section>
  </div>
</template>

<style scoped>
.bond100-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.bond100-entry-modal {
  display: flex;
  width: min(840px, 100%);
  /* Height follows the entry count: a short list yields a short modal (and a
     shorter cropped hero), a long list grows to the viewport cap and the body
     scrolls. The floor keeps a tiny list from collapsing the hero to a sliver. */
  min-height: 180px;
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: var(--background-primary);
  color: var(--text-primary);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
}

/* ── Hero (left): blurred scene + character cutout, like StudentModal ──── */
.bond100-hero {
  position: relative;
  flex: 0 0 248px;
  overflow: hidden;
  isolation: isolate;
  background: var(--card-background);
}

.bond100-hero-bg,
.bond100-hero-bg-fallback {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.bond100-hero-bg {
  overflow: hidden;
}

.bond100-hero-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(2px) saturate(1.08);
  transform: scale(1.12);
}

.bond100-hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 14, 28, 0.18) 0%,
    rgba(10, 14, 28, 0.3) 55%,
    rgba(10, 14, 28, 0.55) 100%
  );
}

.bond100-hero-bg-fallback {
  background: linear-gradient(140deg, var(--header-gradient-start), var(--header-gradient-end));
}

/* Absolute (out of flow) so the portrait's intrinsic height can't drive the
   modal height. Height keys off the entry list only, so two students with the
   same entry count get the same modal height regardless of their art's size. */
.bond100-hero-fg {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bond100-hero-fg img {
  width: auto;
  height: 100%;
  max-width: 100%;
  object-fit: cover;
  object-position: center bottom;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
}

.bond100-hero-shimmer {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  background: var(--card-background);
}

.bond100-hero-shimmer-bar {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--text-primary) 6%, transparent) 50%,
    transparent 100%
  );
  animation: bond100-hero-shimmer 1.5s infinite;
}

@keyframes bond100-hero-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.bond100-hero-overlay {
  position: absolute;
  inset: auto 0 0 0;
  z-index: 2;
  padding: 14px 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.32) 62%, transparent);
  color: #fff;
}

.bond100-hero-kicker {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
}

.bond100-hero-name {
  margin: 2px 0 0;
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.1;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* ── Content (right) ─────────────────────────────────────── */
.bond100-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bond100-content-head {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-color);
}

/* Sits on its own line under the total + server chips. */
.bond100-freshness {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  opacity: 0.85;
}

.bond100-server-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  flex: 1;
}

.bond100-server-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
}

.bond100-server-chip-sep {
  opacity: 0.5;
}

.bond100-server-chip-count {
  font-size: 0.84rem;
  font-weight: 800;
}

.bond100-total {
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
}

.bond100-total strong {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--text-primary);
}

.bond100-total-server {
  font-weight: 800;
  color: var(--accent-color);
}

.bond100-content-body {
  /* Fixed ~10-row list area so every modal is the same height (and the hero is
     a consistent size): short lists show empty rows below, long lists (e.g. 124
     entries) scroll. flex-shrink lets it degrade on short viewports instead of
     pushing the footer off-screen. */
  flex: 0 1 22rem;
  min-height: 0;
  overflow-y: auto;
}

.bond100-entry-cols {
  display: grid;
  /* minmax(0, 1fr), not the default minmax(auto, 1fr), so a long no-wrap name
     can't grow its track past the pane (which, with two long names, would force
     a horizontal scrollbar). Over-long names ellipsize within the column. */
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0 6px;
  align-items: start;
  align-content: start;
}

.bond100-entry-cols.single {
  grid-template-columns: minmax(0, 1fr);
}

.bond100-entry-table {
  width: 100%;
  table-layout: fixed;   /* fixed columns so the name cell respects its width and ellipsizes */
  border-collapse: collapse;
  font-size: 0.86rem;
}

.bond100-entry-table tbody tr:nth-child(even) {
  background: var(--card-background);
}

.bond100-entry-table td {
  padding: 6px 8px;
  vertical-align: middle;
  white-space: nowrap;
}

.bond100-entry-table td.bond100-entry-server {
  width: 4.25rem;   /* fits the widest short label ("TW/HK") under fixed layout */
}

.bond100-entry-table td.bond100-entry-name {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
  font-weight: 700;
}

/* Per-script font overrides (lang is detected from the player name text) */
tr[lang="ko"] .bond100-entry-name { font-family: 'Noto Serif KR', sans-serif; }
tr[lang="ja"] .bond100-entry-name { font-family: 'Zen Old Mincho', sans-serif; }
tr[lang="zh-TW"] .bond100-entry-name { font-family: 'Noto Sans TC', sans-serif; }

.bond100-empty-line {
  margin: 12px;
  color: var(--text-secondary);
  font-size: 0.86rem;
}

.bond100-server-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.4;
  white-space: nowrap;
}

.bond100-modal-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 12px;
  padding: 20px;
  border-radius: 16px;
  background: var(--card-background);
  color: var(--text-secondary);
  text-align: center;
}

.bond100-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-color);
  border-bottom-color: var(--accent-color);
  border-radius: 50%;
  animation: bond100-spin 0.9s linear infinite;
}

@keyframes bond100-spin {
  to {
    transform: rotate(360deg);
  }
}

.bond100-modal-state.error {
  color: var(--color-negative);
}

/* Form footer: same bar as the list footer, buttons right-aligned. */
.bond100-form-footer {
  justify-content: flex-end;
  gap: 8px;
}

/* ── Removal guidelines ──────────────────────────────────── */
.bond100-guidelines {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  /* Fill the fixed-height body so the content centers vertically (not just at
     the top) in the removal/guidelines view. */
  min-height: 100%;
  padding: 20px 12px;
}

.bond100-guidelines-body {
  margin: 0;
  max-width: 42ch;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.bond100-guidelines-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  color: var(--accent-color);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s;
}

.bond100-guidelines-link:hover {
  background: color-mix(in srgb, var(--accent-color) 22%, transparent);
}

.bond100-guidelines-link svg {
  display: block;
}

/* ── Footer ──────────────────────────────────────────────── */
.bond100-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 18px;
  border-top: 1px solid var(--border-color);
  background: var(--card-background);
}

.bond100-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bond100-removal-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Red (negative) tint so "Request removal" reads as a distinct, slightly
   destructive action, set apart from the neutral "?" info button. The triple
   class outranks .bond100-footer-btn.ghost regardless of source order. */
.bond100-footer-btn.ghost.bond100-removal-btn {
  color: var(--color-negative);
  transition: border-color 0.15s, color 0.15s;
}

.bond100-footer-btn.ghost.bond100-removal-btn:hover {
  border-color: var(--color-negative);
}

.bond100-removal-icon {
  flex: 0 0 auto;
}

.bond100-footer-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 1 220px;
  min-width: 0;
}

.bond100-search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-secondary);
  pointer-events: none;
}

.bond100-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 5px 26px 5px 30px;
  border: 1px solid var(--input-border);
  border-radius: 999px;
  background: var(--input-background);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.82rem;
}

.bond100-search-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.bond100-search-input::placeholder {
  color: var(--input-placeholder);
}

.bond100-search-clear {
  position: absolute;
  right: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  padding: 0;   /* override the global button padding so the glyph stays centered */
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.05rem;
  line-height: 1;
}

.bond100-search-clear:hover {
  color: var(--text-primary);
}

.bond100-footer-btn {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--accent-color);
  background: var(--accent-color);
  color: #fff;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
}

.bond100-footer-btn.ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border-color);
}

.bond100-footer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Responsive: icon-only removal below 800px ───────────── */
@media (max-width: 800px) {
  .bond100-removal-label {
    display: none;
  }

  /* Icon-only: same box as the "?" info button for a consistent size; only the
     colour differs (red, set on the base rule). The double-class selector beats
     .bond100-footer-btn.ghost (later source) so the box + background win. */
  .bond100-footer-btn.bond100-removal-btn {
    width: 30px;
    height: 30px;
    padding: 0;
    justify-content: center;
    border-radius: 6px;
    background: var(--background-primary);
  }
}

/* ── Responsive: stack hero on top ───────────────────────── */
@media (max-width: 600px) {
  .bond100-modal-backdrop {
    padding: 10px;
  }

  .bond100-entry-modal {
    flex-direction: column;
    width: min(400px, 100%);
    max-height: calc(100vh - 20px);
  }

  .bond100-hero {
    flex: 0 0 200px;
  }

  .bond100-hero-name {
    font-size: 1.35rem;
  }

  /* Single column on narrow screens; two would cramp long CJK names. */
  .bond100-entry-cols {
    grid-template-columns: 1fr;
  }
}
</style>
