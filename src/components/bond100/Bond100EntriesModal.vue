<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { getStudentCollectionUrl } from '@/lib/utils/iconUtils';
import { colorWithOpacity, getBond100ServerColor } from '@/lib/utils/colorUtils';
import { submitBond100Submission } from '@/lib/services/bond100Service';
import SelectMenu from '@/components/shared/SelectMenu.vue';
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

function pillStyle(server: string): Record<string, string> {
  const color = getBond100ServerColor(server);
  return {
    color,
    background: colorWithOpacity(color, 0.12),
    borderColor: colorWithOpacity(color, 0.4),
  };
}

// ── Pagination ────────────────────────────────────────────────
// 10 per page, laid out as two columns of 5 (single column on the last/short
// page and on mobile).
const COLUMN_SIZE = 5;
const PAGE_SIZE = COLUMN_SIZE * 2;
const currentPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(entries.value.length / PAGE_SIZE)));
const pagedEntries = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return entries.value.slice(start, start + PAGE_SIZE);
});
const pageLeft = computed(() => pagedEntries.value.slice(0, COLUMN_SIZE));
const pageRight = computed(() => pagedEntries.value.slice(COLUMN_SIZE));
const entryColumns = computed(() =>
  pageRight.value.length ? [pageLeft.value, pageRight.value] : [pageLeft.value]
);

// ── View mode: entry list, submission form, removal guidelines, or success ────
type Mode = 'list' | 'submit' | 'guidelines' | 'done';
const mode = ref<Mode>('list');
const submitting = ref(false);
const formError = ref('');
const doneMessage = ref('');

// Submission fields — bridge model: only server + friend code. The backend
// triggers an arona /refresh; the player appears in the next sync.
const subServer = ref<Bond100ServerRegion | ''>('');
const subFriendCode = ref('');

const submitServerOptions = computed(() =>
  props.serverOptions.map(o => ({ value: o.code, label: $t(o.labelKey) }))
);

function resetForms() {
  formError.value = '';
  doneMessage.value = '';
  subServer.value = '';
  subFriendCode.value = '';
}

function openSubmit() { resetForms(); mode.value = 'submit'; }
function openGuidelines() { resetForms(); mode.value = 'guidelines'; }
function backToList() { resetForms(); mode.value = 'list'; }

async function doSubmit() {
  if (submitting.value || !subServer.value || !subFriendCode.value.trim()) return;
  submitting.value = true;
  formError.value = '';
  try {
    await submitBond100Submission({
      serverRegion: subServer.value,
      friendCode: subFriendCode.value.trim(),
    });
    doneMessage.value = $t('bond100.form.submittedBody');
    mode.value = 'done';
  } catch {
    formError.value = $t('bond100.form.error');
  } finally {
    submitting.value = false;
  }
}

// Reset page + any open form whenever a new student is opened or the filter changes.
watch([() => props.entriesResponse, () => props.serverFilter], () => {
  currentPage.value = 1;
  backToList();
});

// Detect script from player name so the browser picks the right CJK font.
// Hangul, Hiragana/Katakana, and CJK Ideographs share U+4E00-9FFF — without
// a lang hint the browser always uses the first font in the stack that covers
// that block (Noto Serif KR), making all three scripts look identical.
function detectLang(text: string): string | undefined {
  if (/[가-힣ᄀ-ᇿ㄰-㆏]/.test(text)) return 'ko';
  if (/[぀-ヿ]/.test(text)) return 'ja';
  if (/[一-鿿豈-﫿]/.test(text)) return 'zh-TW';
  return undefined;
}

// ── Footer info popover ───────────────────────────────────────
const footerInfoOpen = ref(false);
const footerInfoWrapEl = ref<HTMLElement | null>(null);

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (footerInfoOpen.value) footerInfoOpen.value = false;
    else if (mode.value !== 'list') backToList();
    else emit('close');
    return;
  }
  // Arrow paging only when viewing the list (not while typing in a form).
  if (mode.value !== 'list') return;
  if (event.key === 'ArrowLeft' && currentPage.value > 1) currentPage.value--;
  if (event.key === 'ArrowRight' && currentPage.value < totalPages.value) currentPage.value++;
}

function onDocumentClick(event: MouseEvent) {
  if (footerInfoOpen.value && footerInfoWrapEl.value && !footerInfoWrapEl.value.contains(event.target as Node)) {
    footerInfoOpen.value = false;
  }
}

useDocumentListener('keydown', onKeydown);
useClickOutside(onDocumentClick);
</script>

