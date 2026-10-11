<script setup lang="ts">
import { ref } from 'vue';
import { $t } from '@/locales';
import type { ChibiPlayback } from '@/types/chibi';

const props = defineProps<{ playback?: ChibiPlayback }>();
const emit = defineEmits<{
  pause: [paused: boolean];
  seek: [time: number];
  seekStart: [];
  seekEnd: [];
  resetView: [];
}>();
const seeking = ref(false);

function startSeek(): void {
  if (seeking.value || !props.playback?.duration) return;
  seeking.value = true;
  emit('seekStart');
}

function seek(event: Event): void {
  startSeek();
  emit('seek', (event.target as HTMLInputElement).valueAsNumber);
}

function endSeek(): void {
  if (!seeking.value) return;
  seeking.value = false;
  emit('seekEnd');
}

function onSeekKey(event: KeyboardEvent): void {
  if (
    [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ].includes(event.key)
  )
    startSeek();
}
</script>

<template>
  <div class="chibi-player" @pointerdown.stop>
    <div class="chibi-player__timeline">
      <button
        type="button"
        class="chibi-player__toggle"
        :disabled="!playback?.duration"
        :aria-label="playback?.paused ? $t('chibi.play') : $t('chibi.pause')"
        :title="playback?.paused ? $t('chibi.play') : $t('chibi.pause')"
        @click="emit('pause', !playback?.paused)"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path v-if="playback?.paused" d="M8 5v14l11-7z" />
          <path v-else d="M6 5h4v14H6zm8 0h4v14h-4z" />
        </svg>
      </button>
      <input
        class="chibi-player__seek"
        type="range"
        min="0"
        :max="playback?.duration || 1"
        step="0.01"
        :value="playback?.time ?? 0"
        :disabled="!playback?.duration"
        :aria-label="$t('chibi.animationPosition')"
        :aria-valuetext="`${(playback?.time ?? 0).toFixed(1)} / ${(playback?.duration ?? 0).toFixed(1)} s`"
        @pointerdown="startSeek"
        @input="seek"
        @change="endSeek"
        @pointerup="endSeek"
        @pointercancel="endSeek"
        @keydown="onSeekKey"
        @keyup="endSeek"
        @blur="endSeek"
      />
      <span class="chibi-player__time">
        {{ (playback?.time ?? 0).toFixed(1) }} / {{ (playback?.duration ?? 0).toFixed(1) }} s
      </span>
      <button type="button" class="chibi-player__reset" @click="emit('resetView')">
        {{ $t('chibi.resetView') }}
      </button>
    </div>
    <div v-if="$slots.default" class="chibi-player__controls"><slot /></div>
  </div>
</template>

<style scoped>
.chibi-player {
  position: absolute;
  bottom: max(16px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  width: min(560px, calc(100% - 24px));
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--background-primary);
  color: var(--text-primary);
}

.chibi-player__timeline,
.chibi-player__controls {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.chibi-player__controls {
  margin-top: 8px;
  flex-wrap: wrap;
}

.chibi-player__seek {
  flex: 1;
  min-width: 40px;
  accent-color: var(--accent-color);
  cursor: pointer;
}

.chibi-player__time {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--text-secondary);
}

.chibi-player button {
  min-height: 36px;
  padding: 0 10px;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

.chibi-player button:hover:not(:disabled) {
  border-color: var(--accent-color);
}

.chibi-player button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chibi-player__toggle svg {
  width: 18px;
  height: 18px;
  display: block;
}

@media (max-width: 420px) {
  .chibi-player__timeline {
    gap: 4px;
  }

  .chibi-player button {
    padding: 0 6px;
  }
}
</style>
