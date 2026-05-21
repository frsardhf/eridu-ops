<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStudentData } from '@/lib/hooks/useStudentData';
import { useBondsTracked } from '@/lib/hooks/useBondsTracked';
import { getSettings, updateSetting } from '@/lib/utils/settingsStorage';
import { studentDataStore } from '@/lib/stores/studentStore';
import GlobalNavbar from '@/components/navbar/GlobalNavbar.vue';
import StudentStrip from '@/components/shared/StudentStrip.vue';
import BondsStudentEditor from '@/components/bonds/BondsStudentEditor.vue';
import BondsStudentPicker from '@/components/bonds/BondsStudentPicker.vue';
import { computeStudentBondExpTotal } from '@/lib/utils/bondExpUtils';
import { enrichStudentWithGifts } from '@/lib/utils/studentDataHydrationUtils';
import { $t } from '@/locales';
import type { StudentProps } from '@/types/student';

const route = useRoute();
const router = useRouter();
const { studentData, favoredGift, giftBoxData, isReady } = useStudentData();
const { trackedIds, removeStudent, seedIfNeeded } = useBondsTracked();

// ── Layout (tabs/cards) ─────────────────────────────────────────────────────
const layout = ref<'tabs' | 'cards'>(getSettings().bondsLayout);
watch(layout, (v) => updateSetting('bondsLayout', v));

// ── Picker modal ────────────────────────────────────────────────────────────
const showPicker = ref(false);

// ── Per-student "collapsed" state (not persisted; session-only) ─────────────
// Independent of `bondsTrackedStudents` — hides the editor body but leaves
// the student in the tracked list. Same behaviour across cards/tabs views.
const collapsedIds = ref<Set<number>>(new Set());

function isCollapsed(id: number): boolean {
  return collapsedIds.value.has(id);
}

function toggleCollapsed(id: number): void {
  const next = new Set(collapsedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  collapsedIds.value = next;
}

// Sort: total bond EXP descending (most planned first), tie-break by Name asc.
// EXP comes from `computeStudentBondExpTotal` so new EXP contributors only need
// to be added in that utility — sort updates automatically.
const trackedStudents = computed<StudentProps[]>(() => {
  const enriched = trackedIds.value
    .map(id => studentData.value[id])
    .filter((s): s is StudentProps => !!s && studentDataStore.value[s.Id]?.isOwned !== false)
    .map(s => enrichStudentWithGifts(s, favoredGift.value, giftBoxData.value));

  return enriched
    .map(s => {
      const form = studentDataStore.value[s.Id];
      const exp = computeStudentBondExpTotal({
        favoredGifts: s.Gifts,
        giftBoxes: s.Boxes,
        giftFormData: form?.giftFormData,
        boxFormData: form?.boxFormData,
      });
      return { student: s, exp };
    })
    .sort((a, b) => {
      if (a.exp !== b.exp) return b.exp - a.exp;
      return (a.student.Name ?? '').localeCompare(b.student.Name ?? '');
    })
    .map(x => x.student);
});

// ── Active tab (tabs layout) ────────────────────────────────────────────────
const activeStudentId = ref<number | null>(null);

const activeStudent = computed<StudentProps | null>(() => {
  if (layout.value !== 'tabs') return null;
  const list = trackedStudents.value;
  if (!list.length) return null;
  const found = activeStudentId.value
    ? list.find(s => s.Id === activeStudentId.value)
    : null;
  return found ?? list[0];
});

watch(trackedStudents, (list) => {
  if (!list.length) {
    activeStudentId.value = null;
    return;
  }
  if (!activeStudentId.value || !list.some(s => s.Id === activeStudentId.value)) {
    activeStudentId.value = list[0].Id;
  }
});

// ── Deep-link support: /bonds?focus=<id> ────────────────────────────────────
onMounted(async () => {
  if (!isReady.value) {
    await new Promise<void>(resolve => {
      const stop = watch(isReady, (v) => {
        if (v) {
          stop();
          resolve();
        }
      });
    });
  }

  seedIfNeeded();

  const focusParam = route.query.focus;
  const focusId = typeof focusParam === 'string' ? parseInt(focusParam, 10) : NaN;
  if (Number.isFinite(focusId) && trackedIds.value.includes(focusId)) {
    activeStudentId.value = focusId;
    if (layout.value === 'cards') {
      // Wait for Vue to render the card slot, then give the browser a beat to
      // settle async reflows (NEXON font swap inside MetaHeader, lazy gift
      // icons inside the cards row). A smooth-scroll animation locks in to
      // the position at the moment it starts; if cards above the target
      // grow mid-animation, the viewport lands above the actual target
      // (looks like "scrolled to the previous student"). Instant scroll
      // after the settle delay sidesteps that race entirely.
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));
      const el = document.getElementById(`bonds-card-${focusId}`);
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  } else if (trackedStudents.value.length) {
    activeStudentId.value = trackedStudents.value[0].Id;
  }

  if (focusParam !== undefined) {
    router.replace({ path: '/bonds', query: {} });
  }
});

