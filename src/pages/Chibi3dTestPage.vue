<script setup lang="ts">
import { ref, computed, watch, useTemplateRef } from 'vue';
import { $t } from '@/locales';
import Chibi3dPet from '@/components/chibi/Chibi3dPet.vue';
import SelectMenu from '@/components/shared/SelectMenu.vue';
import { CHIBI_VOICE_LINES } from '@/composables/useChibiVoice';
import { useWindowResize } from '@/composables/dom/useWindowResize';
import { useStudentData } from '@/lib/hooks/useStudentData';

// Dev surface for the live-3D chibi (Road 2). Mirrors /chibi but renders the GLB
// in three.js instead of stepping sprite sheets. Not linked from nav.

// Chibi assets we ship (public/chibi3d/<id>). Names come from the IndexedDB student
// store (matched by DevName), not hardcoded: SchaleDB is only fetched via the R2 voice.
const CHIBI_CHAR_IDS = ['ch0158', 'ch0242', 'ch0243', 'ch0331', 'ch0333'] as const;

// Persist the selected character across reloads (dev convenience; own localStorage key,
// not the app's AppSettings blob since this is an unlinked test surface).
const CHAR_STORAGE_KEY = 'chibi3d-char';
const storedChar = localStorage.getItem(CHAR_STORAGE_KEY);
const charId = ref<string>(
  storedChar && (CHIBI_CHAR_IDS as readonly string[]).includes(storedChar)
    ? storedChar
    : CHIBI_CHAR_IDS[0],
);
watch(charId, (id) => localStorage.setItem(CHAR_STORAGE_KEY, id));

const { studentData } = useStudentData();
const studentNameByDevName = computed(() => {
  const map = new Map<string, string>();
  for (const s of Object.values(studentData.value)) {
    if (s.DevName) map.set(s.DevName.toUpperCase(), s.Name);
  }
  return map;
});
// Name only (no striker/special role) for the character picker.
const charOptions = computed(() =>
  CHIBI_CHAR_IDS.map((id) => ({
    value: id,
    label: studentNameByDevName.value.get(id.toUpperCase()) ?? id,
  })),
);

// Live-tunable apparent size (camera dolly). armedSpeedMult stays baked at the component
// default (1.70) now that it's calibrated; this slider was repurposed for sizing.
const zoom = ref(1.25);

// Inspection orbit mode: drag spins the camera; pet walking/pickup suspend while on.
const orbit = ref(false);

// Inspect mode: the pet swells to a large centred stage and the camera pulls back, so
// furniture/event clips (which reach past the 540 pet frame) show uncropped. Toggled
// manually; also auto-entered when an inspect-only clip is picked. Pair with Orbit to spin.
const PET_SIZE = 540;
const INSPECT_ZOOM = 0.6; // dolly out (camera distance 3 / 0.6 = 5) for the wider clips
const inspect = ref(false);

// Inspect canvas fills the stage as a large square (min viewport edge, capped).
const viewport = ref({ w: window.innerWidth, h: window.innerHeight });
useWindowResize(() => {
  viewport.value = { w: window.innerWidth, h: window.innerHeight };
});
const inspectSize = computed(() => Math.min(viewport.value.w, viewport.value.h));
const petSize = computed(() => (inspect.value ? inspectSize.value : PET_SIZE));
const petZoom = computed(() => (inspect.value ? INSPECT_ZOOM : zoom.value));

const pet = useTemplateRef<InstanceType<typeof Chibi3dPet>>('pet');

// Quick-hold buttons: the common poses. Clips no-op on units that lack them (e.g.
// Formation_* on the special). The full clip list lives in the dropdown beside these.
const QUICK_CLIPS = [
  { label: 'Walk', clip: 'Cafe_Walk' },
  { label: 'Move', clip: 'Move_Ing' },
  { label: 'Idle', clip: 'Cafe_Idle' },
  { label: 'Random', clip: 'Formation_Idle_Random' },
] as const;

