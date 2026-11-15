<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import GlobalNavbar from '@/components/navbar/GlobalNavbar.vue';
import DataLoadErrorBanner from '@/components/shared/DataLoadErrorBanner.vue';
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue';
import PullRecapResultCard from '@/components/pull-recap/PullRecapResultCard.vue';
import PullRecapResults from '@/components/pull-recap/PullRecapResults.vue';
import { MAX_PULL_RECAP_TITLE_LENGTH, usePullRecapDraft } from '@/lib/hooks/usePullRecapDraft';
import { $t } from '@/locales';

const PullRecapExportModal = defineAsyncComponent(
  () => import('@/components/pull-recap/PullRecapExportModal.vue'),
);

const {
  isLoading,
  loadError,
  search,
  kind,
  candidates,
  sections,
  title,
  pullCount,
  resultRate,
  hasResults,
  hasDraft,
  setPullCount,
  addResult,
  setPullNumber,
  setPityMark,
  removeResult,
  clearDraft,
} = usePullRecapDraft();

const confirmClear = ref(false);
const exportOpen = ref(false);
const rateFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 2,
});
const previewTitle = computed(() => title.value.trim() || $t('pullRecap.results'));
const pullSummary = computed(() => {
  const count = pullCount.value;
  const rate = resultRate.value;
  if (count === null || rate === null) return '';
  const pulls = $t(count === 1 ? 'pullRecap.onePull' : 'pullRecap.pulls', { count });
  return `${rateFormatter.format(rate)} · ${pulls}`;
});

function changePullCount(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  setPullCount(input.valueAsNumber);
  input.value = pullCount.value?.toString() ?? '';
}

function reset() {
  clearDraft();
  confirmClear.value = false;
}
</script>

<template>
  <div class="pull-recap-page">
    <GlobalNavbar />

    <main class="pull-recap-body">
      <DataLoadErrorBanner />

      <div class="pull-recap-workspace">
        <div class="pull-recap-results">
          <div class="pull-recap-details">
            <label>
              {{ $t('pullRecap.bannerTitle') }}
              <input
                v-model="title"
                type="text"
                :maxlength="MAX_PULL_RECAP_TITLE_LENGTH"
                name="pull-recap-banner"
                class="pull-recap-input"
              />
            </label>
            <label>
              {{ $t('pullRecap.pullCount') }}
              <input
                :value="pullCount ?? ''"
                type="number"
                min="1"
                inputmode="numeric"
                name="pull-recap-pull-count"
                class="pull-recap-input"
                @change="changePullCount"
              />
            </label>
            <div class="pull-recap-actions">
              <button
                type="button"
                class="pull-recap-button"
                :disabled="!hasDraft"
                :aria-expanded="confirmClear"
                @click="confirmClear = !confirmClear"
              >
                {{ $t('pullRecap.clearDraft') }}
              </button>
              <button
                type="button"
                class="pull-recap-button primary"
                :disabled="!hasResults || isLoading"
                aria-haspopup="dialog"
                @click="exportOpen = true"
              >
                {{ $t('pullRecap.exportImage') }}
              </button>
            </div>
          </div>

          <div
            v-if="confirmClear"
            class="pull-recap-confirm"
            role="group"
            :aria-label="$t('pullRecap.clearDraft')"
          >
            <span>{{ $t('pullRecap.clearConfirm') }}</span>
            <button type="button" class="pull-recap-button" @click="confirmClear = false">
              {{ $t('cancel') }}
            </button>
            <button type="button" class="pull-recap-button" @click="reset">
              {{ $t('clear') }}
            </button>
          </div>
          <PullRecapResults
            :title="previewTitle"
            :pull-summary="pullSummary"
            :sections="sections"
            @remove="removeResult"
            @update-pull-number="setPullNumber"
            @update-pity-mark="setPityMark"
          />
        </div>

        <section class="pull-recap-picker" :aria-label="$t('pullRecap.studentPicker')">
          <div class="pull-recap-picker-header">
            <h2>{{ $t('pullRecap.studentPicker') }}</h2>
            <div class="pull-recap-kind" role="group" :aria-label="$t('pullRecap.addTo')">
              <button
                v-for="section in sections"
                :key="section.kind"
                type="button"
                :aria-pressed="kind === section.kind"
                @click="kind = section.kind"
              >
                {{ $t(`pullRecap.${section.kind}`) }}
              </button>
            </div>
          </div>
          <input
            v-model="search"
            type="search"
            class="pull-recap-input pull-recap-search"
            name="pull-recap-student-search"
            :aria-label="$t('pullRecap.search')"
            :placeholder="$t('pullRecap.search')"
          />
          <LoadingSpinner v-if="isLoading" block />
          <p v-else-if="!loadError && !candidates.length" class="pull-recap-empty" role="status">
            {{ $t('pullRecap.noMatches') }}
          </p>
          <div v-else class="pull-recap-picker-grid">
            <button
              v-for="student in candidates"
              :key="student.id"
              type="button"
              :disabled="student.alreadyNew"
              :aria-label="student.name"
              :title="
                student.alreadyNew
                  ? $t('pullRecap.alreadyNew', { name: student.name })
                  : student.name
              "
              class="pull-recap-pick"
              @click="addResult(student.id)"
            >
              <PullRecapResultCard :name="student.name" :portrait="student.portrait" />
            </button>
          </div>
        </section>
      </div>
    </main>

    <PullRecapExportModal
      v-if="exportOpen"
      :title="previewTitle"
      :pull-summary="pullSummary"
      :sections="sections"
      @close="exportOpen = false"
    />
  </div>
