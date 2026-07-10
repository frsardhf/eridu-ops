<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import SelectMenu from '@/components/shared/SelectMenu.vue';
import { useChibi3dInteractionScene } from '@/composables/useChibi3dInteractionScene';
import { useWindowResize } from '@/composables/dom/useWindowResize';
import { CHIBI_ZOOM_MIN, CHIBI_ZOOM_MAX } from '@/composables/chibi3dCore';

// Full-viewport orbit stage for cafe furniture interactions (POC furniture.html, furniture
// branch): pick a furniture scene + an interaction-clip variant; the scene seats the matching
// character(s) at the furniture GLB and plays them against it. Drag to spin, wheel/slider to zoom.
const props = defineProps<{ charIds: readonly string[] }>();

const stageEl = ref<HTMLElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const zoom = ref(0.75); // pulled back a bit so the character + furniture both frame
const furniture = ref('');

const {
  ready,
  error,
  furnitureOptions,
  clipOptions,
  currentClip,
  loadScene,
  playScene,
  setOrbitEnabled,
  setZoom,
  resize,
} = useChibi3dInteractionScene(canvasEl, {
  charIds: props.charIds,
  onZoomChange: (z) => (zoom.value = z),
});

// The scene builds the furniture catalog on mount; pick the first, then reload on change.
watch(furnitureOptions, (opts) => {
  if (opts.length && !furniture.value) furniture.value = opts[0].value;
});
watch(furniture, (label) => {
  if (label) loadScene(label);
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
      <!-- Level 1: furniture + variant dropdowns. -->
      <div class="chibi-int__row">
        <SelectMenu
          v-if="furnitureOptions.length"
          v-model="furniture"
          :options="furnitureOptions"
          aria-label="Furniture"
        />
        <!-- Variant lives in its own dropdown beside the furniture picker, so the furniture
             selector stays a clean furniture-only list. Shown whenever the loaded furniture has
             any variants (single-variant furniture like avantgardekun just shows one). -->
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
          :min="CHIBI_ZOOM_MIN"
          :max="CHIBI_ZOOM_MAX"
          step="0.05"
        />
      </label>
      <!-- Level 3: controls guide. -->
      <span class="chibi-int__hint">drag to spin · wheel to zoom · arrows to pan</span>
    </div>

    <div v-if="!ready || error" class="chibi-int__status">
      <span v-if="error">No furniture scenes available.</span>
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
