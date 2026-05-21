<script setup lang="ts">
import { computed, onMounted, toRef } from 'vue';
import { useRouter } from 'vue-router';
import { useStudentGifts } from '@/lib/hooks/useStudentGifts';
import { useStudentData } from '@/lib/hooks/useStudentData';
import { useBondsTracked, getStudentFavorMaterialNeeds } from '@/lib/hooks/useBondsTracked';
import GiftCard from '@/components/modal/bond/GiftCard.vue';
import GiftOption from '@/components/modal/bond/GiftOption.vue';
import GiftGrid from '@/components/modal/bond/GiftGrid.vue';
import ConvertMaterialModal from '@/components/modal/bond/ConvertMaterialModal.vue';
import SyncGiftsModeModal from '@/components/modal/bond/SyncGiftsModeModal.vue';
import MetaHeader from '@/components/modal/MetaHeader.vue';
import type { GiftProps } from '@/types/gift';
import { YELLOW_STONE_ID, SR_GIFT_MATERIAL_ID } from '@/types/resource';
import { HIDDEN_BOX_IDS } from '@/lib/constants/giftConstants';
import { getStudentCollectionUrl } from '@/lib/utils/iconUtils';
import { getResourceDataByIdSync } from '@/lib/stores/resourceCacheStore';
import { $t } from '@/locales';
import type { StudentProps } from '@/types/student';

const props = defineProps<{
  student: StudentProps;
  collapsed?: boolean;
}>();

const { allGifts } = useStudentData();
const { isGiftPlanningEnabled, enableGiftPlanning, disableGiftPlanning } = useBondsTracked();

const {
  currentBond, newBondLevel, totalCumulativeExp, remainingXp,
  giftFormData, boxFormData, nonFavorGiftsMap, shouldShowGiftGrade,
  convertBoxes, handleBondInput, handleGiftInput, handleBoxInput, handleNonFavorGiftInput,
  showConvertModal, convertModalNeeded, confirmConversion, cancelConversion,
  showSyncGiftsModal, syncGifts,
  canUndo, canRedo, undoChanges, redoChanges, resetGifts,
  loadFromIndexedDB,
} = useStudentGifts(toRef(props, 'student'));

// Load persisted form data once the component is mounted. 
onMounted(() => loadFromIndexedDB());

const filteredBoxes = computed(() =>
  (props.student.Boxes ?? []).filter(b => !HIDDEN_BOX_IDS.has(b.gift.Id))
);

const editorStudent = computed<StudentProps>(() => ({
  ...props.student,
  Boxes: filteredBoxes.value,
}));

// ── Non-favored gifts: full list from allGifts minus the student's favored ─
const nonFavorGifts = computed(() => {
  const full = allGifts.value[String(props.student.Id)] ?? [];
  const favoredIds = new Set((props.student.Gifts ?? []).map(g => g.gift.Id));
  return full.filter(g => !favoredIds.has(g.gift.Id));
});

// ── Convert button gating ───────────────────────────────────────────────────
const canConvert = computed(() =>
  (boxFormData.value[YELLOW_STONE_ID] ?? 0) > 0 &&
  (boxFormData.value[SR_GIFT_MATERIAL_ID] ?? 0) >= 2
);

// ── Yellow stone item (rendered as a GiftCard) ──────────────────────────────
const yellowStoneItem = computed<GiftProps | null>(() => {
  const res = getResourceDataByIdSync(YELLOW_STONE_ID);
  return res ? { gift: res, exp: 0, grade: 0 } : null;
});

// ── Material needs (banner data) ────────────────────────────────────────────
const materialNeeds = computed(() => getStudentFavorMaterialNeeds(props.student.Id));

const materialNeedItems = computed<{ item: GiftProps; qty: number }[]>(() =>
  materialNeeds.value.map(n => ({
    item: { gift: n.material, exp: 0, grade: 0 },
    qty: n.quantity,
  }))
);

// ── Gift planning visibility ────────────────────────────────────────────────
const hasAllocations = computed(() => {
  for (const v of Object.values(giftFormData.value)) if (v > 0) return true;
  for (const v of Object.values(boxFormData.value)) if (v > 0) return true;
  return false;
});

const showGiftGrid = computed(() =>
  hasAllocations.value || isGiftPlanningEnabled(props.student.Id)
);

