<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, toRef } from 'vue';
import { useRouter } from 'vue-router';
import { useStudentForm } from '@/lib/hooks/useStudentForm';
import { useStudentData } from '@/lib/hooks/useStudentData';
import { useBondsTracked } from '@/lib/hooks/useBondsTracked';
import GiftOption from '@/components/bonds/gift/GiftOption.vue';
import GiftGrid from '@/components/bonds/gift/GiftGrid.vue';
import BondPlanPanel from '@/components/bonds/BondPlanPanel.vue';
import ConvertMaterialModal from '@/components/bonds/gift/ConvertMaterialModal.vue';
import SyncGiftsModeModal from '@/components/bonds/gift/SyncGiftsModeModal.vue';
import MetaHeader from '@/components/shared/MetaHeader.vue';

// Lazy: the cafe planner pulls in @vuepic/vue-datepicker and only renders when
// someone expands the planned-sources section.
const OtherExpPanel = defineAsyncComponent(() => import('@/components/bonds/OtherExpPanel.vue'));
import type { OtherExpDataProps } from '@/types/gift';
import { SR_GIFT_MATERIAL_ID } from '@/types/resource';
import { HIDDEN_BOX_IDS } from '@/lib/constants/giftConstants';
import { getStudentCollectionUrl } from '@/lib/utils/iconUtils';
import { $t } from '@/locales';
import type { StudentProps } from '@/types/student';
import { useAnalytics } from '@/lib/hooks/useAnalytics';

const props = defineProps<{
  student: StudentProps;
  collapsed?: boolean;
}>();

const { allGifts } = useStudentData();
const { track } = useAnalytics();
const { isGiftPlanningEnabled, enableGiftPlanning, disableGiftPlanning } = useBondsTracked();

const {
  currentBond,
  newBondLevel,
  totalCumulativeExp,
  bondGoalLevel,
  currentBondExp,
  currentBondExpMax,
  targetBondExp,
  targetBondExpMax,
  goalRemainingExp,
  currentBondGoalPercent,
  projectedBondGoalPercent,
  remainingXp,
  cafeExp,
  bonusExp,
  giftFormData,
  boxFormData,
  nonFavorGiftsMap,
  otherExpData,
  shouldShowGiftGrade,
  convertBoxes,
  handleBondInput,
  handleCurrentBondExp,
  handleTargetBond,
  handleTargetBondExp,
  handleGiftInput,
  handleBoxInput,
  handleNonFavorGiftInput,
  updateOtherExp,
  resetOtherExp,
  showConvertModal,
  confirmConversion,
  cancelConversion,
  showSyncGiftsModal,
  syncGifts,
  canUndo,
  canRedo,
  undoChanges,
  redoChanges,
  resetGifts,
  loadFromIndexedDB,
  saveBeforeClose,
} = useStudentForm(toRef(props, 'student'), { historySource: 'bonds' });

defineExpose({ saveBeforeClose });

onMounted(() => loadFromIndexedDB());

const filteredBoxes = computed(() =>
  (props.student.Boxes ?? []).filter((b) => !HIDDEN_BOX_IDS.has(b.gift.Id)),
);

const editorStudent = computed<StudentProps>(() => ({
  ...props.student,
  Boxes: filteredBoxes.value,
}));

// --- Non-favored gifts: full list from allGifts minus the student's favored ---
const nonFavorGifts = computed(() => {
  const full = allGifts.value[String(props.student.Id)] ?? [];
  const favoredIds = new Set((props.student.Gifts ?? []).map((g) => g.gift.Id));
  return full.filter((g) => !favoredIds.has(g.gift.Id));
});

// --- Convert button gating ---
const maxConversions = computed(() =>
  Math.floor((boxFormData.value[SR_GIFT_MATERIAL_ID] ?? 0) / 2),
);
const canConvert = computed(() => maxConversions.value > 0);

// --- Gift planning visibility ---
const showOtherGifts = ref(false);
const otherGiftAllocationCount = computed(() =>
  Object.values(nonFavorGiftsMap.value).reduce((total, value) => total + Math.max(0, value), 0),
);

const hasAllocations = computed(() => {
  for (const v of Object.values(giftFormData.value)) if (v > 0) return true;
  for (const v of Object.values(boxFormData.value)) if (v > 0) return true;
  return false;
});

const showGiftGrid = computed(
  () => hasAllocations.value || isGiftPlanningEnabled(props.student.Id),
);

