<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useDeckBuilder } from '@/consumables/hooks/useDeckBuilder';
import { useDragReorder } from '@/composables/useDragReorder';
import StudentCard from '@/components/display/StudentCard.vue';
import type { StudentProps } from '@/types/student';
import { domToPng } from 'modern-screenshot';
import { $t } from '@/locales';
import { studentDataStore, studentDataVersion } from '@/consumables/stores/studentStore';

const props = defineProps<{
  students: StudentProps[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const { decks, initDecks, setUnit, moveUnit, swapUnits, addTeam, removeTeam, renameDeck, copyTeamToPreset, reorderTeam } = useDeckBuilder();
onMounted(() => initDecks());

const activeTab = ref(1);
const pickerSlot = ref<{ tIdx: number; slotIdx: number } | null>(null);
const pickerFilter = ref('');

const PRESET_LABELS = ['I', 'II', 'III', 'IV', 'V'];

const activeDeck = computed(() => decks.value.find(d => d.id === activeTab.value));

// Track which specific slot is the "assist" (second occurrence of a student across the preset)
const assistSlots = computed<Set<string>>(() => {
  const seen = new Set<number>();
  const slots = new Set<string>();
  for (const [ti, team] of (activeDeck.value?.teams ?? []).entries()) {
    for (const [si, id] of team.units.entries()) {
      if (id === null) continue;
      if (seen.has(id)) slots.add(`${ti}-${si}`);
      else seen.add(id);
    }
  }
  return slots;
});

function isAssistSlot(tIdx: number, slotIdx: number): boolean {
  return assistSlots.value.has(`${tIdx}-${slotIdx}`);
}

function canPick(studentId: number): boolean {
  if (!pickerSlot.value) return false;
  const { tIdx, slotIdx } = pickerSlot.value;
  const deck = decks.value.find(d => d.id === activeTab.value);
  if (!deck) return false;

  let occurrences = 0;
  for (const [ti, team] of deck.teams.entries()) {
    for (const [si, id] of team.units.entries()) {
      if (id === studentId && !(ti === tIdx && si === slotIdx)) occurrences++;
    }
  }

  if (occurrences === 0) return true;
  if (occurrences === 1 && assistSlots.value.size === 0) return true;
  return false;
}

const pickerStudents = computed(() => {
  if (!pickerSlot.value) return [];
  // Access version to ensure reactivity when ownership changes
  void studentDataVersion.value;
  const squadType = pickerSlot.value.slotIdx < 4 ? 'Main' : 'Support';
  const filter = pickerFilter.value.toLowerCase();
  return props.students
    .filter(s => s.SquadType === squadType)
    .filter(s => studentDataStore.value[s.Id]?.isOwned !== false) // exclude unowned
    .filter(s => canPick(s.Id))
    .filter(s => filter === '' || s.Name.toLowerCase().includes(filter));
});

function openPicker(tIdx: number, slotIdx: number) {
  if (pickerSlot.value?.tIdx === tIdx && pickerSlot.value?.slotIdx === slotIdx) {
    pickerSlot.value = null;
  } else {
    pickerSlot.value = { tIdx, slotIdx };
    pickerFilter.value = '';
  }
}

function handlePickerSelect(payload: { student: StudentProps; originRect: unknown }) {
  if (!pickerSlot.value) return;
  setUnit(activeTab.value, pickerSlot.value.tIdx, pickerSlot.value.slotIdx, payload.student.Id);
  pickerSlot.value = null;
}

function clearSlotIn(tIdx: number, slotIdx: number) {
  setUnit(activeTab.value, tIdx, slotIdx, null);
  if (pickerSlot.value?.tIdx === tIdx && pickerSlot.value?.slotIdx === slotIdx) {
    pickerSlot.value = null;
  }
}

function switchTab(id: number) {
  activeTab.value = id;
  pickerSlot.value = null;
  copyMenuTeam.value = null;
}

function handleAddTeam() {
  if (!activeDeck.value) return;
  addTeam(activeTab.value);
  pickerSlot.value = null;
}

function handleRemoveTeam(tIdx: number) {
  if (!activeDeck.value || activeDeck.value.teams.length <= 1) return;
  removeTeam(activeTab.value, tIdx);
  pickerSlot.value = null;
  copyMenuTeam.value = null;
}

function handleRename(event: Event) {
  const value = (event.target as HTMLInputElement).value.trim();
  if (value) renameDeck(activeTab.value, value);
}

function getStudentById(id: number | null): StudentProps | undefined {
  if (id === null) return undefined;
  return props.students.find(s => s.Id === id);
}

function closeIfBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) emit('close');
}

