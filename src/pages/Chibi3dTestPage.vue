<script setup lang="ts">
import { ref, computed, watch, useTemplateRef } from 'vue';
import { $t } from '@/locales';
import Chibi3dPet from '@/components/chibi/Chibi3dPet.vue';
import Chibi3dInteraction from '@/components/chibi/Chibi3dInteraction.vue';
import { CHIBI_ZOOM_MIN, CHIBI_ZOOM_MAX } from '@/composables/chibi3dCore';
import SelectMenu from '@/components/shared/SelectMenu.vue';
import SearchSelect from '@/components/shared/SearchSelect.vue';
import { CHIBI_VOICE_LINES } from '@/composables/useChibiVoice';
import { useStudentData } from '@/lib/hooks/useStudentData';
import { getStudentIconUrl } from '@/lib/utils/iconUtils';
import { useTooltip } from '@/composables/useTooltip';
import '@/styles/tooltip.css';

// Dev surface for the live-3D chibi (Road 2). Mirrors /chibi but renders the GLB
// in three.js instead of stepping sprite sheets. Not linked from nav.

// Chibi assets we ship (public/chibi3d/<id>). Names come from the IndexedDB student
// store (matched by DevName), not hardcoded: SchaleDB is only fetched via the R2 voice.
const CHIBI_CHAR_IDS = ['ch0158', 'ch0242', 'ch0243', 'ch0331', 'ch0333'] as const;

// Copyright / fan-use notice for the ripped 3D assets. Kept in English (unlinked dev surface);
// the localized version lives in the Credits modal (creditsModal.disclaimer*).
const LEGAL_NOTICE =
  'Blue Archive and all game assets (3D models, animations, textures, voices) are © NEXON Games / Yostar. ' +
  'Non-commercial fan project for personal and educational use only; not for sale or redistribution. ' +
  'Not affiliated with or endorsed by NEXON.';

// Proper hover tooltip for the disclaimer (same primitive as GiftOption's), not a native title.
const { activeTooltip, tooltipStyle, tooltipRef, showTooltip, hideTooltip } = useTooltip<'legal'>();

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
const studentByDevName = computed(() => {
  const map = new Map<string, { name: string; id: number }>();
  for (const s of Object.values(studentData.value)) {
    if (s.DevName) map.set(s.DevName.toUpperCase(), { name: s.Name, id: s.Id });
  }
  return map;
});
// Resolve a chibi cid to its student name (falls back to the cid), shared by the character
// picker and the interaction stage's victory labels.
function resolveCharName(cid: string): string {
  return studentByDevName.value.get(cid.toUpperCase())?.name ?? cid;
}
// Name + portrait for the searchable character picker (no striker/special role).
const charOptions = computed(() =>
  CHIBI_CHAR_IDS.map((cid) => {
    const student = studentByDevName.value.get(cid.toUpperCase());
    return {
      value: cid,
      label: student?.name ?? cid,
      icon: student ? getStudentIconUrl(student.id) : undefined,
    };
  }),
);

// Shared apparent-size slider (camera dolly): higher = closer = bigger chibi. Drives both the
// pet framing and Inspect (setZoom dollies the orbit camera too), so there's one Size control
// for every mode. Default sits a touch enlarged.
const zoom = ref(1.25);

// Inspect mode: the pet canvas fills the viewport (wide) and orbit turns on so furniture/event
// clips that reach past the 540 pet frame show uncropped (Orbit is folded into Inspect: there's
// no separate orbit toggle). The wide canvas + resize live in the pet.
const PET_SIZE = 540;
const inspect = ref(false);

// Stage mode: the roaming pet, or one of the interaction stages (furniture / victory), each a
// separate multi-object scene owning its own canvas + pickers (via Chibi3dInteraction's kind).
const mode = ref<'pet' | 'furniture' | 'victory'>('pet');

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
  if (inspect.value) return; // no walk-to-click while inspecting
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  pet.value?.walkTo(e.clientX - rect.left, e.clientY - rect.top);
}
</script>

