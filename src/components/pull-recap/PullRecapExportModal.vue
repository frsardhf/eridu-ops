<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import type { PullRecapResultSection } from '@/types/pullRecap';
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue';
import { useImageExport } from '@/composables/useImageExport';
import { $t } from '@/locales';
import PullRecapResults from './PullRecapResults.vue';

const props = defineProps<{
  sections: PullRecapResultSection[];
  title: string;
  pullSummary: string;
}>();

const emit = defineEmits<{ close: [] }>();
const palettes = ['light', 'dark'] as const;
const palette = ref<(typeof palettes)[number]>('light');
const showPullNumbers = ref(false);
const hasPullNumbers = computed(() =>
  props.sections.some(({ cards }) => cards.some(({ pullNumber }) => pullNumber !== undefined)),
);
const dialog = ref<HTMLDialogElement | null>(null);
const source = ref<HTMLElement | null>(null);
const image = shallowRef<{ blob: Blob; url: string } | null>(null);
const rendering = ref(true);
const exportFailed = ref(false);
const copyStatus = ref<'idle' | 'copying' | 'copied' | 'failed'>('idle');
const copySupported = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
const { capturePngBlob } = useImageExport();
let disposed = false;

function releaseImage() {
  if (image.value) URL.revokeObjectURL(image.value.url);
  image.value = null;
}

async function renderPreview() {
  rendering.value = true;
  exportFailed.value = false;
  copyStatus.value = 'idle';
  releaseImage();

  try {
    await nextTick();
    if (disposed || !source.value) return;
    const blob = await capturePngBlob(source.value);
    if (disposed) return;
    if (blob?.size) image.value = { blob, url: URL.createObjectURL(blob) };
    else exportFailed.value = true;
  } catch {
    if (!disposed) exportFailed.value = true;
  } finally {
    if (!disposed) rendering.value = false;
  }
}

function selectPalette(value: (typeof palettes)[number]) {
  if (rendering.value || palette.value === value) return;
  palette.value = value;
  void renderPreview();
}

function togglePullNumbers() {
  if (rendering.value) return;
  showPullNumbers.value = !showPullNumbers.value;
  void renderPreview();
}

async function copyImage() {
  const current = image.value;
  if (!current || !copySupported || copyStatus.value === 'copying') return;
  copyStatus.value = 'copying';

  try {
    // Start the clipboard write on the click, with the PNG already rendered.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': current.blob })]);
    if (image.value === current) copyStatus.value = 'copied';
  } catch {
    if (image.value === current) copyStatus.value = 'failed';
  }
}

onMounted(() => {
  dialog.value?.showModal();
  void renderPreview();
});

onBeforeUnmount(() => {
  disposed = true;
  releaseImage();
});
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="pull-recap-export"
      aria-labelledby="pull-recap-export-heading"
      @close="emit('close')"
    >
      <header class="pull-recap-export-toolbar">
        <h2 id="pull-recap-export-heading">{{ $t('pullRecap.exportPreview') }}</h2>
        <div class="pull-recap-export-controls">
          <div
            class="pull-recap-export-palettes"
            role="group"
            :aria-label="$t('pullRecap.imageTheme')"
          >
            <button
              v-for="option in palettes"
              :key="option"
              type="button"
              class="pull-recap-export-button"
              :aria-pressed="palette === option"
              :disabled="rendering"
              @click="selectPalette(option)"
            >
              {{ $t(`pullRecap.${option}`) }}
            </button>
          </div>
          <button
            v-if="hasPullNumbers"
            type="button"
            class="pull-recap-export-button"
            :aria-pressed="showPullNumbers"
            :disabled="rendering"
            @click="togglePullNumbers"
          >
            {{ $t('pullRecap.showPullNumbers') }}
          </button>
          <button
            type="button"
            class="pull-recap-export-button"
            :disabled="!image || !copySupported || copyStatus === 'copying'"
            @click="copyImage"
          >
            {{ $t('pullRecap.copyImage') }}
          </button>
          <a
            class="pull-recap-export-button primary"
            :href="image?.url"
            :aria-disabled="!image"
            download="eridu-ops-pull-recap.png"
          >
            {{ $t('pullRecap.download') }}
          </a>
        </div>
        <button
          type="button"
          class="pull-recap-export-button pull-recap-export-close"
          autofocus
          @click="dialog?.close()"
        >
          {{ $t('close') }}
        </button>
        <p v-if="copyStatus === 'copied'" class="pull-recap-export-message" role="status">
          {{ $t('pullRecap.copied') }}
        </p>
        <p v-else-if="copyStatus === 'failed'" class="pull-recap-export-message" role="alert">
          {{ $t('pullRecap.copyFailed') }}
        </p>
        <p v-else-if="image && !copySupported" class="pull-recap-export-message">
          {{ $t('pullRecap.copyUnavailable') }}
        </p>
      </header>

      <div class="pull-recap-export-stage" :data-export-theme="palette" :aria-busy="rendering">
        <LoadingSpinner v-if="rendering" block />
        <div v-else-if="exportFailed" class="pull-recap-export-error" role="alert">
          <p>{{ $t('pullRecap.exportFailed') }}</p>
          <button type="button" class="pull-recap-export-button" @click="renderPreview">
            {{ $t('retry') }}
          </button>
        </div>
        <img
          v-else-if="image"
          :src="image.url"
          :alt="$t('pullRecap.preview')"
          class="pull-recap-export-image"
        />
      </div>

      <div class="pull-recap-export-source" aria-hidden="true">
        <div ref="source" :data-export-theme="palette">
          <PullRecapResults
            :title="title"
            :pull-summary="pullSummary"
            :sections="sections"
            :show-pull-numbers="showPullNumbers"
            export-layout
          />
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.pull-recap-export {
  --pull-recap-export-width: 1200px;
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: var(--background-primary);
  color: var(--text-primary);
}