const teamsAreaRef = ref<HTMLElement | null>(null);
const isExporting = ref(false);

async function imgToDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src, { mode: 'cors', credentials: 'omit', cache: 'reload' });
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function exportDeckImage() {
  if (!teamsAreaRef.value || isExporting.value) return;
  isExporting.value = true;
  try {
    const el = teamsAreaRef.value;

    // Expand to full scroll height so nothing gets cut off
    const prevOverflow = el.style.overflow;
    const prevHeight = el.style.height;
    const prevMaxHeight = el.style.maxHeight;
    el.style.overflow = 'visible';
    el.style.height = el.scrollHeight + 'px';
    el.style.maxHeight = 'none';

    // Pre-fetch cross-origin images as data URLs so modern-screenshot can embed them
    const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
    const origSrcs = new Map<HTMLImageElement, string>();
    await Promise.all(imgs.map(async img => {
      const dataUrl = await imgToDataUrl(img.src);
      if (dataUrl) {
        origSrcs.set(img, img.src);
        img.src = dataUrl;
      }
    }));

    await new Promise(r => requestAnimationFrame(r));

    const dataUrl = await domToPng(el, {
      scale: 2,
      backgroundColor: '#0d1117',
    });

    // Restore original srcs and dimensions
    for (const [img, src] of origSrcs) img.src = src;
    el.style.overflow = prevOverflow;
    el.style.height = prevHeight;
    el.style.maxHeight = prevMaxHeight;

    const blob = await fetch(dataUrl).then(r => r.blob());
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } finally {
    isExporting.value = false;
  }
}

// Slot drag-drop — key format: "${tIdx}-${slotIdx}"
const { onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, isDragging, isDropTarget, isRejected } =
  useDragReorder<string>(
    (from, to) => {
      const [ft, fs] = from.split('-').map(Number);
      const [tt, ts] = to.split('-').map(Number);
      if (ft === tt) {
        moveUnit(activeTab.value, ft, fs, ts);
      } else {
        swapUnits(activeTab.value, ft, fs, tt, ts);
      }
    },
    (from, to) => {
      const [, fs] = from.split('-').map(Number);
      const [, ts] = to.split('-').map(Number);
      return (fs < 4) === (ts < 4);
    },
  );

// Team drag-to-reorder — uses dataTransfer type tag to avoid interfering with slot drags
const teamDragFrom = ref<number | null>(null);
const teamDragOver = ref<number | null>(null);

function onTeamDragStart(tIdx: number, event: DragEvent) {
  teamDragFrom.value = tIdx;
  event.dataTransfer!.setData('text/x-team-idx', String(tIdx));
  event.dataTransfer!.effectAllowed = 'move';
}

function onTeamDragOver(tIdx: number, event: DragEvent) {
  if (!event.dataTransfer!.types.includes('text/x-team-idx')) return;
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';
  teamDragOver.value = tIdx;
}

function onTeamDragLeave(tIdx: number) {
  if (teamDragOver.value === tIdx) teamDragOver.value = null;
}

function onTeamDrop(tIdx: number, event: DragEvent) {
  if (!event.dataTransfer!.types.includes('text/x-team-idx')) return;
  const from = teamDragFrom.value;
  if (from !== null && from !== tIdx) reorderTeam(activeTab.value, from, tIdx);
  teamDragFrom.value = null;
  teamDragOver.value = null;
}

function onTeamDragEnd() {
  teamDragFrom.value = null;
  teamDragOver.value = null;
}

function isTeamDragging(tIdx: number) { return teamDragFrom.value === tIdx; }
function isTeamDropTarget(tIdx: number) {
  return teamDragOver.value === tIdx && teamDragFrom.value !== null && teamDragFrom.value !== tIdx;
}

// Copy team to another preset
const copyMenuTeam = ref<number | null>(null);
const copyToastMsg = ref('');
let copyToastTimer: ReturnType<typeof setTimeout> | null = null;