<template>
  <div class="chibi-page">
    <!-- Light fan-use notice; hover for the full copyright disclaimer. -->
    <div class="chibi-legal" @mouseenter="showTooltip($event, 'legal')" @mouseleave="hideTooltip()">
      © NEXON / Yostar · fan project, not for sale
    </div>
    <div
      v-if="activeTooltip === 'legal'"
      ref="tooltipRef"
      class="modal-tooltip"
      :style="tooltipStyle"
    >
      <div class="tooltip-desc">{{ LEGAL_NOTICE }}</div>
    </div>

    <!-- Top-level mode: a segmented control (either/or between two named stages), distinct from
         the on/off view switches below. -->
    <div class="chibi-mode" @pointerdown.stop>
      <div class="chibi-seg" role="group" aria-label="Stage mode">
        <button
          type="button"
          class="chibi-seg__btn"
          :class="{ 'chibi-seg__btn--active': mode === 'pet' }"
          @click="mode = 'pet'"
        >
          <svg
            class="chibi-ico"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="3" />
            <path d="M12 8v7" />
            <path d="M8 11h8" />
            <path d="M8 21l4-6 4 6" />
          </svg>
          Pet
        </button>
        <button
          type="button"
          class="chibi-seg__btn"
          :class="{ 'chibi-seg__btn--active': mode === 'furniture' }"
          @click="mode = 'furniture'"
        >
          <svg
            class="chibi-ico"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 10V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
            <path d="M2 12a2 2 0 0 1 4 0v3h12v-3a2 2 0 0 1 4 0v6H2z" />
          </svg>
          Furniture
        </button>
        <button
          type="button"
          class="chibi-seg__btn"
          :class="{ 'chibi-seg__btn--active': mode === 'victory' }"
          @click="mode = 'victory'"
        >
          <svg
            class="chibi-ico"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="8" cy="7" r="2.4" />
            <circle cx="16" cy="7" r="2.4" />
            <path d="M3.5 20c0-3 2-5 4.5-5s4.5 2 4.5 5" />
            <path d="M11.5 20c0-3 2-5 4.5-5s4.5 2 4.5 5" />
          </svg>
          Victory
        </button>
      </div>
    </div>

    <Chibi3dInteraction
      v-if="mode !== 'pet'"
      :char-ids="CHIBI_CHAR_IDS"
      :kind="mode === 'victory' ? 'victory' : 'furniture'"
      :char-name="resolveCharName"
    />

    <div
      v-if="mode === 'pet'"
      class="chibi-stage"
      :class="{ 'chibi-stage--orbit': inspect }"
      @pointerdown="onStagePointerDown"
    >
      <!-- View cluster: Inspect toggle (folds in orbit + wide framing) + size + controls hint. -->
      <div class="chibi-orbit" @pointerdown.stop>
        <div class="chibi-toggle">
          <input id="inspect-toggle" type="checkbox" :checked="inspect" @change="toggleInspect" />
          <label for="inspect-toggle" title="Toggle full-viewport inspect">
            <span class="chibi-switch" aria-hidden="true"></span>
            <svg
              class="chibi-ico"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M16 3h3a2 2 0 0 1 2 2v3" />
              <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
              <path d="M16 21h3a2 2 0 0 1 2-2v-3" />
            </svg>
            Inspect
          </label>
        </div>
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
        <span class="chibi-orbit__hint">{{
          inspect ? 'drag to spin · wheel to zoom' : $t('chibi.hint')
        }}</span>
      </div>

      <div class="chibi-chars" @pointerdown.stop>
        <SearchSelect
          :model-value="charId"
          :options="charOptions"
          align="right"
          aria-label="Character"
          @update:model-value="(v) => v !== null && (charId = v)"
        />
      </div>

      <Chibi3dPet
        :key="charId"
        ref="pet"
        :char-id="charId"
        :size="PET_SIZE"
        v-model:zoom="zoom"
        :orbit="inspect"
        :inspect="inspect"
      />

      <div class="chibi-debug" @pointerdown.stop>
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
  </div>
</template>

<style scoped>
.chibi-page {
  position: relative;
}

/* Light fan-use notice pinned bottom-right, above whichever stage is mounted. */
.chibi-legal {
  position: fixed;
  z-index: 10;
  right: 12px;
  bottom: 10px;
  max-width: 60vw;
  padding: 3px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--background-primary) 70%, transparent);
  color: var(--text-secondary);
  font-size: 0.68rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: help;
  user-select: none;
}

/* Pet vs furniture-interaction mode, floating above whichever stage is mounted. */
.chibi-mode {
  position: fixed;
  z-index: 10;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
}

/* Segmented control (two named modes) — the raised active segment marks the current stage. */
.chibi-seg {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
}

.chibi-seg__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chibi-seg__btn:hover {
  color: var(--accent-color);
}

.chibi-seg__btn--active {
  background: var(--background-primary);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
}

/* Inline glyph paired with a control label for at-a-glance recognition. */
.chibi-ico {
  width: 15px;
  height: 15px;
  flex: none;
}

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

/* View cluster stacks in three levels: Inspect toggle, then size slider, then the controls hint. */
.chibi-orbit {
  position: absolute;
  z-index: 2;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
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
