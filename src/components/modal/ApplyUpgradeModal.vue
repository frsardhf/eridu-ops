<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { $t } from '@/locales';
import { SkillLevels, PotentialLevels, SectionId, MaterialPreviewItem } from '@/types/upgrade';
import type { EquipmentLevels, GradeLevels, ExclusiveGearLevel } from '@/types/gear';
import { StudentProps } from '@/types/student';
import { useApplyUpgrade } from '@/composables/useApplyUpgrade';
import { getItemIconUrl } from '@/consumables/utils/iconUtils';
import { formatLargeNumber, isExpBall } from '@/consumables/utils/materialUtils';
import '@/styles/resourceDisplay.css';
import '@/styles/modalActions.css';

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
  computePreview: (ids: SectionId[]) => MaterialPreviewItem[];
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

const selectedIds = ref<Set<SectionId>>(new Set());

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

type ViewMode = 'consumed' | 'remaining';
const viewMode = ref<ViewMode>('consumed');

const previewItems = computed(() => props.computePreview(Array.from(selectedIds.value)));

const canApply = computed(() => selectedIds.value.size > 0 && props.hasSufficientMaterials);

function handleApply() {
  if (!canApply.value) return;
  emit('apply', Array.from(selectedIds.value));
}

function getIconUrl(item: MaterialPreviewItem): string {
  const { Id, Icon, Tier } = item.material;
  if (isExpBall(Id)) {
    return `https://schaledb.com/images/equipment/icon/${Icon}.webp`;
  }
  return getItemIconUrl(Icon, item.type === 'equipments' ? 'equipment' : 'item', Tier);
}
</script>

