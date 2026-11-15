<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import {
  PULL_RECAP_PITY_MARKS,
  type PullRecapPityMark,
  type PullRecapResultSection,
} from '@/types/pullRecap';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import PullRecapResultCard from './PullRecapResultCard.vue';
import PullRecapPityIcon from './PullRecapPityIcon.vue';
import { $t } from '@/locales';

const props = defineProps<{
  sections: PullRecapResultSection[];
  title: string;
  pullSummary: string;
  exportLayout?: boolean;
  showPullNumbers?: boolean;
}>();

const emit = defineEmits<{
  remove: [id: number];
  updatePullNumber: [id: number, pullNumber: number | undefined];
  updatePityMark: [id: number, mark: PullRecapPityMark | undefined];
}>();

const usedPityMarks = computed(() => {
  const used = new Set(
    props.sections.flatMap(({ cards }) => cards.map(({ pityMark }) => pityMark)),
  );
  return PULL_RECAP_PITY_MARKS.filter((mark) => used.has(mark));
});

const editingId = ref<number>();
const editorId = useId();
let editTrigger: HTMLButtonElement | undefined;

function toggleEditor(id: number, event: MouseEvent) {
  if (editingId.value === id) {
    editingId.value = undefined;
    editTrigger = undefined;
    return;
  }
  editingId.value = id;
  editTrigger = event.currentTarget as HTMLButtonElement;
}

function changePullNumber(id: number, previous: number | undefined, event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  if (!input.validity.valid) {
    input.value = previous?.toString() ?? '';
    return;
  }
  emit('updatePullNumber', id, input.value === '' ? undefined : input.valueAsNumber);
}

if (!props.exportLayout) {
  useClickOutside((event) => {
    if (!(event.target instanceof Element) || event.target.closest('.pull-recap-card-editor'))
      return;
    editingId.value = undefined;
    editTrigger = undefined;
  });
  useDocumentListener('keydown', (event) => {
    if (event.key !== 'Escape' || editingId.value === undefined) return;
    editingId.value = undefined;
    editTrigger?.focus();
    editTrigger = undefined;
  });
}
</script>

<template>
  <section
    class="pull-recap-preview"
    :class="{ 'pull-recap-preview--export': exportLayout }"
    :aria-label="$t('pullRecap.preview')"
  >
    <header class="pull-recap-preview-heading">
      <component :is="exportLayout ? 'h2' : 'h1'">{{ title }}</component>
      <span v-if="pullSummary">{{ pullSummary }}</span>
    </header>

    <div class="pull-recap-sections">
      <section v-for="section in sections" :key="section.kind" class="pull-recap-section">
        <component :is="exportLayout ? 'h3' : 'h2'" class="pull-recap-section-heading">
          {{ $t(`pullRecap.${section.kind}`) }}
          <span class="section-count">{{ section.cards.length }}</span>
        </component>
        <p v-if="!section.cards.length" class="pull-recap-empty">
          {{ $t(`pullRecap.empty.${section.kind}`) }}
        </p>
        <ul v-else class="pull-recap-result-grid">
          <li v-for="card in section.cards" :key="card.id" class="pull-recap-result">
            <PullRecapResultCard
              :name="card.name ?? $t('pullRecap.unknownStudent', { id: card.studentId })"
              :title="card.name"
              :portrait="card.portrait"
              :eleph-artwork="card.elephArtwork"
              :pity-mark="card.pityMark"
              :pull-number="!exportLayout || showPullNumbers ? card.pullNumber : undefined"
              :reserve-remove-space="!exportLayout"
            />
            <div v-if="!exportLayout" class="pull-recap-card-editor">
              <button
                type="button"
                class="pull-recap-card-action pull-recap-edit"
                :aria-label="$t('pullRecap.edit', { name: card.name ?? card.studentId })"
                :title="$t('pullRecap.edit', { name: card.name ?? card.studentId })"
                :aria-expanded="editingId === card.id"
                :aria-controls="editingId === card.id ? editorId : undefined"
                @click="toggleEditor(card.id, $event)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m15 5 4 4M4 20l4-.8L21 6l-3-3L5 16Z" />
                </svg>
              </button>
              <div v-if="editingId === card.id" :id="editorId" class="pull-recap-edit-panel">
                <label class="pull-recap-edit-field">
                  {{ $t('pullRecap.pullNumber') }}
                  <input
                    class="pull-recap-edit-input"
                    type="number"
                    name="pull-recap-pull-number"
                    inputmode="numeric"
                    min="1"
                    step="1"
                    :max="Number.MAX_SAFE_INTEGER"
                    :value="card.pullNumber ?? ''"
                    @change="changePullNumber(card.id, card.pullNumber, $event)"
                  />
                </label>
                <div
                  class="pull-recap-edit-field"
                  role="group"
                  :aria-label="$t('pullRecap.pity.label')"
                >
                  <span>{{ $t('pullRecap.pity.label') }}</span>
                  <button
                    v-for="mark in PULL_RECAP_PITY_MARKS"
                    :key="mark"
                    type="button"
                    class="pull-recap-pity-option"
                    :aria-pressed="card.pityMark === mark"
                    @click="
                      emit('updatePityMark', card.id, card.pityMark === mark ? undefined : mark)
                    "
                  >
                    <PullRecapPityIcon :mark="mark" />
                    {{ $t(`pullRecap.pity.${mark}`) }}
                  </button>
                </div>
              </div>
            </div>
            <button
              v-if="!exportLayout"
              type="button"
              class="pull-recap-card-action pull-recap-remove"
              :aria-label="$t('pullRecap.remove', { name: card.name ?? card.studentId })"
              :title="$t('pullRecap.remove', { name: card.name ?? card.studentId })"
              @click="emit('remove', card.id)"
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
    <ul
      v-if="usedPityMarks.length"
      class="pull-recap-pity-legend"
      :aria-label="$t('pullRecap.pity.legend')"
    >
      <li v-for="mark in usedPityMarks" :key="mark">
        <PullRecapPityIcon :mark="mark" />
        {{ $t(`pullRecap.pity.${mark}`) }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.pull-recap-preview {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--background-secondary);
  color: var(--text-primary);
}