function onEnableGiftGrid() {
  showOtherGifts.value = false;
  enableGiftPlanning(props.student.Id);
  track({ name: 'feature_opened', feature: 'bond_planner', action: 'opened' });
}
function onHideGiftGrid() {
  showOtherGifts.value = false;
  disableGiftPlanning(props.student.Id);
  track({ name: 'plan_action', feature: 'bond_planner', action: 'changed' });
}

function onBondInput(value: number): void {
  handleBondInput(value);
  track({ name: 'plan_action', feature: 'bond_planner', action: 'adjusted' });
}

function onGiftInput(id: number, event: Event): void {
  handleGiftInput(id, event);
  track({ name: 'plan_action', feature: 'bond_planner', action: 'adjusted' });
}

function onBoxInput(id: number, event: Event): void {
  handleBoxInput(id, event);
  track({ name: 'plan_action', feature: 'bond_planner', action: 'adjusted' });
}

function onNonFavorInput(id: number, event: Event): void {
  handleNonFavorGiftInput(id, event);
  track({ name: 'plan_action', feature: 'bond_planner', action: 'adjusted' });
}

function onResetGifts(): void {
  resetGifts();
  track({ name: 'plan_action', feature: 'bond_planner', action: 'reset' });
}

function onUndoChanges(): void {
  undoChanges();
  track({ name: 'plan_action', feature: 'bond_planner', action: 'adjusted' });
}

function onRedoChanges(): void {
  redoChanges();
  track({ name: 'plan_action', feature: 'bond_planner', action: 'adjusted' });
}

function onConfirmConversion(count: number, selection: Record<number, number>): void {
  confirmConversion(count, selection);
  track({ name: 'workflow_completed', feature: 'bond_planner', action: 'converted' });
}

function onSyncGifts(mode: 'greedy' | 'aware'): void {
  showSyncGiftsModal.value = false;
  syncGifts(mode);
  track({ name: 'workflow_completed', feature: 'bond_planner', action: 'synced' });
}

function onCurrentBondExp(value: number): void {
  handleCurrentBondExp(value);
  track({ name: 'plan_action', feature: 'bond_planner', action: 'adjusted' });
}

function onTargetBond(value: number): void {
  handleTargetBond(value);
  track({ name: 'plan_action', feature: 'bond_planner', action: 'adjusted' });
}

function onTargetBondExp(value: number): void {
  handleTargetBondExp(value);
  track({ name: 'plan_action', feature: 'bond_planner', action: 'adjusted' });
}

function onUpdateOtherExp(patch: Partial<OtherExpDataProps>): void {
  updateOtherExp(patch);
  track({ name: 'plan_action', feature: 'bond_planner', action: 'adjusted' });
}

function onResetOtherExp(): void {
  resetOtherExp();
  track({ name: 'plan_action', feature: 'bond_planner', action: 'reset' });
}

// Reverse deep-link: jump back to /students with this student's modal opened.
const router = useRouter();
function returnToStudentPage() {
  router.push(`/students?focus=${props.student.Id}`);
}
</script>

