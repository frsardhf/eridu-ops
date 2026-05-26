<script setup lang="ts">
import { computed, ref } from 'vue';
import { $t } from '@/locales';
import {
  CHANGELOG,
  localizeChangelogText,
  type ChangelogEntry,
} from '@/lib/constants/changelog';

const emit = defineEmits<{
  close: [];
}>();

// Latest entry expands by default; older entries hide behind an accordion to
// keep the auto-popup from feeling like a giant wall of text.
const latest = computed<ChangelogEntry | undefined>(() => CHANGELOG[0]);
const previous = computed<ChangelogEntry[]>(() => CHANGELOG.slice(1));
const showPrevious = ref(false);

// Formats an entry's date as e.g. "May 23, 2026". Uses the browser locale so
// JP users see Japanese month names; falls back to the ISO string if the
// stored date is malformed.
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function localized(text: { en: string; jp: string }): string {
  return localizeChangelogText(text);
}

function closeModal(event: MouseEvent) {
  if (event.target === event.currentTarget) emit('close');
}
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="modal-container" role="dialog" :aria-label="$t('whatsNew')">
      <div class="modal-header">
        <h2 class="modal-title">{{ $t('whatsNew') }}</h2>
        <button class="close-button" type="button" :aria-label="$t('close')" @click="emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="wn-body">
        <!-- Latest entry, always expanded -->
        <section v-if="latest" class="entry entry--latest">
          <div class="entry-head">
            <span class="entry-badge">{{ $t('whatsNewLatest') }}</span>
            <span class="entry-date">{{ formatDate(latest.date) }}</span>
          </div>
          <h3 class="entry-title">{{ localized(latest.title) }}</h3>
          <p class="entry-summary">{{ localized(latest.summary) }}</p>

          <!-- Multi-feature release: each section gets its own header -->
          <div v-if="latest.sections?.length" class="entry-sections">
            <div v-for="(section, i) in latest.sections" :key="i" class="entry-section">
              <h4 class="entry-section-title">{{ localized(section.title) }}</h4>
              <ul class="entry-highlights">
                <li v-for="(h, j) in section.highlights" :key="j">
                  {{ localized(h) }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Single-feature release: flat highlights list -->
          <ul v-else-if="latest.highlights?.length" class="entry-highlights">
            <li v-for="(h, i) in latest.highlights" :key="i">
              {{ localized(h) }}
            </li>
          </ul>
        </section>

        <!-- Older entries — collapsible accordion -->
        <div v-if="previous.length" class="previous">
          <button
            type="button"
            class="previous-toggle"
            :aria-expanded="showPrevious"
            @click="showPrevious = !showPrevious"
          >
            <span class="previous-arrow" :class="{ 'is-open': showPrevious }">▸</span>
            {{ $t('previousUpdates') }}
            <span class="previous-count">{{ previous.length }}</span>
          </button>

          <div v-if="showPrevious" class="previous-list">
            <section v-for="entry in previous" :key="entry.id" class="entry">
              <div class="entry-head">
                <h4 class="entry-title entry-title--small">{{ localized(entry.title) }}</h4>
                <span class="entry-date">{{ formatDate(entry.date) }}</span>
              </div>
              <p class="entry-summary">{{ localized(entry.summary) }}</p>

              <div v-if="entry.sections?.length" class="entry-sections">
                <div v-for="(section, i) in entry.sections" :key="i" class="entry-section">
                  <h5 class="entry-section-title entry-section-title--small">{{ localized(section.title) }}</h5>
                  <ul class="entry-highlights">
                    <li v-for="(h, j) in section.highlights" :key="j">
                      {{ localized(h) }}
                    </li>
                  </ul>
                </div>
              </div>

              <ul v-else-if="entry.highlights?.length" class="entry-highlights">
                <li v-for="(h, i) in entry.highlights" :key="i">
                  {{ localized(h) }}
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-container {
  background-color: var(--background-primary);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  width: 92%;
  max-width: 560px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modal-appear 0.25s ease;
}

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.close-button {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background-color 0.15s, color 0.15s;
}

.close-button:hover {
  background-color: rgba(var(--background-hover-rgb), 0.1);
  color: var(--text-primary);
}

.wn-body {
  padding: 16px 18px;
  overflow-y: auto;
  flex: 1;
}

/* ── Entry ─────────────────────────────────────────────────────────────── */
.entry + .entry {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);
}

.entry--latest {
  margin-bottom: 6px;
}

.entry-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.entry-badge {
  background: var(--accent-color);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 999px;
}

.entry-date {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  margin-left: auto;
}

.entry-title {
  margin: 0 0 6px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.entry-title--small {
  font-size: 0.95rem;
  margin: 0;
}

.entry-summary {
  margin: 0 0 8px;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.entry-highlights {
  margin: 0;
  padding: 0 0 0 18px;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.entry-highlights li {
  list-style: disc;
  margin-bottom: 2px;
}

/* Multi-feature release blocks. Each section is its own little group with a
   subhead so two unrelated deliverables shipped in the same release don't
   read like a single bullet list. */
.entry-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.entry-section-title {
  margin: 0 0 4px;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
}

.entry-section-title--small {
  font-size: 0.85rem;
}

/* ── Previous-updates accordion ────────────────────────────────────────── */
.previous {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.previous-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.15s, background-color 0.15s;
}

.previous-toggle:hover {
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
}

.previous-arrow {
  display: inline-block;
  font-size: 0.7rem;
  transition: transform 0.15s ease;
}

.previous-arrow.is-open {
  transform: rotate(90deg);
}

.previous-count {
  background: var(--background-secondary);
  color: var(--text-tertiary);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  margin-left: 2px;
}

.previous-list {
  margin-top: 10px;
}

@media (max-width: 576px) {
  .modal-container {
    width: 95%;
    max-height: 88vh;
  }

  .wn-body {
    padding: 12px;
  }
}
</style>
