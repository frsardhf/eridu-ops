<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue';
import { $t } from '@/locales';
import Chibi3dPet from '@/components/chibi/Chibi3dPet.vue';
import { CHIBI_VOICE_LINES } from '@/composables/useChibiVoice';
import { useStudentData } from '@/lib/hooks/useStudentData';

// Dev surface for the live-3D chibi (Road 2). Mirrors /chibi but renders the GLB
// in three.js instead of stepping sprite sheets. Not linked from nav.

// Chibi assets we ship (public/chibi3d/<id>). Name + role come from the IndexedDB student
// store (matched by DevName), not hardcoded — SchaleDB is only fetched via the R2 voice.
const CHIBI_CHAR_IDS = ['ch0158', 'ch0242', 'ch0243', 'ch0331', 'ch0333'] as const;
const charId = ref<string>(CHIBI_CHAR_IDS[0]);

const { studentData } = useStudentData();
const studentByDevName = computed(() => {
  const map = new Map<string, { Name: string; SquadType: string }>();
  for (const s of Object.values(studentData.value)) {
    if (s.DevName) map.set(s.DevName.toUpperCase(), { Name: s.Name, SquadType: s.SquadType });
  }
  return map;
});
const CHARS = computed(() =>
  CHIBI_CHAR_IDS.map((id) => {
    const s = studentByDevName.value.get(id.toUpperCase());
    if (!s) return { id, label: id }; // store not loaded yet → fall back to the id
    const role = s.SquadType === 'Support' ? 'special' : 'striker'; // Main = striker
    return { id, label: `${s.Name} · ${role}` };
  }),
);

// Live-tunable apparent size (camera dolly). armedSpeedMult stays baked at the component
// default (1.70) now that it's calibrated; this slider was repurposed for sizing.
const zoom = ref(1.0);

// Inspection orbit mode: drag spins the camera; pet walking/pickup suspend while on.
const orbit = ref(false);

const pet = useTemplateRef<InstanceType<typeof Chibi3dPet>>('pet');

// Debug holds: clips that no-op on units that lack them (e.g. Move_* on the special).
const DEBUG_CLIPS = [
  { label: $t('chibi.idle'), clip: 'Cafe_Idle' },
  { label: 'Cafe Walk', clip: 'Cafe_Walk' },
  { label: 'Form Idle', clip: 'Formation_Idle' },
  { label: 'Form Rnd', clip: 'Formation_Idle_Random' },
  { label: 'Move', clip: 'Move_Ing' },
  { label: 'Jump', clip: 'Move_Jump' },
] as const;

function onStagePointerDown(e: PointerEvent): void {
  if (orbit.value) return; // no walk-to-click while inspecting
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  pet.value?.walkTo(e.clientX - rect.left, e.clientY - rect.top);
}
</script>

<template>
  <div class="chibi-stage" :class="{ 'chibi-stage--orbit': orbit }" @pointerdown="onStagePointerDown">
    <div class="chibi-orbit" @pointerdown.stop>
      <button
        type="button"
        class="chibi-debug__btn"
        :class="{ 'chibi-debug__btn--active': orbit }"
        @click="orbit = !orbit"
      >Orbit: {{ orbit ? 'On' : 'Off' }}</button>
      <span class="chibi-orbit__hint">{{ orbit ? 'drag to spin · wheel to zoom' : $t('chibi.hint') }}</span>
    </div>

    <div class="chibi-chars" @pointerdown.stop>
      <button
        v-for="c in CHARS"
        :key="c.id"
        type="button"
        class="chibi-debug__btn"
        :class="{ 'chibi-debug__btn--active': c.id === charId }"
        @click="charId = c.id"
      >{{ c.label }}</button>
      <label class="chibi-slider">
        Size ×{{ zoom.toFixed(2) }}
        <input v-model.number="zoom" type="range" min="1" max="1.5" step="0.05" />
      </label>
    </div>

    <Chibi3dPet
      :key="charId"
      ref="pet"
      :char-id="charId"
      :size="540"
      :zoom="zoom"
      :orbit="orbit"
    />

    <div class="chibi-debug" @pointerdown.stop>
      <button
        v-for="d in DEBUG_CLIPS"
        :key="d.clip"
        type="button"
        class="chibi-debug__btn"
        @click="pet?.playClip(d.clip)"
      >{{ d.label }}</button>
    </div>

    <div class="chibi-voice" @pointerdown.stop>
      <div class="chibi-voice__title">Voice ({{ charId }})</div>
      <div v-for="line in CHIBI_VOICE_LINES" :key="line" class="chibi-voice__row">
        <span class="chibi-voice__dot" :class="`is-${pet?.voiceStatus?.[line] ?? 'loading'}`"></span>
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
  background:
    radial-gradient(circle at 50% 30%, var(--background-secondary), var(--background-primary));
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

.chibi-orbit {
  position: absolute;
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
  top: 16px;
  right: 16px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  max-width: 360px;
  padding: 8px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.chibi-debug {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(3, 88px);
  gap: 6px;
  padding: 10px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
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

.chibi-debug__btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}
</style>
