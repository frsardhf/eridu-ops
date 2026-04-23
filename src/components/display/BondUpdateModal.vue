<script setup lang="ts">
import { computed, ref } from 'vue';
import { $t } from '@/locales';
import { StudentProps } from '@/types/student';
import { applyBondUpdates } from '@/consumables/services/bulkStudentFormService';
import { batchSetStudentData, studentDataStore } from '@/consumables/stores/studentStore';
import { MAX_BOND_LEVEL } from '@/consumables/constants/gameConstants';

type EntryStatus = 'matched' | 'ambiguous' | 'unmatched' | 'skipped';

interface ParsedEntry {
  i: number;
  rawName: string;
  bond: number;
  prefix?: string;
  baseName: string;
  status: EntryStatus;
  resolved?: StudentProps;
  candidates: StudentProps[];
  searchQuery: string;
  showResults: boolean;
  searchResults: StudentProps[];
}

const props = defineProps<{ students: StudentProps[] }>();
const emit = defineEmits<{ close: [] }>();

const step = ref<'input' | 'review'>('input');
const rawText = ref('');
const showGuide = ref(false);
const parsedEntries = ref<ParsedEntry[]>([]);
const isApplying = ref(false);

const lineCount = computed(() =>
  rawText.value.split('\n').filter(l => l.trim().length > 0).length
);

// ── Parsing ──────────────────────────────────────────────────────────────────

function parseLine(raw: string): ParsedEntry | null {
  const line = raw.trim();
  if (!line) return null;
  const m = line.match(/^(.+?)\s+(\d+)$/);
  if (!m) return null;

  const [, namePart, bondStr] = m;
  const bond = Math.min(MAX_BOND_LEVEL, Math.max(1, parseInt(bondStr, 10)));

  let prefix: string | undefined;
  let baseName: string;

  const dotIdx = namePart.indexOf('.');
  if (dotIdx > 0) {
    prefix   = namePart.slice(0, dotIdx).toLowerCase();
    baseName = namePart.slice(dotIdx + 1).toLowerCase();
  } else {
    baseName = namePart.toLowerCase();
  }

  return {
    i: 0, rawName: namePart, bond, prefix, baseName,
    status: 'unmatched', resolved: undefined,
    candidates: [], searchQuery: namePart, showResults: false, searchResults: [],
  };
}

function resolveEntry(entry: ParsedEntry): ParsedEntry {
  const hits = props.students.filter(s => {
    const nameLow = s.Name.toLowerCase();
    if (!nameLow.includes(entry.baseName)) return false;
    if (!entry.prefix) return true;
    const bracket = s.Name.match(/\(([^)]+)\)/);
    return bracket ? bracket[1].toLowerCase().startsWith(entry.prefix) : false;
  });

  if (hits.length === 1) return { ...entry, status: 'matched',   resolved: hits[0], candidates: hits };
  if (hits.length  > 1) return { ...entry, status: 'ambiguous',  candidates: hits };
  return                        { ...entry, status: 'unmatched',  candidates: [] };
}

function handleParse() {
  parsedEntries.value = rawText.value
    .split('\n')
    .map(parseLine)
    .filter((e): e is ParsedEntry => e !== null)
    .map((e, i) => resolveEntry({ ...e, i }));
  step.value = 'review';
}

// ── Resolution helpers ────────────────────────────────────────────────────────

function handleSelectStudent(index: number, student: StudentProps) {
  parsedEntries.value[index] = {
    ...parsedEntries.value[index],
    status: 'matched', resolved: student, showResults: false,
  };
}

function handleSkip(index: number) {
  parsedEntries.value[index] = { ...parsedEntries.value[index], status: 'skipped' };
}

function updateSearch(index: number, query: string) {
  const q = query.trim().toLowerCase();
  parsedEntries.value[index] = {
    ...parsedEntries.value[index],
    searchQuery: query,
    showResults: q.length > 0,
    searchResults: q ? props.students.filter(s => s.Name.toLowerCase().includes(q)).slice(0, 6) : [],
  };
}

function portraitUrl(student: StudentProps): string {
  return `https://schaledb.com/images/student/collection/${student.Id}.webp`;
}

function currentBondOf(studentId: number): number {
  return studentDataStore.value[studentId]?.bondDetailData?.currentBond ?? 1;
}

// ── Computed views ────────────────────────────────────────────────────────────

const matchedEntries = computed(() => parsedEntries.value.filter(e => e.status === 'matched'));
const flaggedEntries = computed(() => parsedEntries.value.filter(e => e.status === 'ambiguous' || e.status === 'unmatched'));
const canApply       = computed(() =>
  parsedEntries.value.every(e => e.status !== 'ambiguous') &&
  matchedEntries.value.length > 0 &&
  !isApplying.value
);

// ── Apply ─────────────────────────────────────────────────────────────────────