function handleCopyTeam(tIdx: number, targetDeckId: number) {
  copyTeamToPreset(activeTab.value, tIdx, targetDeckId);
  copyMenuTeam.value = null;
  if (copyToastTimer !== null) clearTimeout(copyToastTimer);
  copyToastMsg.value = `${$t('deckBuilder.copiedTo')} ${PRESET_LABELS[targetDeckId - 1]}`;
  copyToastTimer = setTimeout(() => { copyToastMsg.value = ''; }, 1500);
}
</script>

<template>
  <div class="deck-backdrop" @click="closeIfBackdrop">
    <div class="deck-modal">

      <!-- Header (includes preset tabs) -->
      <div class="deck-header">
        <h2 class="deck-title">{{ $t('deckBuilder.title') }}</h2>
        <div class="header-right">
          <div class="preset-tabs">
            <button
              v-for="(label, i) in PRESET_LABELS"
              :key="i"
              class="preset-tab"
              :class="{ active: activeTab === i + 1 }"
              type="button"
              @click="switchTab(i + 1)"
            >
              {{ label }}
            </button>
          </div>
          <button class="deck-close-btn" type="button" @click="emit('close')" :aria-label="$t('close')">
            ×
          </button>
        </div>
      </div>

      <!-- Deck name -->
      <div class="deck-name-row">
        <input
          class="deck-name-input"
          type="text"
          :value="activeDeck?.name ?? ''"
          @change="handleRename"
          :placeholder="$t('deckBuilder.presetName')"
          maxlength="40"
        />
      </div>

      <!-- Teams area (scrollable) -->
      <div class="teams-area" ref="teamsAreaRef">
        <!-- dismiss copy menu when clicking outside -->
        <div v-if="copyMenuTeam !== null" class="menu-dismiss" @click="copyMenuTeam = null" />

        <div
          v-for="(team, tIdx) in activeDeck?.teams ?? []"
          :key="tIdx"
          class="team-block"
          :class="{
            'is-team-dragging': isTeamDragging(tIdx),
            'is-team-drop-target': isTeamDropTarget(tIdx),
          }"
          @dragover="onTeamDragOver(tIdx, $event)"
          @dragleave="onTeamDragLeave(tIdx)"
          @drop="onTeamDrop(tIdx, $event)"
          @dragend="onTeamDragEnd"
        >
          <button
            class="team-remove-btn"
            type="button"
            @click="handleRemoveTeam(tIdx)"
            :disabled="(activeDeck?.teams.length ?? 1) <= 1"
            :aria-label="$t('deckBuilder.removeTeam')"
          >×</button>

          <button
            class="team-copy-btn"
            type="button"
            @click.stop="copyMenuTeam = copyMenuTeam === tIdx ? null : tIdx"
            :aria-label="$t('deckBuilder.copyTeamToPreset')"
          >⧉</button>

          <div v-if="copyMenuTeam === tIdx" class="copy-menu" @click.stop>
            <template v-for="(label, i) in PRESET_LABELS" :key="i">
              <button
                v-if="i + 1 !== activeTab"
                class="copy-menu-item"
                type="button"
                @click="handleCopyTeam(tIdx, i + 1)"
              >→ {{ label }}</button>
            </template>
          </div>

          <button
            class="team-drag-handle"
            type="button"
            draggable="true"
            @dragstart="onTeamDragStart(tIdx, $event)"
            @dragend="onTeamDragEnd"
            :aria-label="$t('deckBuilder.dragToReorder')"
          >⠿</button>

          <!-- Slot groups: tinted background identifies striker vs special -->
          <div class="team-rows">

            <!-- Striker slots (0–3) -->
            <div class="slots-group striker-slots">
              <div
                v-for="idx in [0, 1, 2, 3]"
                :key="idx"
                class="slot-wrapper"
                :class="{ 'slot-selected': pickerSlot?.tIdx === tIdx && pickerSlot?.slotIdx === idx }"
                :draggable="team.units[idx] !== null"
                @dragstart="team.units[idx] !== null && onDragStart(`${tIdx}-${idx}`, $event)"
                @dragover="onDragOver(`${tIdx}-${idx}`, $event)"
                @dragleave="onDragLeave(`${tIdx}-${idx}`)"
                @drop="onDrop(`${tIdx}-${idx}`)"
                @dragend="onDragEnd"
              >
                <template v-if="getStudentById(team.units[idx])">
                  <div
                    class="slot-card-inner"
                    :class="{
                      'is-dragging': isDragging(`${tIdx}-${idx}`),
                      'is-drop-target': isDropTarget(`${tIdx}-${idx}`),
                      'is-rejected': isRejected(`${tIdx}-${idx}`),
                      'is-assist': isAssistSlot(tIdx, idx)
                    }"
                  >
                    <StudentCard
                      :student="getStudentById(team.units[idx])!"
                      @click="() => openPicker(tIdx, idx)"
                    />
                    <span v-if="isAssistSlot(tIdx, idx)" class="assist-badge">A</span>
                    <button class="slot-clear-btn" type="button" @click.stop="clearSlotIn(tIdx, idx)" :aria-label="$t('deckBuilder.removeStudent')">×</button>
                  </div>
                </template>
                <template v-else>
                  <div
                    class="slot-empty"
                    :class="{
                      'is-drop-target': isDropTarget(`${tIdx}-${idx}`),
                      'is-rejected': isRejected(`${tIdx}-${idx}`)
                    }"
                    @click="openPicker(tIdx, idx)"
                  >
                    <span class="slot-empty-icon">+</span>
                  </div>
                </template>
              </div>
            </div>

            <!-- Special slots (4–5) -->
            <div class="slots-group special-slots">
              <div
                v-for="idx in [4, 5]"
                :key="idx"
                class="slot-wrapper"
                :class="{ 'slot-selected': pickerSlot?.tIdx === tIdx && pickerSlot?.slotIdx === idx }"
                :draggable="team.units[idx] !== null"
                @dragstart="team.units[idx] !== null && onDragStart(`${tIdx}-${idx}`, $event)"
                @dragover="onDragOver(`${tIdx}-${idx}`, $event)"
                @dragleave="onDragLeave(`${tIdx}-${idx}`)"
                @drop="onDrop(`${tIdx}-${idx}`)"
                @dragend="onDragEnd"
              >
                <template v-if="getStudentById(team.units[idx])">
                  <div
                    class="slot-card-inner"
                    :class="{
                      'is-dragging': isDragging(`${tIdx}-${idx}`),
                      'is-drop-target': isDropTarget(`${tIdx}-${idx}`),
                      'is-rejected': isRejected(`${tIdx}-${idx}`),
                      'is-assist': isAssistSlot(tIdx, idx)
                    }"
                  >
                    <StudentCard
                      :student="getStudentById(team.units[idx])!"
                      @click="() => openPicker(tIdx, idx)"
                    />
                    <span v-if="isAssistSlot(tIdx, idx)" class="assist-badge">A</span>
                    <button class="slot-clear-btn" type="button" @click.stop="clearSlotIn(tIdx, idx)" :aria-label="$t('deckBuilder.removeStudent')">×</button>
                  </div>
                </template>
                <template v-else>
                  <div
                    class="slot-empty"
                    :class="{
                      'is-drop-target': isDropTarget(`${tIdx}-${idx}`),
                      'is-rejected': isRejected(`${tIdx}-${idx}`)
                    }"
                    @click="openPicker(tIdx, idx)"
                  >
                    <span class="slot-empty-icon">+</span>
                  </div>
                </template>
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- Footer: add team + export (outside teamsAreaRef so it's excluded from export) -->
      <div class="teams-footer">
        <button class="add-team-btn" type="button" @click="handleAddTeam">
          {{ $t('deckBuilder.addTeam') }}
        </button>
        <button class="export-btn" type="button" @click="exportDeckImage" :disabled="isExporting">
          {{ isExporting ? $t('deckBuilder.exporting') : $t('deckBuilder.exportImage') }}
        </button>
        <span v-if="copyToastMsg" class="copy-toast">{{ copyToastMsg }}</span>
      </div>

      <!-- Picker section -->
      <div class="picker-section" v-if="pickerSlot !== null">
        <div class="picker-header">
          <span class="picker-role-label">
            {{ pickerSlot.slotIdx < 4 ? $t('deckBuilder.selectStriker') : $t('deckBuilder.selectSpecial') }}
          </span>
          <input
            class="picker-filter"
            type="text"
            v-model="pickerFilter"
            :placeholder="$t('deckBuilder.filterByName')"
            autofocus
          />
          <button class="picker-close-btn" type="button" @click="pickerSlot = null" :aria-label="$t('close')">×</button>
        </div>
        <div v-if="assistSlots.size >= 1" class="assist-limit-banner">
          {{ $t('deckBuilder.assistLimitReached') }}
        </div>
        <div class="picker-grid">
          <StudentCard
            v-for="student in pickerStudents"
            :key="student.Id"
            :student="student"
            @click="handlePickerSelect"
          />
          <div v-if="pickerStudents.length === 0" class="picker-empty">
            {{ $t('deckBuilder.noStudentsAvailable') }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.deck-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.deck-modal {
  background: var(--background-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  width: min(1024px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

/* Header — title left, preset tabs + close button right */
.deck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.deck-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
  flex-shrink: 0;
}

.deck-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.deck-close-btn:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
}

/* Preset tabs — inline in header-right */
.preset-tabs {
  display: flex;
  gap: 4px;
}

.preset-tab {
  padding: 5px 14px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--text-primary) 5%, var(--background-primary));
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.preset-tab:hover:not(.active) {
  background: color-mix(in srgb, var(--text-primary) 10%, var(--background-primary));
  color: var(--text-primary);
}

.preset-tab.active {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

/* Deck name */
.deck-name-row {
  padding: 10px 20px 8px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color);
}

.deck-name-input {
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--text-primary) 5%, var(--background-primary));
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 600;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.deck-name-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

/* Teams area */
.teams-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.teams-area:hover {
  scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
}
.teams-area::-webkit-scrollbar { width: 4px; }
.teams-area::-webkit-scrollbar-track { background: transparent; }
.teams-area::-webkit-scrollbar-thumb { background: transparent; border-radius: 2px; }
.teams-area:hover::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.4); }