function onEnableGiftGrid() {
  enableGiftPlanning(props.student.Id);
}
function onHideGiftGrid() {
  disableGiftPlanning(props.student.Id);
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
          :remaining-xp="remainingXp"
          :total-exp="totalCumulativeExp"
          bond-progress
          @update-bond="handleBondInput"
        />
        <div v-if="!collapsed" class="be-header-divider" aria-hidden="true"></div>
        <GiftOption
          v-if="!collapsed"
          class="be-options"
          :can-convert="canConvert"
          :can-undo="canUndo"
          :can-redo="canRedo"
          @toggle-convert="convertBoxes"
          @sync-gifts="showSyncGiftsModal = true"
          @reset-gifts="resetGifts"
          @undo-changes="undoChanges"
          @redo-changes="redoChanges"
        />
      </div>
    </div>

    <template v-if="!collapsed">
      <div class="be-cards-row">
        <section v-if="yellowStoneItem" class="be-card-group">
          <h3 class="be-card-label">{{ $t('conversion') }}</h3>
          <div class="be-card-group-items">
            <GiftCard
              :item="yellowStoneItem"
              :value="boxFormData[YELLOW_STONE_ID] ?? 0"
              :is-box="true"
              @update:value="(e) => handleBoxInput(YELLOW_STONE_ID, e)"
            />
          </div>
        </section>

        <section v-if="materialNeedItems.length" class="be-card-group be-card-group--consumed">
          <h3 class="be-card-label">{{ $t('consumed') }}</h3>
          <div class="be-card-group-items">
            <GiftCard
              v-for="need in materialNeedItems"
              :key="need.item.gift.Id"
              :item="need.item"
              :value="need.qty"
              readonly
              hide-grade
            />
          </div>
        </section>
      </div>

      <!-- Gift grid OR opt-in toggle -->
      <template v-if="showGiftGrid">
        <GiftGrid
          :student="editorStudent"
          :gift-form-data="giftFormData"
          :box-form-data="boxFormData"
          :non-favor-gifts="nonFavorGifts"
          :non-favor-values="nonFavorGiftsMap"
          :should-show-gift-grade="shouldShowGiftGrade"
          show-favored-label
          @update-gift="handleGiftInput"
          @update-box="handleBoxInput"
          @update-nonfavor="handleNonFavorGiftInput"
        />
        <div v-if="!hasAllocations" class="be-grid-footer">
          <button type="button" class="be-link-btn" @click="onHideGiftGrid">
            {{ $t('hideGiftGrid') }}
          </button>
        </div>
      </template>
      <button v-else type="button" class="be-plan-gifts-btn" @click="onEnableGiftGrid">
        + {{ $t('planGifts') }}
      </button>
    </template>

    <ConvertMaterialModal
      v-if="showConvertModal"
      :needed-count="convertModalNeeded"
      :non-favor-gifts-map="nonFavorGiftsMap"
      @confirm="confirmConversion"
      @cancel="cancelConversion"
    />

    <SyncGiftsModeModal
      v-if="showSyncGiftsModal"
      @confirm="(mode) => { showSyncGiftsModal = false; syncGifts(mode); }"
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

/* ── Header: full-width row, icon stretches to match MetaHeader's height ───── */
.be-header {
  display: flex;
  align-items: stretch;
  gap: 14px;
  min-width: 0;
}

.be-icon-wrap {
  flex-shrink: 0;
  width: 200px;
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

.be-header-divider {
  flex: 1;
  min-height: 12px;
  display: flex;
  align-items: center;
}

.be-header-divider::before {
  content: '';
  display: block;
  width: 100%;
  height: 1px;
  background: var(--border-color);
}

.be-meta {
  min-width: 0;
}

/* ── Card row: two labelled groups, full width ─────────────────────────────── */
.be-cards-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.be-card-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px dashed var(--border-color);
  background: var(--background-primary);
}

.be-card-group--consumed {
  border-color: color-mix(in srgb, var(--accent-color) 40%, var(--border-color));
  background: color-mix(in srgb, var(--accent-color) 6%, transparent);
}

.be-card-label {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.be-card-group-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* ── Opt-in toggle ─────────────────────────────────────────────────────────── */
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
  transition: color 0.15s, border-color 0.15s, background-color 0.15s;
}

.be-plan-gifts-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
  background-color: color-mix(in srgb, var(--accent-color) 8%, transparent);
}

.be-grid-footer {
  display: flex;
  justify-content: flex-end;
}

.be-link-btn {
  background: transparent;
  border: none;
  padding: 4px 6px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
}

.be-link-btn:hover {
  color: var(--accent-color);
}

.be-return-link {
  align-self: flex-start;
  background: transparent;
  border: none;
  padding: 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
}

.be-return-link:hover {
  color: var(--accent-color);
}

/* ── Responsive ────────────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .be-header {
    flex-direction: column;
    align-items: stretch;
  }

  .be-icon-wrap {
    align-self: flex-start;
    width: 96px;
    height: 108px;  /* matches collection portrait's ~200/226 aspect at 96px wide */
  }
}
</style>