.pull-recap-preview--export {
  padding: 20px;
  border: 0;
  border-radius: 0;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1,
h2,
h3 {
  font-size: 0.95rem;
  font-weight: 650;
}

.pull-recap-preview-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  overflow-wrap: anywhere;
}

.pull-recap-preview-heading span,
.pull-recap-empty {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.pull-recap-sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pull-recap-preview--export .pull-recap-sections {
  align-items: start;
}

.pull-recap-section {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
}

.pull-recap-section-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.section-count {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--background-secondary);
  color: var(--text-secondary);
  font-size: 0.73rem;
}

.pull-recap-empty {
  padding: 12px 0;
  text-align: center;
}

.pull-recap-result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pull-recap-preview--export .pull-recap-result-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.pull-recap-result {
  position: relative;
  min-width: 0;
}

.pull-recap-card-action {
  position: absolute;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-primary);
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
}

.pull-recap-remove {
  top: 4px;
  right: 4px;
}

.pull-recap-remove:hover {
  color: var(--color-negative);
}

.pull-recap-edit {
  bottom: 4px;
  left: 4px;
}

.pull-recap-edit:hover,
.pull-recap-edit[aria-expanded='true'] {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.pull-recap-edit-panel {
  position: absolute;
  z-index: 2;
  top: calc(100% + 4px);
  left: 0;
  display: grid;
  gap: 10px;
  width: 156px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-secondary);
  font-size: 0.8rem;
}

.pull-recap-result:nth-child(3n + 2) .pull-recap-edit-panel {
  left: 50%;
  transform: translateX(-50%);
}

.pull-recap-result:nth-child(3n) .pull-recap-edit-panel {
  right: 0;
  left: auto;
}

.pull-recap-edit-field {
  display: grid;
  gap: 4px;
}

.pull-recap-edit-input {
  min-width: 0;
  min-height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-primary);
  font: inherit;
}

.pull-recap-pity-option,
.pull-recap-pity-legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pull-recap-pity-option {
  min-height: 28px;
  padding: 4px 6px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-primary);
  color: var(--text-primary);
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.pull-recap-pity-option:hover,
.pull-recap-pity-option[aria-pressed='true'] {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.pull-recap-pity-legend {
  --pull-recap-pity-icon-background: var(--background-secondary);
  display: flex;
  gap: 14px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  color: var(--text-secondary);
  font-size: 0.8rem;
  white-space: nowrap;
}

.pull-recap-pity-legend li {
  flex: none;
}

.pull-recap-preview:not(.pull-recap-preview--export) .pull-recap-pity-legend {
  overflow-x: auto;
}

@media (max-width: 500px) {
  .pull-recap-preview:not(.pull-recap-preview--export) .pull-recap-sections {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