// Full-viewport Inspect is reserved for the clips that reach past the pet frame: furniture
// (my_event* on Rio, Cafe_my* on newer characters) and paired interaction clips (*_Interaction).
// Everything else (Cafe_Idle/Walk/Reaction, Formation_*, Move_*, Exs*, Tactical_*, ...) still
// frames fine in the 540 chibi canvas. The dropdown is scoped to the mode, so those wide clips
// are only reachable with Inspect on.
const INSPECT_CLIP_RE = /(^my_event|^cafe_my|interaction)/i;
const clipNames = computed(() => pet.value?.clipNames ?? []);
const inspectClips = computed(() => clipNames.value.filter((c) => INSPECT_CLIP_RE.test(c)));
const canvasClips = computed(() => clipNames.value.filter((c) => !INSPECT_CLIP_RE.test(c)));
const animOptions = computed(() =>
  (inspect.value ? inspectClips.value : canvasClips.value).map((name) => ({
    value: name,
    label: name,
  })),
);

// Lower-cased clip set for the loaded character, so a quick button greys out when its
// clip is absent (e.g. Move_Ing on specials, who have no armed walk).
const availableClips = computed(() => new Set(clipNames.value.map((name) => name.toLowerCase())));
function hasQuickClip(clip: string): boolean {
  return availableClips.value.has(clip.toLowerCase());
}
// Single entry point for both the quick buttons and the dropdown: play the clip and
// mirror it into the dropdown value, resolved to the GLB's canonical name so the
// SelectMenu highlights the matching row (quick-button labels may differ in case).
const selectedAnim = ref('');
function playAnim(clip: string): void {
  const canonical = clipNames.value.find((c) => c.toLowerCase() === clip.toLowerCase()) ?? clip;
  selectedAnim.value = canonical;
  pet.value?.playClip(canonical);
}

// Quick buttons are pet clips: pressing one drops back to the 540 pet framing first.
function onQuickClip(clip: string): void {
  inspect.value = false;
  playAnim(clip);
}

// Manual Inspect toggle. Leaving Inspect resets to the pet idle so a wide clip that was
// playing doesn't linger cropped in the shrunk 540 canvas.
function toggleInspect(): void {
  inspect.value = !inspect.value;
  selectedAnim.value = '';
  if (!inspect.value) playAnim('Cafe_Idle');
}

function onStagePointerDown(e: PointerEvent): void {
  if (orbit.value || inspect.value) return; // no walk-to-click while inspecting
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  pet.value?.walkTo(e.clientX - rect.left, e.clientY - rect.top);
}
</script>