<template>
  <div class="bond100-modal-backdrop" @click.self="emit('close')">
    <section class="bond100-entry-modal" role="dialog" aria-modal="true" :aria-label="$t('bond100.entriesTitle', { name: student.Name })">
      <div class="bond100-hero">
        <img :src="getStudentCollectionUrl(student.Id)" :alt="student.Name" class="bond100-hero-img" />
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
        </header>

        <div class="bond100-content-body">
          <!-- ── List ── -->
          <template v-if="mode === 'list'">
            <div v-if="loading" class="bond100-modal-state">
              {{ $t('loading') }}...
            </div>
            <div v-else-if="error" class="bond100-modal-state error">
              {{ error }}
            </div>
            <div
              v-else-if="pagedEntries.length"
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
            <p v-else class="bond100-empty-line">{{ $t('bond100.noEntries') }}</p>
          </template>

          <!-- ── Success ── -->
          <div v-else-if="mode === 'done'" class="bond100-form-done">
            <div class="bond100-form-done-check" aria-hidden="true">✓</div>
            <h3>{{ $t('bond100.form.submittedTitle') }}</h3>
            <p>{{ doneMessage }}</p>
            <button type="button" class="bond100-footer-btn" @click="backToList">{{ $t('bond100.form.back') }}</button>
          </div>

          <!-- ── Add Bond 100 form (server + friend code only) ── -->
          <form v-else-if="mode === 'submit'" id="bond100-submit-form" class="bond100-form" @submit.prevent="doSubmit">
            <div class="bond100-form-grid">
              <div class="bond100-field span-3">
                <span>{{ $t('bond100.server') }}</span>
                <SelectMenu
                  v-model="subServer"
                  block
                  :options="submitServerOptions"
                  :placeholder="$t('bond100.form.selectPlaceholder')"
                  :aria-label="$t('bond100.server')"
                />
              </div>
              <label class="bond100-field span-3">
                <span>{{ $t('bond100.form.friendCode') }}</span>
                <input v-model="subFriendCode" type="text" maxlength="20" autocomplete="off" required />
              </label>
            </div>

            <p class="bond100-form-note">{{ $t('bond100.form.assistHint') }}</p>
            <p v-if="formError" class="bond100-form-error">{{ formError }}</p>
          </form>

          <!-- ── Removal guidelines (handled on arona's side) ── -->
          <div v-else-if="mode === 'guidelines'" class="bond100-form bond100-guidelines">
            <p>{{ $t('bond100.form.guidelinesBody') }}</p>
            <a class="bond100-guidelines-link" href="https://arona.icu/about" target="_blank" rel="noopener noreferrer">arona.icu</a>
          </div>
        </div>

        <footer v-if="mode === 'list'" class="bond100-modal-footer">
          <!-- left: actions + ? -->
          <div class="bond100-footer-left">
            <button type="button" class="bond100-footer-btn" @click="openSubmit">
              + {{ $t('bond100.submit') }}
            </button>
            <button type="button" class="bond100-footer-btn ghost" @click="openGuidelines">
              {{ $t('bond100.requestRemoval') }}
            </button>
            <div ref="footerInfoWrapEl" class="bond100-footer-info-wrap">
              <button
                type="button"
                class="bond100-footer-info-btn"
                :class="{ open: footerInfoOpen }"
                :aria-label="$t('bond100.aboutInfo')"
                :aria-expanded="footerInfoOpen"
                @click.stop="footerInfoOpen = !footerInfoOpen"
              >?</button>
              <div v-if="footerInfoOpen" class="bond100-footer-popover" role="dialog">
                <p>{{ $t('bond100.removalNote') }}</p>
              </div>
            </div>
          </div>

          <!-- right: pager -->
          <div v-if="totalPages > 1" class="bond100-footer-pager">
            <button
              type="button"
              class="bond100-pager-btn"
              :disabled="currentPage === 1"
              aria-label="Previous page"
              @click="currentPage--"
            >‹</button>
            <span class="bond100-pager-label">{{ currentPage }} / {{ totalPages }}</span>
            <button
              type="button"
              class="bond100-pager-btn"
              :disabled="currentPage === totalPages"
              aria-label="Next page"
              @click="currentPage++"
            >›</button>
          </div>
        </footer>

        <!-- Form footers (pinned to the modal bottom; buttons drive the form via the form attr) -->
        <footer v-else-if="mode === 'submit'" class="bond100-modal-footer bond100-form-footer">
          <button type="button" class="bond100-footer-btn ghost" @click="backToList">{{ $t('bond100.form.cancel') }}</button>
          <button type="submit" form="bond100-submit-form" class="bond100-footer-btn" :disabled="submitting || !subServer || !subFriendCode.trim()">
            {{ submitting ? $t('bond100.form.sending') : $t('bond100.form.send') }}
          </button>
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
  max-height: min(760px, calc(100vh - 48px));
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: var(--background-primary);
  color: var(--text-primary);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
}

