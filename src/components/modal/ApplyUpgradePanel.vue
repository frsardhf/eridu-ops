<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { $t } from '@/locales';
import { SkillLevels, PotentialLevels, SectionId } from '@/types/upgrade';
import type { EquipmentLevels, GradeLevels, ExclusiveGearLevel } from '@/types/gear';
import { StudentProps } from '@/types/student';
import { useApplyUpgrade } from '@/composables/useApplyUpgrade';

const props = defineProps<{
  student: StudentProps;
  characterLevels: { current: number; target: number };
  skillLevels: SkillLevels;
  potentialLevels: PotentialLevels;
  equipmentLevels: EquipmentLevels;
  gradeLevels: GradeLevels;
  exclusiveGearLevel: ExclusiveGearLevel;
  hasSufficientMaterials: boolean;
  insufficientList: string[];
}>();

const emit = defineEmits<{
  (e: 'apply', selectedIds: SectionId[]): void;
  (e: 'close'): void;
}>();

const {
  pendingSkills, pendingPotentials, pendingEquipment,
  hasLevelPending, hasSkillsPending, hasPotentialPending,
  hasEquipmentPending, hasGradePending, hasExclusivePending,
  availableSections, GRADE_THRESHOLD,
} = useApplyUpgrade(props);

// ── Selection state ──────────────────────────────────────────────────────────
const selectedIds = ref<Set<SectionId>>(new Set());

// Auto-select all when panel first becomes visible (available sections change)
watch(availableSections, (sections) => {
  selectedIds.value = new Set(sections);
}, { immediate: true });

const allSelected = computed(() =>
  availableSections.value.length > 0 &&
  availableSections.value.every(id => selectedIds.value.has(id))
);

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(availableSections.value);
  }
}

function toggleSection(id: SectionId) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
}

// ── Apply ────────────────────────────────────────────────────────────────────
const canApply = computed(() =>
  selectedIds.value.size > 0 && props.hasSufficientMaterials
);

function handleApply() {
  if (!canApply.value) return;
  emit('apply', Array.from(selectedIds.value));
}
</script>