</template>

<style scoped>
.pull-recap-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--background-primary);
  color: var(--text-primary);
}

.pull-recap-body {
  flex: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
}

.pull-recap-details,
.pull-recap-actions,
.pull-recap-picker-header,
.pull-recap-confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pull-recap-picker-header {
  justify-content: space-between;
}

h2,
p {
  margin: 0;
}

h2 {
  font-size: 0.95rem;
  font-weight: 650;
}

.pull-recap-empty {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.pull-recap-button,
.pull-recap-input,
.pull-recap-kind {
  min-width: 0;
  min-height: 34px;
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.85rem;
}

.pull-recap-button {
  font-weight: 600;
  cursor: pointer;
}

.pull-recap-button:hover:not(:disabled) {
  border-color: var(--accent-color);
}

.pull-recap-button.primary {
  border-color: var(--accent-color);
  background: var(--accent-color);
  color: var(--text-on-accent, white);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pull-recap-confirm {
  padding: 8px 10px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-secondary);
  font-size: 0.85rem;
}

.pull-recap-confirm span {
  flex: 1 1 220px;
}

.pull-recap-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(275px, 0.54fr);
  align-items: start;
  gap: 14px;
}

.pull-recap-results,
.pull-recap-picker {
  min-width: 0;
}

.pull-recap-details {
  align-items: flex-end;
  margin-bottom: 8px;
}

.pull-recap-details label {
  flex: 0 1 115px;
  display: grid;
  gap: 4px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.pull-recap-details label:first-child {
  flex: 1 1 150px;
}

.pull-recap-actions {
  margin-inline-start: auto;
}

.pull-recap-picker {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--background-secondary);
}

.pull-recap-empty {
  padding: 12px 0;
  text-align: center;
}

.pull-recap-kind {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
}

.pull-recap-kind button {
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.pull-recap-kind button[aria-pressed='true'] {
  background: color-mix(in srgb, var(--accent-color) 14%, transparent);
  color: var(--accent-color);
}

.pull-recap-search {
  width: 100%;
  margin: 8px 0;
}

.pull-recap-picker-grid {
  display: grid;
  align-items: start;
  gap: 6px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 82px), 1fr));
  max-height: min(58dvh, 580px);
  padding: 2px;
  overflow: auto;
  scrollbar-gutter: stable;
}

.pull-recap-pick {
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pull-recap-pick:hover:not(:disabled) {
  outline: 1px solid var(--accent-color);
}

@media (max-width: 740px) {
  .pull-recap-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .pull-recap-picker {
    grid-row: 1;
  }

  .pull-recap-picker-grid {
    max-height: min(34dvh, 320px);
  }
}

@media (max-width: 500px) {
  .pull-recap-body {
    padding: 12px;
  }
}
</style>