<template>
  <Teleport to="body">
    <div class="upgrade-backdrop" @click.self="emit('close')">
      <div class="upgrade-modal">

        <!-- Header -->
        <div class="upgrade-header">
          <span class="upgrade-title">{{ $t('confirmApplyUpgrade') }}</span>
          <div class="view-toggle">
            <button
              class="toggle-btn toggle-used"
              :class="{ active: viewMode === 'consumed' }"
              @click="viewMode = 'consumed'"
            >{{ $t('used') }}</button>
            <button
              class="toggle-btn toggle-leftover"
              :class="{ active: viewMode === 'remaining' }"
              @click="viewMode = 'remaining'"
            >{{ $t('leftover') }}</button>
          </div>
        </div>

        <!-- Section pills -->
        <div class="pills-section">
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

          <div
            v-if="hasSkillsPending || hasPotentialPending || hasEquipmentPending"
            class="complex-pills-grid"
          >
            <div v-if="hasSkillsPending" class="pill-item pill-item--grid">
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

            <div v-if="hasPotentialPending" class="pill-item pill-item--grid">
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

            <div v-if="hasEquipmentPending" class="pill-item pill-item--grid">
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
          </div>

          <div v-if="!hasSufficientMaterials && insufficientList.length > 0" class="insufficient-warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>{{ $t('notEnough') }}: {{ insufficientList.slice(0, 3).join(', ') }}{{ insufficientList.length > 3 ? ` +${insufficientList.length - 3}` : '' }}</span>
          </div>
        </div>

        <div class="section-divider" />

        <!-- Material preview -->
        <div class="preview-section">
          <p v-if="previewItems.length === 0" class="empty-msg">
            {{ $t('noMaterialsToConsume') }}
          </p>
          <div v-else class="resources-grid">
            <div
              v-for="item in previewItems"
              :key="`${item.type}-${item.material.Id}`"
              class="resource-item"
              :title="item.material.Name"
            >
              <div class="resource-content">
                <img
                  :src="getIconUrl(item)"
                  :alt="item.material.Name"
                  class="resource-icon"
                />
                <span
                  v-if="viewMode === 'consumed'"
                  class="resource-quantity quantity-consumed"
                >{{ formatLargeNumber(item.needed) }}</span>
                <span
                  v-else
                  class="resource-quantity positive"
                >{{ formatLargeNumber(item.remaining) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="upgrade-footer">
          <button class="modal-btn modal-btn-cancel" type="button" @click="emit('close')">{{ $t('cancel') }}</button>
          <button class="modal-btn modal-btn-primary" type="button" :disabled="!canApply" @click="handleApply">
            {{ $t('apply') }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.upgrade-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(2px);
}

.upgrade-modal {
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  width: 90%;
  max-width: 680px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  font-size: 0.9em;
  animation: modal-appear 0.2s ease;
}

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Header ── */
.upgrade-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.upgrade-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.view-toggle {
  display: flex;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.toggle-btn {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.12s, color 0.12s;
}
.toggle-btn + .toggle-btn { border-left: 1px solid var(--border-color); }
.toggle-btn:hover { color: var(--text-primary); }
.toggle-btn.active { border-left-color: transparent; }
.toggle-used.active {
  color: #1f4fd6;
  background: color-mix(in srgb, #1f4fd6 18%, var(--card-background));
}
.toggle-leftover.active {
  color: #2e7d32;
  background: color-mix(in srgb, #2e7d32 18%, var(--card-background));
}

/* ── Pills section ── */
.pills-section {
  padding: 4px 0;
  flex-shrink: 0;
}

.divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

.section-divider {
  height: 1px;
  background: var(--border-color);
  flex-shrink: 0;
}

.empty-msg {
  padding: 6px 14px;
  color: var(--text-secondary);
  font-size: 0.85em;
}

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

.pill--select-all { border-color: transparent; }
.pill--select-all .pill-name {
  font-size: 0.9em;
  font-weight: 700;
  color: var(--text-primary);
}
.pill--select-all.is-partial {
  border-color: color-mix(in srgb, var(--accent-color) 45%, var(--border-color));
  background: color-mix(in srgb, var(--accent-color) 6%, transparent);
  color: var(--text-primary);
}

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
  font-size: 0.82em;
  font-weight: 600;
  color: var(--accent-color);
  line-height: 1;
}

.pill-grade-value {
  display: flex;
  align-items: center;
  gap: 2px;
}

.grade-pip {
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.72em;
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
  font-size: 0.75em;
  color: var(--text-secondary);
}

.complex-pills-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 2px 8px;
}

.pill-item--grid {
  padding: 0;
}

.pill-item--grid input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.pill--complex {
  flex-direction: column;
  align-items: center;
  padding: 8px 10px;
  gap: 6px;
  height: 100%;
  box-sizing: border-box;
}

.pill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-start;
}

@media (max-width: 480px) {
  .complex-pills-grid {
    grid-template-columns: 1fr;
  }
}

.pill-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  border-radius: 4px;
  background: var(--background-secondary);
  font-size: 0.72em;
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

.insufficient-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 2px 10px;
  padding: 6px 8px;
  background: color-mix(in srgb, #f59e0b 12%, var(--background-secondary));
  border: 1px solid color-mix(in srgb, #f59e0b 35%, transparent);
  border-radius: 5px;
  font-size: 0.8em;
  color: #d97706;
  line-height: 1.4;
}
.insufficient-warning svg { flex-shrink: 0; margin-top: 1px; }

/* ── Preview section ── */
.preview-section {
  overflow-y: auto;
  flex: 1;
  background: var(--card-background);
  border-radius: 8px;
  margin: 6px 8px 4px;
  min-height: 80px;
}

:deep(.quantity-consumed) {
  color: #e57c00 !important;
}

/* ── Footer ── */
.upgrade-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px 10px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .upgrade-modal {
    width: 100%;
    max-width: 100%;
    max-height: 90vh;
    border-radius: 12px 12px 0 0;
    border-bottom: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
  }
  .upgrade-backdrop {
    align-items: flex-end;
  }
}
</style>