<template>
  <div class="apply-panel">

    <!-- Select All pill -->
    <div class="pill-item">
      <input
        id="pill-select-all"
        type="checkbox"
        :checked="allSelected"
        :indeterminate="!allSelected && selectedIds.size > 0"
        @change="toggleSelectAll"
      />
      <label
        for="pill-select-all"
        class="section-pill pill--select-all"
        :class="{ 'is-partial': !allSelected && selectedIds.size > 0 }"
      >
        <span class="pill-name">{{ $t('selectAll') }}</span>
      </label>
    </div>

    <div class="divider" />

    <p v-if="availableSections.length === 0" class="empty-msg">
      {{ $t('noPendingUpgrades') }}
    </p>

    <!-- Simple sections: Level / Grade / Exclusive in a row -->
    <div
      v-if="hasLevelPending || hasGradePending || hasExclusivePending"
      class="simple-pills-row"
    >
      <div v-if="hasLevelPending" class="pill-item">
        <input id="pill-level" type="checkbox" :checked="selectedIds.has('level')" @change="toggleSection('level')" />
        <label for="pill-level" class="section-pill pill--simple">
          <span class="pill-name">{{ $t('characterLevel') }}</span>
          <span class="pill-value">{{ characterLevels.current }}→{{ characterLevels.target }}</span>
        </label>
      </div>

      <div v-if="hasGradePending" class="pill-item">
        <input id="pill-grade" type="checkbox" :checked="selectedIds.has('grade')" @change="toggleSection('grade')" />
        <label for="pill-grade" class="section-pill pill--simple">
          <span class="pill-name">{{ $t('sort.grade') }}</span>
          <span class="pill-grade-value">
            <span class="grade-pip" :class="(gradeLevels.current ?? 1) <= GRADE_THRESHOLD ? 'gold' : 'blue'">
              {{ (gradeLevels.current ?? 1) <= GRADE_THRESHOLD
                  ? (gradeLevels.current ?? 1)
                  : (gradeLevels.current ?? 1) - GRADE_THRESHOLD }}★
            </span>
            <span class="grade-arrow">→</span>
            <span class="grade-pip" :class="(gradeLevels.target ?? 1) <= GRADE_THRESHOLD ? 'gold' : 'blue'">
              {{ (gradeLevels.target ?? 1) <= GRADE_THRESHOLD
                  ? (gradeLevels.target ?? 1)
                  : (gradeLevels.target ?? 1) - GRADE_THRESHOLD }}★
            </span>
          </span>
        </label>
      </div>

      <div v-if="hasExclusivePending" class="pill-item">
        <input id="pill-exclusive" type="checkbox" :checked="selectedIds.has('exclusive')" @change="toggleSection('exclusive')" />
        <label for="pill-exclusive" class="section-pill pill--simple">
          <span class="pill-name">{{ $t('exclusiveWeapon') }}</span>
          <span class="pill-value">UE {{ exclusiveGearLevel.current ?? 0 }}→{{ exclusiveGearLevel.target ?? 0 }}</span>
        </label>
      </div>
    </div>

    <!-- Skills -->
    <div v-if="hasSkillsPending" class="pill-item">
      <input id="pill-skills" type="checkbox" :checked="selectedIds.has('skills')" @change="toggleSection('skills')" />
      <label for="pill-skills" class="section-pill pill--complex">
        <span class="pill-name">{{ $t('skills') }}</span>
        <span class="pill-chips">
          <span v-for="s in pendingSkills" :key="s.type" class="pill-chip">
            <span class="chip-name">{{ s.label }}</span>
            <span class="chip-value">{{ s.current }}→{{ s.target }}</span>
          </span>
        </span>
      </label>
    </div>

    <!-- Potential -->
    <div v-if="hasPotentialPending" class="pill-item">
      <input id="pill-potential" type="checkbox" :checked="selectedIds.has('potential')" @change="toggleSection('potential')" />
      <label for="pill-potential" class="section-pill pill--complex">
        <span class="pill-name">{{ $t('talent') }}</span>
        <span class="pill-chips">
          <span v-for="p in pendingPotentials" :key="p.type" class="pill-chip">
            <span class="chip-name">{{ p.label }}</span>
            <span class="chip-value">{{ p.current }}→{{ p.target }}</span>
          </span>
        </span>
      </label>
    </div>

    <!-- Equipment -->
    <div v-if="hasEquipmentPending" class="pill-item">
      <input id="pill-equipment" type="checkbox" :checked="selectedIds.has('equipment')" @change="toggleSection('equipment')" />
      <label for="pill-equipment" class="section-pill pill--complex">
        <span class="pill-name">{{ $t('gears') }}</span>
        <span class="pill-chips">
          <span v-for="eq in pendingEquipment" :key="eq.type" class="pill-chip">
            <span class="chip-name">{{ eq.label }}</span>
            <span class="chip-value">{{ eq.current }}→{{ eq.target }}</span>
          </span>
        </span>
      </label>
    </div>

    <div v-if="!hasSufficientMaterials && insufficientList.length > 0" class="insufficient-warning">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span>{{ $t('notEnough') }}: {{ insufficientList.slice(0, 3).join(', ') }}{{ insufficientList.length > 3 ? ` +${insufficientList.length - 3}` : '' }}</span>
    </div>

    <div class="divider" />

    <div class="panel-actions">
      <button class="cancel-btn" type="button" @click="emit('close')">{{ $t('cancel') }}</button>
      <button class="apply-btn" type="button" :disabled="!canApply" @click="handleApply">
        {{ $t('apply') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Panel shell ── */
.apply-panel {
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
  padding: 6px 0;
  min-width: 340px;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  font-size: 0.82rem;
}

.divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

.empty-msg {
  padding: 6px 14px;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* ── Pill item wrapper ── */
.pill-item {
  position: relative;
  padding: 2px 8px;
}

.pill-item input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* ── Base pill (shared by all variants) ── */
.section-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  box-sizing: border-box;
}

.section-pill:hover {
  background: var(--background-secondary);
  color: var(--text-primary);
}

.pill-item input[type="checkbox"]:checked + .section-pill {
  border-color: var(--accent-color);
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
}

.pill-item input[type="checkbox"]:focus-visible + .section-pill {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
}

.pill-name {
  font-weight: 600;
  flex-shrink: 0;
  line-height: 1;
}

/* ── Select All pill ── */
.pill--select-all {
  border-color: transparent;
}

.pill--select-all .pill-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* Partial (indeterminate) state */
.pill--select-all.is-partial {
  border-color: color-mix(in srgb, var(--accent-color) 45%, var(--border-color));
  background: color-mix(in srgb, var(--accent-color) 6%, transparent);
  color: var(--text-primary);
}

/* ── Simple pills row (Level / Grade / Exclusive) ── */
.simple-pills-row {
  display: flex;
  gap: 4px;
  padding: 2px 8px;
}

.simple-pills-row .pill-item {
  flex: 1;
  min-width: 0;
  padding: 0;
}

.pill--simple {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  padding: 7px 6px;
  min-height: 58px;
  text-align: center;
}

.pill-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent-color);
  line-height: 1;
}