<template>
  <div
    class="chibi-stage"
    :class="{ 'chibi-stage--orbit': orbit || inspect }"
    @pointerdown="onStagePointerDown"
  >
    <div class="chibi-orbit" @pointerdown.stop>
      <div class="chibi-toggle">
        <input
          id="orbit-toggle"
          type="checkbox"
          :checked="orbit || inspect"
          :disabled="inspect"
          @change="orbit = !orbit"
        />
        <label for="orbit-toggle" title="Toggle orbit inspection">
          <span class="chibi-switch" aria-hidden="true"></span>
          Orbit
        </label>
      </div>
      <span class="chibi-orbit__hint">{{
        orbit || inspect ? 'drag to spin · wheel to zoom' : $t('chibi.hint')
      }}</span>
    </div>

    <div class="chibi-chars" @pointerdown.stop>
      <SelectMenu v-model="charId" :options="charOptions" align="right" aria-label="Character" />
      <label v-if="!inspect" class="chibi-slider">
        Size ×{{ zoom.toFixed(2) }}
        <input v-model.number="zoom" type="range" min="1" max="1.5" step="0.05" />
      </label>
    </div>

    <Chibi3dPet
      :key="charId"
      ref="pet"
      :char-id="charId"
      :size="petSize"
      :zoom="petZoom"
      :orbit="orbit || inspect"
    />

    <div class="chibi-debug" @pointerdown.stop>
      <div class="chibi-toggle">
        <input id="inspect-toggle" type="checkbox" :checked="inspect" @change="toggleInspect" />
        <label for="inspect-toggle" title="Toggle full-viewport inspect">
          <span class="chibi-switch" aria-hidden="true"></span>
          Inspect
        </label>
      </div>
      <SelectMenu
        :model-value="selectedAnim"
        :options="animOptions"
        :placeholder="inspect ? 'Interaction' : 'Chibi'"
        aria-label="Animation"
        @update:model-value="playAnim"
      />
      <button
        v-for="d in QUICK_CLIPS"
        :key="d.clip"
        type="button"
        class="chibi-debug__btn"
        :disabled="!hasQuickClip(d.clip)"
        @click="onQuickClip(d.clip)"
      >
        {{ d.label }}
      </button>
    </div>

    <div class="chibi-voice" @pointerdown.stop>
      <div class="chibi-voice__title">Voice ({{ charId }})</div>
      <div v-for="line in CHIBI_VOICE_LINES" :key="line" class="chibi-voice__row">
        <span
          class="chibi-voice__dot"
          :class="`is-${pet?.voiceStatus?.[line] ?? 'loading'}`"
        ></span>
        {{ line }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.chibi-stage {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: radial-gradient(
    circle at 50% 30%,
    var(--background-secondary),
    var(--background-primary)
  );
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
}

.chibi-stage--orbit {
  cursor: grab;
}

.chibi-stage--orbit:active {
  cursor: grabbing;
}

.chibi-voice {
  position: absolute;
  z-index: 2; /* stay above the pet canvas, which swells over the corners in Inspect mode */
  bottom: 16px;
  left: 16px;
  padding: 10px 12px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.chibi-voice__title {
  margin-bottom: 6px;
  color: var(--text-primary);
  font-weight: 600;
}

.chibi-voice__row {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.6;
}

.chibi-voice__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  background: var(--text-secondary);
}

.chibi-voice__dot.is-available {
  background: #3fb950;
}

.chibi-voice__dot.is-missing {
  background: #f85149;
}

/* Not requested (battle lines on specials: skipped to avoid the 404/CORB). */
.chibi-voice__dot.is-idle {
  background: transparent;
  border: 1px solid var(--border-color);
}

.chibi-orbit {
  position: absolute;
  z-index: 2;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.chibi-orbit__hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.chibi-chars {
  position: absolute;
  z-index: 2;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.chibi-debug {
  position: absolute;
  z-index: 2;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

/* Quick-hold buttons sit in one row beside the anim dropdown, uniform width. */
.chibi-debug .chibi-debug__btn {
  min-width: 72px;
}

.chibi-debug__btn--active {
  border-color: var(--accent-color);
  color: var(--accent-color);
  background: var(--background-primary);
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

.chibi-debug__btn {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: var(--text-primary);
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
}

.chibi-debug__btn:hover:not(:disabled) {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.chibi-debug__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Pill toggle for Orbit / Inspect: same hidden-checkbox + highlighting-label pattern as the
   modal's maxAll / target toggles (studentModal.css .modal-toggle-item), state shown by the
   accent fill instead of an ": On/Off" suffix. */
.chibi-toggle {
  position: relative;
}

.chibi-toggle input[type='checkbox'] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.chibi-toggle label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

/* Sliding on/off switch: the affordance that tells first-time users the pill is interactive.
   Track fills with the accent and the knob slides right when checked. */
.chibi-switch {
  position: relative;
  display: inline-block;
  flex: none;
  width: 30px;
  height: 18px;
  border-radius: 999px;
  background: var(--border-color);
  transition: background 0.2s ease;
}

.chibi-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--background-primary);
  transition: transform 0.2s ease;
}

.chibi-toggle input[type='checkbox']:checked + label {
  border-color: var(--accent-color);
  color: var(--text-primary);
}

.chibi-toggle input[type='checkbox']:checked + label .chibi-switch {
  background: var(--accent-color);
}

.chibi-toggle input[type='checkbox']:checked + label .chibi-switch::after {
  transform: translateX(12px);
}

.chibi-toggle input[type='checkbox']:not(:disabled) + label:hover {
  border-color: var(--accent-color);
}

.chibi-toggle input[type='checkbox']:disabled + label {
  cursor: default;
  opacity: 0.7;
}

.chibi-toggle input[type='checkbox']:focus-visible + label {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
}
</style>