/* ── Hero (left) ─────────────────────────────────────────── */
.bond100-hero {
  position: relative;
  flex: 0 0 248px;
  background: var(--card-background);
  overflow: hidden;
}

.bond100-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  display: block;
}

.bond100-hero-overlay {
  position: absolute;
  inset: auto 0 0 0;
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
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-color);
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
  flex: 1;
  min-height: 0;        /* allow the body to shrink within the modal */
  overflow-y: auto;     /* scroll if a page overflows (e.g. 1-column on mobile) */
  padding: 6px 10px;
}

.bond100-entry-cols {
  display: grid;
  /* minmax(0, 1fr) — not the default minmax(auto, 1fr) — so a long no-wrap name
     can't grow its track past the pane (which, with two long names, would force
     a horizontal scrollbar). Over-long names ellipsize within the column. */
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0 6px;
  align-items: start;
  /* Reserve a full page's height (≈5 rows) so the modal — and the hero that
     follows it — stays the same size whether a page has 2, 4, or 5 rows.
     Full pages already meet this, so their look is unchanged. */
  min-height: 170px;
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

/* Per-script font overrides — lang is detected from the player name text */
tr[lang="ko"] .bond100-entry-name { font-family: 'Noto Serif KR', sans-serif; }
tr[lang="ja"] .bond100-entry-name { font-family: 'Zen Old Mincho', sans-serif; }
tr[lang="zh-TW"] .bond100-entry-name { font-family: 'Noto Sans TC', sans-serif; }

.bond100-empty-line {
  margin: 12px 0;
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
  margin: 12px 0;
  padding: 20px;
  border-radius: 16px;
  background: var(--card-background);
  color: var(--text-secondary);
  text-align: center;
}

.bond100-modal-state.error {
  color: var(--color-negative);
}

/* ── Forms (submit / removal) ────────────────────────────── */
.bond100-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Submit form: 2 rows on a 6-col base — Server | Name (3+3), then
   Friend code | Contact | Proof (2+2+2) — to keep the form short so the
   hero doesn't stretch. */
.bond100-form-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px 12px;
}

.bond100-form-grid .span-6 {
  grid-column: 1 / -1;
}

.bond100-form-grid .span-3 {
  grid-column: span 3;
}

.bond100-form-grid .span-2 {
  grid-column: span 2;
}

.bond100-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.bond100-field > span {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.bond100-field > span em {
  font-style: normal;
  font-weight: 500;
  opacity: 0.7;
}

.bond100-field input {
  width: 100%;
  box-sizing: border-box;
  padding: 5px 8px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  background: var(--input-background);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.88rem;
}

.bond100-field input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.bond100-form-note {
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.4;
  color: var(--text-secondary);
}

.bond100-form-error {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-negative);
}

/* Form footer: same bar as the list footer, buttons right-aligned. */
.bond100-form-footer {
  justify-content: flex-end;
  gap: 8px;
}

.bond100-form-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 24px 12px;
}

.bond100-form-done-check {
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

.bond100-form-done h3 {
  margin: 4px 0 0;
  font-size: 1.05rem;
}

.bond100-form-done p {
  margin: 0;
  max-width: 38ch;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.bond100-form-done .bond100-footer-btn {
  margin-top: 8px;
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

.bond100-footer-info-wrap {
  position: relative;
}

.bond100-footer-info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
  transition: border-color 0.15s, color 0.15s;
}

.bond100-footer-info-btn:hover,
.bond100-footer-info-btn.open {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.bond100-footer-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 10;
  width: 260px;
  max-width: calc(100vw - 48px);
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--background-primary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.bond100-footer-popover p {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--text-secondary);
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

/* ── Pager ───────────────────────────────────────────────── */
.bond100-footer-pager {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bond100-pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  transition: border-color 0.15s, color 0.15s;
}

.bond100-pager-btn:hover:not(:disabled) {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.bond100-pager-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.bond100-pager-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* ── Responsive: stack hero on top ───────────────────────── */
@media (max-width: 600px) {
  .bond100-modal-backdrop {
    padding: 10px;
  }

  .bond100-entry-modal {
    flex-direction: column;
    max-height: calc(100vh - 20px);
  }

  .bond100-hero {
    flex: 0 0 160px;
  }

  .bond100-hero-name {
    font-size: 1.35rem;
  }

  /* Single column on narrow screens — two would cramp long CJK names. */
  .bond100-entry-cols {
    grid-template-columns: 1fr;
  }
}
</style>