function onSelectStudent(s: StudentProps) {
  activeStudentId.value = s.Id;
}

function onRemoveStudent(id: number) {
  removeStudent(id);
}
</script>

<template>
  <div class="bonds-page">
    <GlobalNavbar />

    <main class="bonds-body">
      <div class="bonds-toolbar">
        <button type="button" class="bonds-btn primary" @click="showPicker = true">
          + {{ $t('addStudent') }}
        </button>

        <div class="bonds-layout-toggle" role="tablist" aria-label="Layout">
          <button
            type="button"
            class="bonds-layout-btn"
            :class="{ active: layout === 'tabs' }"
            role="tab"
            :aria-selected="layout === 'tabs'"
            @click="layout = 'tabs'"
          >
            {{ $t('layoutTabs') }}
          </button>
          <button
            type="button"
            class="bonds-layout-btn"
            :class="{ active: layout === 'cards' }"
            role="tab"
            :aria-selected="layout === 'cards'"
            @click="layout = 'cards'"
          >
            {{ $t('layoutCards') }}
          </button>
        </div>
      </div>

      <div v-if="!trackedStudents.length" class="bonds-empty">
        <p>{{ $t('noTrackedStudents') }}</p>
        <button type="button" class="bonds-btn primary" @click="showPicker = true">
          + {{ $t('addStudent') }}
        </button>
      </div>

      <!-- Tabs layout: strip + single active student -->
      <template v-else-if="layout === 'tabs'">
        <StudentStrip
          class="bonds-strip"
          :students="trackedStudents"
          :active-student-id="activeStudent?.Id"
          @select-student="onSelectStudent"
        />

        <div v-if="activeStudent" :key="activeStudent.Id" class="bonds-active">
          <BondsStudentEditor
            :student="activeStudent"
            :collapsed="isCollapsed(activeStudent.Id)"
          />
          <div class="bonds-actions">
            <button
              type="button"
              class="bonds-btn ghost"
              @click="toggleCollapsed(activeStudent.Id)"
            >
              {{ isCollapsed(activeStudent.Id) ? $t('showEditor') : $t('hideEditor') }}
            </button>
            <button
              type="button"
              class="bonds-btn ghost"
              :title="$t('untrackTooltip')"
              @click="onRemoveStudent(activeStudent.Id)"
            >
              {{ $t('untrack') }}
            </button>
          </div>
        </div>
      </template>

      <!-- Cards layout: vertical list of editors -->
      <template v-else>
        <div class="bonds-cards">
          <div
            v-for="s in trackedStudents"
            :key="s.Id"
            :id="`bonds-card-${s.Id}`"
            class="bonds-card-slot"
          >
            <BondsStudentEditor :student="s" :collapsed="isCollapsed(s.Id)" />
            <div class="bonds-actions">
              <button
                type="button"
                class="bonds-btn ghost"
                @click="toggleCollapsed(s.Id)"
              >
                {{ isCollapsed(s.Id) ? $t('showEditor') : $t('hideEditor') }}
              </button>
              <button
                type="button"
                class="bonds-btn ghost"
                :title="$t('untrackTooltip')"
                @click="onRemoveStudent(s.Id)"
              >
                {{ $t('untrack') }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </main>

    <BondsStudentPicker v-if="showPicker" @close="showPicker = false" />
  </div>
</template>

<style scoped>
.bonds-page {
  position: fixed;
  inset: 0;
  background-color: var(--background-primary);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bonds-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.bonds-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.bonds-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;
}

.bonds-btn.primary {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.bonds-btn.primary:hover {
  background-color: color-mix(in srgb, var(--accent-color) 12%, transparent);
}

.bonds-btn.ghost:hover {
  border-color: var(--color-negative);
  color: var(--color-negative);
}

.bonds-layout-toggle {
  display: inline-flex;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-left: auto;
}

.bonds-layout-btn {
  padding: 6px 14px;
  background: var(--background-primary);
  border: none;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.bonds-layout-btn.active {
  color: var(--accent-color);
  background-color: color-mix(in srgb, var(--accent-color) 12%, transparent);
}

.bonds-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 16px;
  text-align: center;
  color: var(--text-secondary);
}

.bonds-strip {
  margin-bottom: 12px;
}

/* StudentStrip ships with `border-top` only (for its modal-footer placement);
   on BondsPage we want it to read as a contained card, so override to a full
   border + rounded corners on both states (collapsed indicator + expanded). */
.bonds-strip :deep(.strip-indicator),
.bonds-strip :deep(.student-strip) {
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.bonds-active {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bonds-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.bonds-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bonds-card-slot {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