<template>
  <div class="bonds-editor">
    <button type="button" class="be-return-link" @click="returnToStudentPage">
      ← {{ $t('returnToStudent') }}
    </button>

    <div class="be-header">
      <div class="be-icon-wrap">
        <img :src="getStudentCollectionUrl(student.Id)" :alt="student.Name" class="be-icon" />
      </div>
      <div class="be-header-content">
        <MetaHeader
          class="be-meta"
          :student="student"
          :current-bond="currentBond"
          :new-bond-level="newBondLevel"
          :bond-goal-level="bondGoalLevel"
          :bond-goal-current-percent="currentBondGoalPercent"
          :bond-goal-projected-percent="projectedBondGoalPercent"
          bond-progress
          compact-bond
          @update-bond="onBondInput"
        />
      </div>
      <BondPlanPanel
        v-if="!collapsed"
        class="be-bond-plan"
        :student-id="student.Id"
        :current-bond="currentBond"
        :current-bond-exp="currentBondExp"
        :current-bond-exp-max="currentBondExpMax"
        :target-bond="bondGoalLevel"
        :target-bond-exp="targetBondExp"
        :target-bond-exp-max="targetBondExpMax"
        :lesson-exp-rate="otherExpData.lessonExpRate"
        :remaining-exp="goalRemainingExp"
        :remaining-xp="remainingXp"
        :planned-exp="totalCumulativeExp"
        :cafe-exp="cafeExp"
        :bonus-exp="bonusExp"
        :projected-bond="newBondLevel"
        @update-current-exp="onCurrentBondExp"
        @update-target-bond="onTargetBond"
        @update-target-exp="onTargetBondExp"
      >
        <template #sources>
          <OtherExpPanel
            :student-id="student.Id"
            :data="otherExpData"
            @update="onUpdateOtherExp"
            @reset="onResetOtherExp"
          />
        </template>
      </BondPlanPanel>
    </div>

    <template v-if="!collapsed">
      <div class="be-actions-row">
        <div class="be-view-actions">
          <button
            v-if="!showGiftGrid || !hasAllocations"
            type="button"
            class="be-plan-gifts-btn"
            @click="showGiftGrid ? onHideGiftGrid() : onEnableGiftGrid()"
          >
            {{ showGiftGrid ? $t('hideGiftGrid') : `+ ${$t('planGifts')}` }}
          </button>
          <button
            v-if="showGiftGrid"
            type="button"
            class="be-plan-gifts-btn"
            :aria-pressed="showOtherGifts"
            @click="showOtherGifts = !showOtherGifts"
          >
            {{ showOtherGifts ? $t('hideOtherGifts') : $t('showOtherGifts') }}
            <template v-if="!showOtherGifts && otherGiftAllocationCount > 0">
              · {{ $t('selectedGiftCount', { count: otherGiftAllocationCount }) }}
            </template>
          </button>
        </div>

        <GiftOption
          class="be-options"
          :can-convert="canConvert"
          :can-undo="canUndo"
          :can-redo="canRedo"
          flat
          @toggle-convert="convertBoxes"
          @sync-gifts="showSyncGiftsModal = true"
          @reset-gifts="onResetGifts"
          @undo-changes="onUndoChanges"
          @redo-changes="onRedoChanges"
        />
      </div>

      <template v-if="showGiftGrid">
        <GiftGrid
          :student="editorStudent"
          :gift-form-data="giftFormData"
          :box-form-data="boxFormData"
          :non-favor-gifts="showOtherGifts ? nonFavorGifts : undefined"
          :non-favor-values="nonFavorGiftsMap"
          :should-show-gift-grade="shouldShowGiftGrade"
          show-favored-label
          @update-gift="onGiftInput"
          @update-box="onBoxInput"
          @update-nonfavor="onNonFavorInput"
        />
      </template>
    </template>

    <ConvertMaterialModal
      v-if="showConvertModal"
      :max-count="maxConversions"
      :non-favor-gifts-map="nonFavorGiftsMap"
      @confirm="onConfirmConversion"
      @cancel="cancelConversion"
    />

    <SyncGiftsModeModal
      v-if="showSyncGiftsModal"
      @confirm="onSyncGifts"
      @cancel="showSyncGiftsModal = false"
    />
  </div>
</template>

<style scoped>
.bonds-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--card-background);
}

.be-header {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  min-width: 0;
}

.be-icon-wrap {
  grid-row: 1 / span 2;
  align-self: start;
  margin-top: 14px;
  flex-shrink: 0;
  width: 200px;
  aspect-ratio: 200 / 226;
  border-radius: 12px;
  overflow: hidden;
  background: var(--background-primary);
}

.be-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.be-header-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.be-meta {
  min-width: 0;
}

.be-bond-plan {
  grid-column: 2;
  min-width: 0;
}

.be-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.be-view-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.be-options {
  min-width: 0;
  margin-left: auto;
}

/* --- Opt-in toggle --- */
.be-plan-gifts-btn {
  align-self: flex-start;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background-color 0.15s;
}

.be-plan-gifts-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
  background-color: color-mix(in srgb, var(--accent-color) 8%, transparent);
}

.be-return-link {
  align-self: flex-start;
  background: transparent;
  border: none;
  padding: 0;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
}

.be-return-link:hover {
  color: var(--accent-color);
}

/* --- Responsive --- */
@media (max-width: 1100px) {
  .be-icon-wrap {
    grid-row: 1;
    align-self: start;
    margin-top: 0;
    width: 140px;
  }

  .be-header {
    grid-template-columns: 140px minmax(0, 1fr);
  }

  .be-bond-plan {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .be-actions-row {
    align-items: stretch;
    flex-direction: column;
  }

  .be-options {
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .be-header {
    grid-template-columns: 1fr;
  }

  .be-icon-wrap {
    grid-column: 1;
    align-self: flex-start;
    width: 96px;
  }

  .be-header-content,
  .be-bond-plan {
    grid-column: 1;
  }
}
</style>
