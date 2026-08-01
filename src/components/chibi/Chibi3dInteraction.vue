<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import SelectMenu from '@/components/shared/SelectMenu.vue';
import Chibi3dOrbitHint from '@/components/chibi/Chibi3dOrbitHint.vue';
import { useChibi3dInteractionScene } from '@/composables/useChibi3dInteractionScene';
import { useWindowResize } from '@/composables/dom/useWindowResize';
import { CHIBI_INT_ZOOM_MIN, CHIBI_ZOOM_MAX } from '@/composables/chibi3dCore';

// Full-viewport orbit stage for cafe interactions: pick a scene and clip variant. The scene seats
// the character(s) and plays the interaction. The `kind` prop scopes it to furniture (character
// plus prop) or victory (character pair post-battle pose).
const props = defineProps<{
  charIds: readonly string[];
  kind: 'furniture' | 'victory';
  charName?: (cid: string) => string;
}>();

const stageEl = ref<HTMLElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const zoom = ref(0.75); // pulled back a bit so the character(s) + prop both frame
const sceneId = ref('');

const {
  ready,
  error,
  sceneOptions,
  clipOptions,
  currentClip,
  loadScene,
  playScene,
  setOrbitEnabled,
  setZoom,
  resize,
} = useChibi3dInteractionScene(canvasEl, {
  charIds: props.charIds,
  charName: props.charName,
  onZoomChange: (z) => (zoom.value = z),
});

// Scenes of this tab's kind only (furniture or victory). Recomputes when the catalog loads or
// the kind prop flips, so switching Furniture<->Victory re-filters without a full remount.
const visibleScenes = computed(() => sceneOptions.value.filter((o) => o.kind === props.kind));

// Keep the selection valid for the current kind; picking the first (re)loads via the sceneId watch.
watch(
  visibleScenes,
  (scenes) => {
    if (!scenes.some((o) => o.value === sceneId.value)) sceneId.value = scenes[0]?.value ?? '';
  },
  { immediate: true },
);
watch(sceneId, (id) => {
  if (id) loadScene(id);
});
watch(zoom, (z) => setZoom(z));

function fit(): void {
  const el = stageEl.value;
  if (el) resize(el.clientWidth, el.clientHeight);
}
useWindowResize(fit);

onMounted(() => {
  fit();
  setOrbitEnabled(true, stageEl.value ?? undefined);
  setZoom(zoom.value);
});
</script>

<template>
  <div ref="stageEl" class="chibi-int">
    <canvas ref="canvasEl" class="chibi-int__canvas"></canvas>

    <div class="chibi-int__panel" @pointerdown.stop>
      <!-- Level 1: scene (furniture or duo) + variant dropdowns. -->
      <div class="chibi-int__row">
        <SelectMenu
          v-if="visibleScenes.length"
          v-model="sceneId"
          :options="visibleScenes"
          aria-label="Scene"
        />
        <!-- Variant lives in its own dropdown beside the scene picker, so the scene selector
             stays a clean scene-only list. Shown whenever the loaded scene has any variants
             (furniture: clip variants; duo: the shared Start / End interaction). -->
        <SelectMenu
          v-if="clipOptions.length"
          :model-value="currentClip"
          :options="clipOptions"
          placeholder="Variant"
          aria-label="Interaction variant"
          @update:model-value="playScene"
        />
      </div>
      <!-- Level 2: size slider. -->
      <label class="chibi-slider">
        Size ×{{ zoom.toFixed(2) }}
        <input
          v-model.number="zoom"
          type="range"
          :min="CHIBI_INT_ZOOM_MIN"
          :max="CHIBI_ZOOM_MAX"
          step="0.05"
        />
      </label>
      <!-- Level 3: controls guide. -->
      <Chibi3dOrbitHint class="chibi-int__hint" />
    </div>

    <div v-if="!ready || error" class="chibi-int__status">
      <span v-if="error">No scenes available.</span>
      <span v-else class="chibi-int__spinner"></span>
    </div>
  </div>
</template>

<style scoped>
.chibi-int {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: radial-gradient(
    circle at 50% 30%,
    var(--background-secondary),
    var(--background-primary)
  );
  cursor: grab;
  user-select: none;
}

.chibi-int:active {
  cursor: grabbing;
}

.chibi-int__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

/* Top-left controls panel; stacks in three rows: dropdowns, then slider, then the controls guide. */
.chibi-int__panel {
  position: absolute;
  z-index: 2;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 8px 10px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.chibi-int__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chibi-int__hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.chibi-slider {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.chibi-slider input {
  width: 120px;
  accent-color: var(--accent-color);
  cursor: pointer;
}

.chibi-int__status {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  pointer-events: none;
}

.chibi-int__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: chibi-int-spin 0.8s linear infinite;
}

@keyframes chibi-int-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