.team-block {
  display: flex;
  flex-direction: column;
  position: relative;
  gap: 8px;
}

.team-remove-btn {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 22px;
  height: 22px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transition: color 0.15s, border-color 0.15s, opacity 0.15s;
  z-index: 5;
}

.team-block:hover .team-remove-btn:not(:disabled) {
  opacity: 1;
  pointer-events: auto;
}

.team-remove-btn:hover:not(:disabled) {
  color: #e06c75;
  border-color: #e06c75;
}

.team-copy-btn {
  position: absolute;
  top: 30px;
  left: 4px;
  width: 22px;
  height: 22px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transition: color 0.15s, border-color 0.15s, opacity 0.15s;
  z-index: 5;
}

.team-block:hover .team-copy-btn {
  opacity: 1;
  pointer-events: auto;
}

.team-copy-btn:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.copy-menu {
  position: absolute;
  top: 30px;
  left: 30px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  z-index: 20;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  min-width: 80px;
}

.copy-menu-item {
  padding: 6px 14px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.copy-menu-item:hover {
  background: color-mix(in srgb, var(--text-primary) 8%, var(--background-primary));
}

.menu-dismiss {
  position: fixed;
  inset: 0;
  z-index: 15;
}

.team-drag-handle {
  position: absolute;
  top: 56px;
  left: 4px;
  width: 22px;
  height: 22px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: grab;
  border-radius: 4px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transition: color 0.15s, border-color 0.15s, opacity 0.15s;
  z-index: 5;
  user-select: none;
}

.team-block:hover .team-drag-handle {
  opacity: 1;
  pointer-events: auto;
}

.team-drag-handle:hover {
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.team-drag-handle:active {
  cursor: grabbing;
}

.team-block.is-team-dragging {
  opacity: 0.5;
}

.team-block.is-team-drop-target {
  outline: 2px solid var(--accent-color);
  border-radius: 8px;
}

/* Two slot groups (striker + special) in one row; stack at < 1024px */
.team-rows {
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.slots-group {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 6px 8px;
  border-radius: 8px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.slots-group:hover {
  scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
}
.slots-group::-webkit-scrollbar { height: 4px; }
.slots-group::-webkit-scrollbar-track { background: transparent; }
.slots-group::-webkit-scrollbar-thumb { background: transparent; border-radius: 2px; }
.slots-group:hover::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.4); }

.striker-slots {
  background: color-mix(in srgb, #e06c75 80%, var(--background-primary));
}

.special-slots {
  background: color-mix(in srgb, #61afef 80%, var(--background-primary));
}

@media (max-width: 1023px) {
  .team-rows {
    flex-direction: column;
    gap: 12px;
  }
}

/* Slot wrapper */
.slot-wrapper {
  flex-shrink: 0;
  position: relative;
}

.slot-wrapper.slot-selected .slot-empty,
.slot-wrapper.slot-selected .slot-card-inner {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
  border-radius: 8px;
}

.slot-card-inner {
  position: relative;
  border-radius: 8px;
  transition: opacity 0.15s;
}

.slot-card-inner.is-dragging {
  opacity: 0.5;
}

.slot-card-inner.is-drop-target {
  box-shadow: 0 0 0 2px var(--accent-color);
  border-radius: 8px;
}

@keyframes shake-slot {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.slot-card-inner.is-rejected {
  animation: shake-slot 0.35s ease;
  outline: 2px solid #e06c75;
  border-radius: 8px;
}

.slot-empty.is-rejected {
  animation: shake-slot 0.35s ease;
  border-color: #e06c75;
}

/* Hide pin icon everywhere inside the deck modal (slots + picker) */
.deck-modal :deep(.pin-icon) {
  display: none;
}

/* Hide student name label in deck builder */
.deck-modal :deep(.card-label) {
  display: none;
}

/* Restore rounded bottom corners — card-img is now the last visible child */
.deck-modal :deep(.card-img) {
  border-radius: 0 0 8px 8px;
}

/* No scale transform on slot cards */
.slots-group :deep(.selection-grid-card):hover,
.slots-group :deep(.selection-grid-card):active {
  transform: none;
}

/* Assist cards: portrait + badge only — hide entire stats overlay */
.slot-card-inner.is-assist :deep(.stats-overlay) {
  display: none;
}

/* Empty slot — match StudentCard image height (label hidden): 150px × 170px */
.slot-empty {
  width: 150px;
  height: 170px;
  border-radius: 8px;
  border: 2px dashed var(--border-color);
  background: color-mix(in srgb, var(--text-primary) 3%, var(--background-primary));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s;
}

.slot-empty:hover {
  border-color: var(--accent-color);
}

.slot-empty.is-drop-target {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 8%, var(--background-primary));
}

.slot-empty-icon {
  font-size: 2rem;
  color: var(--text-secondary);
  opacity: 0.35;
}

/* Assist badge */
.assist-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: #1a8cff;
  color: black;
  font-size: 0.85rem;
  font-weight: 700;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

/* Clear button */
.slot-clear-btn {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 10;
  line-height: 1;
}

.slot-card-inner:hover .slot-clear-btn {
  opacity: 1;
}

/* Footer: add team + export */
.teams-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px 12px;
  flex-shrink: 0;
  border-top: 1px solid var(--border-color);
}

.add-team-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  transition: border-color 0.15s, color 0.15s;
}

.add-team-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.export-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid var(--accent-color);
  background: transparent;
  color: var(--accent-color);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
}

.export-btn:hover:not(:disabled) {
  background: var(--accent-color);
  color: white;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.copy-toast {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-left: 4px;
}

/* Picker */
.picker-section {
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 300px;
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px 8px;
  flex-shrink: 0;
}

.picker-role-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.picker-filter {
  flex: 1;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--text-primary) 5%, var(--background-primary));
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.15s;
}

.picker-filter:focus {
  outline: none;
  border-color: var(--accent-color);
}

.picker-close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.2rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
}

.picker-close-btn:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
}

.assist-limit-banner {
  margin: 0 20px 6px;
  padding: 6px 12px;
  background: color-mix(in srgb, #1a8cff 15%, var(--background-primary));
  border: 1px solid color-mix(in srgb, #1a8cff 40%, transparent);
  border-radius: 6px;
  color: #6ab0f5;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 4px 20px 12px;
  overflow-y: auto;
  flex: 1;
}

.picker-empty {
  width: 100%;
  text-align: center;
  color: var(--text-secondary);
  padding: 24px 0;
  font-size: 0.9rem;
}
</style>