async function handleApply() {
  if (!canApply.value) return;
  isApplying.value = true;
  try {
    const updates = matchedEntries.value
      .map(e => ({ studentId: e.resolved!.Id, bond: e.bond }));
    const updated = await applyBondUpdates(updates);
    batchSetStudentData(updated);
    emit('close');
  } finally {
    isApplying.value = false;
  }
}

</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-container">

      <!-- Header -->
      <div class="modal-header">
        <div class="header-left">
          <button
            v-if="step === 'review'"
            class="icon-btn"
            type="button"
            :aria-label="$t('previous')"
            @click="step = 'input'"
          >←</button>
          <h2 class="modal-title">{{ $t('bondUpdate.title') }}</h2>
          <button
            v-if="step === 'input'"
            class="icon-btn help-btn"
            type="button"
            :class="{ active: showGuide }"
            aria-label="Format guide"
            @click="showGuide = !showGuide"
          >?</button>
        </div>
        <button class="icon-btn close-btn" type="button" :aria-label="$t('close')" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Input step -->
      <template v-if="step === 'input'">
        <!-- Format guide (collapsible) -->
        <div v-if="showGuide" class="guide-panel">
          <p class="guide-title">{{ $t('bondUpdate.guideTitle') }}</p>
          <ul class="guide-list">
            <li>{{ $t('bondUpdate.guideLine1') }}: <code>name bond</code></li>
            <li>{{ $t('bondUpdate.guideLine2') }}</li>
            <li>{{ $t('bondUpdate.guideLine3') }}</li>
            <li class="indent"><code>s.seia 26</code> → Seia (Swimsuit)</li>
            <li class="indent"><code>ny.kayoko 28</code> → Kayoko (New Year)</li>
            <li class="indent"><code>b.neru 22</code> → Neru (Bunny)</li>
            <li>{{ $t('bondUpdate.guideLine4') }}</li>
          </ul>
        </div>

        <div class="modal-body">
          <textarea
            v-model="rawText"
            class="notes-textarea"
            :placeholder="$t('bondUpdate.placeholder')"
            spellcheck="false"
            autocomplete="off"
          />
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" type="button" @click="emit('close')">{{ $t('cancel') }}</button>
          <button
            class="btn-primary"
            type="button"
            :disabled="lineCount === 0"
            @click="handleParse"
          >{{ $t('bondUpdate.parse') }} ({{ lineCount }})</button>
        </div>
      </template>

      <!-- Review step -->
      <template v-else>
        <!-- Summary badges -->
        <div class="summary-row">
          <span class="badge badge--matched">{{ matchedEntries.length }} matched</span>
          <span v-if="flaggedEntries.length > 0" class="badge badge--flagged">{{ flaggedEntries.length }} {{ $t('bondUpdate.flagged') }}</span>
        </div>

        <div class="review-body">
          <!-- Matched entries -->
          <div v-if="matchedEntries.length > 0" class="entry-list">
            <div v-for="entry in matchedEntries" :key="entry.i" class="entry-row entry-row--matched">
              <img :src="portraitUrl(entry.resolved!)" class="entry-portrait" alt="" />
              <span class="entry-name">{{ entry.resolved!.Name }}</span>
              <span class="entry-bond-diff">
                <span class="bond-old">{{ currentBondOf(entry.resolved!.Id) }}</span>
                <span class="bond-arrow">→</span>
                <span class="bond-new">{{ entry.bond }}</span>
              </span>
            </div>
          </div>

          <!-- Flagged entries -->
          <div v-if="flaggedEntries.length > 0" class="flagged-section">
            <p class="flagged-label">{{ $t('bondUpdate.flagged') }}</p>

            <div v-for="entry in flaggedEntries" :key="entry.i" class="flagged-entry">
              <div class="flagged-meta">
                <span class="flagged-raw">{{ entry.rawName }}</span>
                <span class="flagged-bond">{{ entry.bond }}</span>
              </div>

              <!-- Ambiguous: show candidate chips -->
              <div v-if="entry.status === 'ambiguous'" class="candidate-chips">
                <button
                  v-for="candidate in entry.candidates"
                  :key="candidate.Id"
                  class="candidate-chip"
                  type="button"
                  :title="candidate.Name"
                  @click="handleSelectStudent(entry.i, candidate)"
                >
                  <img :src="portraitUrl(candidate)" class="chip-portrait" alt="" />
                  <span class="chip-name">{{ candidate.Name }}</span>
                </button>
              </div>

              <!-- Unmatched: search input -->
              <div v-else class="search-wrapper">
                <div class="search-input-row">
                  <input
                    type="text"
                    class="search-input"
                    :value="entry.searchQuery"
                    :placeholder="$t('bondUpdate.searchPlaceholder')"
                    @input="updateSearch(entry.i, ($event.target as HTMLInputElement).value)"
                    @focus="updateSearch(entry.i, entry.searchQuery)"
                  />
                  <button class="skip-btn" type="button" @click="handleSkip(entry.i)">
                    {{ $t('bondUpdate.skip') }}
                  </button>
                </div>
                <div v-if="entry.showResults" class="search-results">
                  <button
                    v-for="result in entry.searchResults"
                    :key="result.Id"
                    class="search-result-item"
                    type="button"
                    @click="handleSelectStudent(entry.i, result)"
                  >
                    <img :src="portraitUrl(result)" class="chip-portrait" alt="" />
                    <span>{{ result.Name }}</span>
                  </button>
                  <p v-if="entry.searchResults.length === 0" class="no-results">No match</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" type="button" @click="step = 'input'">{{ $t('previous') }}</button>
          <button
            class="btn-primary"
            type="button"
            :disabled="!canApply"
            @click="handleApply"
          >
            {{ isApplying ? '…' : `${$t('apply')} (${matchedEntries.length})` }}
          </button>
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(2px);
}