/* Grade pips inside simple pill */
.pill-grade-value {
  display: flex;
  align-items: center;
  gap: 2px;
}

.grade-pip {
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
  line-height: 1;
  text-shadow:
     0.6px  0px   0 var(--accent-color),
    -0.6px  0px   0 var(--accent-color),
     0px    0.6px 0 var(--accent-color),
     0px   -0.6px 0 var(--accent-color),
     0.6px  0.6px 0 var(--accent-color),
    -0.6px  0.6px 0 var(--accent-color),
     0.6px -0.6px 0 var(--accent-color),
    -0.6px -0.6px 0 var(--accent-color);
}

.grade-pip.gold {
  background: rgba(255, 201, 51, 0.2);
  color: rgb(255, 201, 51);
}

.grade-pip.blue {
  background: rgba(51, 200, 255, 0.2);
  color: hsl(192, 100%, 60%);
}

.grade-arrow {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* ── Complex pills (Skills / Potential / Equipment) ── */
.pill--complex {
  align-items: flex-start;
  flex-wrap: wrap;
  padding: 7px 10px;
  gap: 6px;
}

.pill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
  flex: 1;
}

.pill-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  border-radius: 4px;
  background: var(--background-secondary);
  font-size: 0.72rem;
  transition: background 0.15s;
}

.pill-item input[type="checkbox"]:checked + .pill--complex .pill-chip {
  background: color-mix(in srgb, var(--accent-color) 14%, var(--background-secondary));
}

.chip-name {
  color: var(--text-secondary);
  font-weight: 600;
  line-height: 1;
}

.chip-value {
  color: var(--accent-color);
  font-weight: 600;
  line-height: 1;
}

/* ── Insufficient warning ── */
.insufficient-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 2px 10px;
  padding: 6px 8px;
  background: color-mix(in srgb, #f59e0b 12%, var(--background-secondary));
  border: 1px solid color-mix(in srgb, #f59e0b 35%, transparent);
  border-radius: 5px;
  font-size: 0.75rem;
  color: #d97706;
  line-height: 1.4;
}
.insufficient-warning svg { flex-shrink: 0; margin-top: 1px; }

/* ── Actions ── */
.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 4px 12px 2px;
}

.cancel-btn {
  padding: 4px 12px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s;
}
.cancel-btn:hover {
  background: var(--background-secondary);
  color: var(--text-primary);
}

.apply-btn {
  padding: 4px 14px;
  border: none;
  border-radius: 5px;
  background: var(--accent-color);
  color: white;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: opacity 0.15s;
}
.apply-btn:hover:not(:disabled) { opacity: 0.85; }
.apply-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Mobile: bottom sheet */
@media (max-width: 480px) {
  .apply-panel {
    min-width: unset;
    max-width: 100%;
    width: 100%;
    border-radius: 12px 12px 0 0;
    border-bottom: none;
  }
}
</style>