.pull-recap-export[open] {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.pull-recap-export-toolbar,
.pull-recap-export-controls,
.pull-recap-export-palettes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pull-recap-export-toolbar {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-secondary);
}

.pull-recap-export-toolbar h2 {
  margin: 0 auto 0 0;
  font-size: 1rem;
  font-weight: 650;
}

.pull-recap-export-palettes {
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.pull-recap-export-button {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 5px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.pull-recap-export-palettes .pull-recap-export-button {
  min-height: 28px;
  padding-block: 3px;
  border-color: transparent;
  border-radius: 6px;
  background: transparent;
}

.pull-recap-export-button[aria-pressed='true'] {
  background: color-mix(in srgb, var(--accent-color) 14%, transparent);
  color: var(--accent-color);
}

.pull-recap-export-button:hover:not(:disabled):not([aria-disabled='true']) {
  border-color: var(--accent-color);
}

.pull-recap-export-button.primary {
  border-color: var(--accent-color);
  background: var(--accent-color);
  color: var(--text-on-accent);
}

.pull-recap-export-button:disabled,
.pull-recap-export-button[aria-disabled='true'] {
  opacity: 0.5;
  cursor: not-allowed;
}

.pull-recap-export-message {
  flex-basis: 100%;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* Export colors stay independent of the app theme. */
[data-export-theme='light'] {
  color-scheme: light;
  --background-primary: white;
  --background-secondary: hsl(0 0% 97%);
  --text-primary: hsl(0 0% 9%);
  --text-secondary: hsl(0 0% 35%);
  --border-color: hsl(0 0% 86%);
  --accent-color: var(--text-primary);
}

[data-export-theme='dark'] {
  color-scheme: dark;
  --background-primary: hsl(0 0% 13%);
  --background-secondary: hsl(0 0% 8%);
  --text-primary: hsl(0 0% 97%);
  --text-secondary: hsl(0 0% 72%);
  --border-color: hsl(0 0% 27%);
  --accent-color: var(--text-primary);
}

.pull-recap-export-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: auto;
  background: var(--background-primary);
  color: var(--text-primary);
}

.pull-recap-export-error,
.pull-recap-export-stage > :first-child {
  margin-block: auto;
}

.pull-recap-export-error {
  text-align: center;
}

.pull-recap-export-error p {
  margin: 0 0 8px;
}

.pull-recap-export-image {
  flex: none;
  width: 100%;
  max-width: var(--pull-recap-export-width);
  height: auto;
}

.pull-recap-export-source {
  position: fixed;
  top: 0;
  left: -10000px;
  width: var(--pull-recap-export-width);
  pointer-events: none;
}

@media (max-width: 620px) {
  .pull-recap-export-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .pull-recap-export-close {
    grid-area: 1 / 2;
  }

  .pull-recap-export-controls,
  .pull-recap-export-message {
    grid-column: 1 / -1;
  }
}
</style>