.modal-container {
  background: var(--background-primary);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
  width: min(92vw, 480px);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-appear 0.22s ease;
}

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Header ── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 10px 14px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 700;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.icon-btn:hover {
  border-color: var(--accent-color);
  color: var(--text-primary);
}

.help-btn.active {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  color: var(--accent-color);
}

.close-btn { border-color: transparent; }

/* ── Guide panel ── */
.guide-panel {
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-secondary);
  flex-shrink: 0;
}

.guide-title {
  margin: 0 0 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.guide-list {
  margin: 0;
  padding: 0 0 0 14px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.7;
}

.guide-list li { list-style: disc; }
.guide-list .indent { list-style: none; margin-left: 8px; }

.guide-list code {
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  padding: 0 4px;
  font-size: 0.78rem;
  color: var(--accent-color);
}

/* ── Input body ── */
.modal-body {
  padding: 12px 14px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.notes-textarea {
  flex: 1;
  min-height: 200px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-family: monospace;
  line-height: 1.6;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.notes-textarea:focus {
  outline: none;
  border-color: var(--accent-color);
}

.notes-textarea::placeholder { color: var(--text-secondary); opacity: 0.6; }

/* ── Review body ── */
.summary-row {
  display: flex;
  gap: 6px;
  padding: 8px 14px 0;
  flex-shrink: 0;
}

.badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge--matched  { background: color-mix(in srgb, #22c55e 14%, var(--background-secondary)); color: #16a34a; }
.badge--flagged  { background: color-mix(in srgb, #f59e0b 14%, var(--background-secondary)); color: #b45309; }

.review-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 14px 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Entry list (matched) ── */
.entry-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.entry-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  background: var(--background-secondary);
}

.entry-portrait {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.entry-name {
  flex: 1;
  font-size: 0.83rem;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-bond-diff {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 600;
}

.bond-old   { color: var(--text-secondary); }
.bond-arrow { color: var(--text-secondary); font-size: 0.7rem; }
.bond-new   { color: var(--accent-color); }

/* ── Flagged section ── */
.flagged-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flagged-label {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #b45309;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.flagged-entry {
  border: 1px solid color-mix(in srgb, #f59e0b 30%, var(--border-color));
  border-radius: 7px;
  padding: 7px 8px;
  background: var(--background-secondary);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flagged-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.flagged-raw  { font-size: 0.83rem; color: var(--text-primary); font-weight: 600; }
.flagged-bond { font-size: 0.8rem; color: var(--accent-color); font-weight: 700; }

/* ── Candidate chips (ambiguous) ── */
.candidate-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.candidate-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px 3px 3px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--background-primary);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.candidate-chip:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--background-primary));
}

.chip-portrait {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.chip-name {
  font-size: 0.75rem;
  color: var(--text-primary);
  white-space: nowrap;
}

/* ── Search picker (unmatched) ── */
.search-wrapper { position: relative; }

.search-input-row {
  display: flex;
  gap: 6px;
}

.search-input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.82rem;
  transition: border-color 0.15s;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.skip-btn {
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}

.skip-btn:hover { border-color: var(--text-secondary); color: var(--text-primary); }

.search-results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.18);
  z-index: 10;
  overflow: hidden;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.82rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}

.search-result-item:hover { background: var(--background-secondary); }

.no-results {
  margin: 0;
  padding: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: center;
}

/* ── Footer ── */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.btn-secondary {
  padding: 5px 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-secondary:hover { border-color: var(--text-secondary); color: var(--text-primary); }

.btn-primary {
  padding: 5px 16px;
  border: none;
  border-radius: 6px;
  background: var(--accent-color);
  color: white;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-primary:hover:not(:disabled) { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 480px) {
  .modal-container {
    width: 100%;
    max-height: 90vh;
    border-radius: 14px 14px 0 0;
    position: fixed;
    bottom: 0;
  }

  .modal-backdrop { align-items: flex-end; }
}
</style>
