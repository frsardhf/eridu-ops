<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, CSSProperties } from 'vue';
import { $t } from '@/locales';
import { studentDataStore, studentDataVersion } from '@/consumables/stores/studentStore';
import { useStudentOwnership } from '@/consumables/hooks/useStudentOwnership';
import { useStudentEquipment } from '@/consumables/hooks/useStudentEquipment';
import { useStudentGear } from '@/consumables/hooks/useStudentGear';
import { useStudentGifts } from '@/consumables/hooks/useStudentGifts';
import { useStudentItems } from '@/consumables/hooks/useStudentItems';
import { useStudentUpgrade } from '@/consumables/hooks/useStudentUpgrade';
import { useStudentData } from '@/consumables/hooks/useStudentData';
import { initializeStudentFormData } from '@/consumables/services/studentFormService';
import { setStudentDataDirect } from '@/consumables/stores/studentStore';
import { hasLinkedPartner, getLinkedPartnerId } from '@/consumables/constants/linkedStudents';
import GlobalInventoryModal from '@/components/inventory/GlobalInventoryModal.vue';
import BondSection from '@/components/modal/bond/BondSection.vue';
import GiftOption from '@/components/modal/bond/GiftOption.vue';
import GiftGrid from '@/components/modal/bond/GiftGrid.vue';
import EquipmentGrowthSection from '@/components/modal/gear/EquipmentGrowthSection.vue';
import ElephEligmaSection from '@/components/modal/gear/ElephEligmaSection.vue';
import ExclusiveWeaponSection from '@/components/modal/gear/ExclusiveWeaponSection.vue';
import InfoGear from '@/components/modal/info/InfoGear.vue';
import InfoSkills from '@/components/modal/info/InfoSkills.vue';
import InfoWeapon from '@/components/modal/info/InfoWeapon.vue';
import MetaHeader from '@/components/modal/MetaHeader.vue';
import MaterialsSection from '@/components/modal/shared/MaterialsSection.vue';
import ApplyUpgradePanel from '@/components/modal/ApplyUpgradePanel.vue';
import LevelSection from '@/components/modal/upgrade/LevelSection.vue';
import PotentialSection from '@/components/modal/upgrade/PotentialSection.vue';
import SkillSection from '@/components/modal/upgrade/SkillSection.vue';
import ModalHeader from '@/components/modal/ModalHeader.vue';
import StudentStrip from '@/components/modal/StudentStrip.vue';
import { ModalOriginRect } from '@/types/modal';
import { StudentProps } from '@/types/student';
import { SkillType, PotentialType, Material, MaterialPreviewItem, type SectionId } from '@/types/upgrade';
import type { EquipmentType } from '@/types/gear';
import { positionAtElement } from '@/composables/useTooltip';
import { computeCharacterXpCost, getCharXpItems } from '@/consumables/utils/upgradeMaterialUtils';
import { computeEquipmentXpCost, getEquipXpItems } from '@/consumables/utils/gearMaterialUtils';
import { deductXpItems, simulateXpDeduction } from '@/consumables/utils/upgradeUtils';
import { getResourceDataByIdSync, getEquipmentDataByIdSync } from '@/consumables/stores/resourceCacheStore';
import ApplyConfirmModal from '@/components/modal/ApplyConfirmModal.vue';
import '@/styles/studentModal.css'

type ModalTab = 'info' | 'bond' | 'upgrade' | 'gear';

const MODAL_TAB_ORDER: Record<ModalTab, number> = {
  info: 0,
  bond: 1,
  upgrade: 2,
  gear: 3
};

const props = defineProps<{
  student: StudentProps,
  originRect?: ModalOriginRect | null,
  isVisible?: boolean,
  studentsArray?: StudentProps[]
}>();

const emit = defineEmits<(event: 'close' | 'navigate', payload?: any) => void>();

const { setOwned } = useStudentOwnership();

const activeTab = ref<ModalTab>('info');
const tabDirection = ref<'forward' | 'backward'>('forward');
const activeTabTransitionName = computed(() =>
  tabDirection.value === 'forward' ? 'modal-pane-forward' : 'modal-pane-backward'
);
const activeTabTransitionKey = computed(() => activeTab.value);

const isInventoryOpen  = ref(false);
const showApplyPanel      = ref(false);
const showConfirmModal    = ref(false);
const pendingSelectedIds  = ref<SectionId[]>([]);
const applyPanelStyle  = ref<{ top: string; left: string }>({ top: '0px', left: '0px' });
const applyPanelWrapper = ref<HTMLElement | null>(null);

const displayedStudent = ref<StudentProps | null>(null);

const activeStyleId = ref<number | null>(null);

let hydrateRequestToken = 0;

const { studentData: rawStudentData } = useStudentData();

const hasStyleSwitch = computed(() => hasLinkedPartner(props.student?.Id));

// Ownership — undefined / true treated as owned (backward-compat)
const isOwned = computed(() => {
  // Access version so this recomputes on any store update
  void studentDataVersion.value;
  if (!displayedStudent.value) return true;
  return studentDataStore.value[displayedStudent.value.Id]?.isOwned !== false;
});

const hasOriginMorph = computed(() => {
  const origin = props.originRect;
  return !!origin && origin.width > 0 && origin.height > 0;
});

const modalOriginStyle = computed<CSSProperties>(() => {
  if (!hasOriginMorph.value || typeof window === 'undefined') {
    return {};
  }

  const origin = props.originRect as ModalOriginRect;
  const viewportWidth = Math.max(window.innerWidth || 1, 1);
  const viewportHeight = Math.max(window.innerHeight || 1, 1);
  const scaleX = Math.min(1, Math.max(0.05, origin.width / viewportWidth));
  const scaleY = Math.min(1, Math.max(0.05, origin.height / viewportHeight));

  return {
    '--modal-origin-x': `${origin.left}px`,
    '--modal-origin-y': `${origin.top}px`,
    '--modal-origin-scale-x': `${scaleX}`,
    '--modal-origin-scale-y': `${scaleY}`
  } as CSSProperties;
});

const styleStudent = computed<StudentProps | null>(() => {
  if (!displayedStudent.value) return null;
  if (!activeStyleId.value || activeStyleId.value === displayedStudent.value.Id) {
    return displayedStudent.value;
  }
  return rawStudentData.value[activeStyleId.value] ?? displayedStudent.value;
});

const activeStyleStudent = computed(() => styleStudent.value ?? displayedStudent.value);

const {
  currentBond, newBondLevel, totalCumulativeExp, remainingXp: bondRemainingXp,
  giftFormData, boxFormData, shouldShowGiftGrade,
  closeModal, convertBoxes, handleBondInput, handleGiftInput, handleBoxInput,
  autoFillGifts, resetGifts, undoChanges,
  loadFromIndexedDB: loadGiftData,
} = useStudentGifts(props, emit);

const {
  characterLevels, skillLevels, potentialLevels, allMaterialsNeeded,
  allSkillsMaxed, targetSkillsMaxed, allPotentialsMaxed, targetPotentialsMaxed,
  remainingXp: characterRemainingXp,
  handleLevelUpdate, handleSkillUpdate, handlePotentialUpdate,
  toggleMaxAllSkills, toggleMaxTargetSkills, toggleMaxAllPotentials, toggleMaxTargetPotentials,
  saveBeforeClose: saveUpgradeBeforeClose, loadFromIndexedDB: loadUpgradeData,
} = useStudentUpgrade(props, emit);

const {
  itemFormData,
  handleItemInput,
  loadItems
} = useStudentItems(props);

const {
  equipmentFormData,
  handleEquipmentInput,
  loadEquipments
} = useStudentEquipment(props);

const {
  equipmentLevels, gradeLevels, gradeInfos, equipmentMaterialsNeeded, exclusiveGearLevel,
  allGearsMaxed, targetGearsMaxed, hasExclusiveGear, maxUnlockableGearTier,
  handleEquipmentUpdate, handleGradeUpdate, handleGradeInfoUpdate, getElephsForGrade,
  toggleMaxAllGears, toggleMaxTargetGears, handleExclusiveGearUpdate,
  loadFromIndexedDB: loadGearData,
} = useStudentGear(props, emit);

// Image preloading for neighbor students
function preloadStudentImages(s: StudentProps) {
  new Image().src = `https://schaledb.com/images/student/portrait/${s.Id}.webp`;
  if (s.CollectionBG) {
    new Image().src = `https://schaledb.com/images/background/${s.CollectionBG}.jpg`;
  }
}

// Navigation
function navigateToPrevious() {
  if (!props.studentsArray || !props.student || props.studentsArray.length <= 1) return;
  const currentIndex = props.studentsArray.findIndex(s => s.Id === props.student?.Id);
  const previousIndex = currentIndex > 0 ? currentIndex - 1 : props.studentsArray.length - 1;
  emit('navigate', props.studentsArray[previousIndex]);
}

function navigateToNext() {
  if (!props.studentsArray || !props.student || props.studentsArray.length <= 1) return;
  const currentIndex = props.studentsArray.findIndex(s => s.Id === props.student?.Id);
  const nextIndex = currentIndex < props.studentsArray.length - 1 ? currentIndex + 1 : 0;
  emit('navigate', props.studentsArray[nextIndex]);
}

async function handleClose() {
  (document.activeElement as HTMLElement)?.blur();
  await saveUpgradeBeforeClose();
  closeModal();
}

function handleStyleToggle() {
  if (!displayedStudent.value) return;
  const partnerId = getLinkedPartnerId(displayedStudent.value.Id);
  if (!partnerId) return;
  activeStyleId.value = activeStyleId.value === partnerId ? null : partnerId;
}

// ── Apply Upgrade panel positioning ─────────────────────────────────────────

async function openApplyPanel(event: MouseEvent) {
  const btn = event.currentTarget as HTMLElement;
  applyPanelStyle.value = positionAtElement(btn);
  showApplyPanel.value = true;
  await nextTick();
  applyPanelStyle.value = positionAtElement(btn, applyPanelWrapper.value);
}

function toggleApplyPanel(event: MouseEvent) {
  if (showApplyPanel.value) {
    showApplyPanel.value = false;
  } else {
    openApplyPanel(event);
  }
}

// ── Apply Upgrade ────────────────────────────────────────────────────────────

// Conservative material check: all pending materials vs inventory
const insufficientList = computed<string[]>(() => {
  const allMats = [
    ...allMaterialsNeeded.value,
    ...equipmentMaterialsNeeded.value,
  ];
  // Aggregate quantities by ID
  const needed = new Map<number, { name: string; qty: number; isEquip: boolean }>();
  for (const mat of allMats) {
    const id = mat.material.Id;
    const isEquip = mat.type === 'equipments';
    const ex = needed.get(id);
    if (ex) {
      ex.qty += mat.materialQuantity;
    } else {
      needed.set(id, { name: mat.material.Name, qty: mat.materialQuantity, isEquip });
    }
  }
  const out: string[] = [];
  for (const [id, { name, qty, isEquip }] of needed.entries()) {
    const owned = isEquip
      ? (equipmentFormData.value[id] ?? 0)
      : (itemFormData.value[id] ?? 0);
    if (owned < qty) out.push(name);
  }
  // Check EXP sufficiency (activity reports for level, XP balls for equipment)
  const levelPending = (characterLevels.value.current ?? 1) < (characterLevels.value.target ?? 1);
  if (levelPending) {
    const xpNeeded = computeCharacterXpCost(characterLevels.value.current, characterLevels.value.target);
    const ownedXp  = getCharXpItems(id => itemFormData.value[id] ?? 0)
      .reduce((s, item) => s + item.owned * item.xpValue, 0);
    if (ownedXp < xpNeeded) out.push('Activity Report');
  }

  const equipPending = Object.values(equipmentLevels.value).some(e => e && e.current < e.target);
  if (equipPending) {
    const xpNeeded = computeEquipmentXpCost(equipmentLevels.value);
    const ownedXp  = getEquipXpItems(id => equipmentFormData.value[id] ?? 0)
      .reduce((s, item) => s + item.owned * item.xpValue, 0);
    if (ownedXp < xpNeeded) out.push('Equipment XP');
  }

  return out;
});

const hasSufficientMaterials = computed(() => insufficientList.value.length === 0);

const materialsPreview = computed<Material[]>(() => {
  const map = new Map<number, Material>();
  const add = (mats: Material[]) => {
    for (const m of mats) {
      const id = m.material.Id;
      const ex = map.get(id);
      if (ex) {
        ex.materialQuantity += m.materialQuantity;
      } else {
        map.set(id, { ...m });
      }
    }
  };
  add(allMaterialsNeeded.value);
  add(equipmentMaterialsNeeded.value);
  return Array.from(map.values()).filter(m => m.materialQuantity > 0);
});

const confirmPreviewItems = computed<MaterialPreviewItem[]>(() => {
  const result: MaterialPreviewItem[] = [];

  // Regular materials (aggregated by ID, enriched with owned + remaining)
  materialsPreview.value.forEach(m => {
    const id = m.material.Id;
    const owned = m.type === 'equipments'
      ? (equipmentFormData.value[id] ?? 0)
      : (itemFormData.value[id] ?? 0);
    result.push({
      material: m.material,
      needed: m.materialQuantity,
      owned,
      remaining: owned - m.materialQuantity,
      type: m.type ?? 'materials',
    });
  });

  // Char XP items — only when 'level' is selected
  if (pendingSelectedIds.value.includes('level')) {
    const cost = computeCharacterXpCost(
      characterLevels.value.current, characterLevels.value.target
    );
    if (cost > 0) {
      const charItems = getCharXpItems(id => itemFormData.value[id] ?? 0);
      const consumed  = simulateXpDeduction(cost, charItems);
      charItems.forEach((item, i) => {
        if (consumed[i] <= 0) return;
        const mat = getResourceDataByIdSync(item.id);
        if (!mat) return;
        result.push({
          material: mat,
          needed: consumed[i],
          owned: item.owned,
          remaining: item.owned - consumed[i],
          type: 'xp',
        });
      });
    }
  }

  // Equip XP items — only when 'equipment' is selected
  if (pendingSelectedIds.value.includes('equipment')) {
    const cost = computeEquipmentXpCost(equipmentLevels.value);
    if (cost > 0) {
      const equipItems = getEquipXpItems(id => equipmentFormData.value[id] ?? 0);
      const consumed   = simulateXpDeduction(cost, equipItems);
      equipItems.forEach((item, i) => {
        if (consumed[i] <= 0) return;
        const mat = getEquipmentDataByIdSync(item.id);
        if (!mat) return;
        result.push({
          material: mat,
          needed: consumed[i],
          owned: item.owned,
          remaining: item.owned - consumed[i],
          type: 'xp',
        });
      });
    }
  }

  return result;
});

const hasAnyPendingUpgrade = computed(() => {
  if ((characterLevels.value.current ?? 1) < (characterLevels.value.target ?? 1)) return true;
  if (Object.values(skillLevels.value).some(s => s.current < s.target)) return true;
  if (Object.values(potentialLevels.value).some(p => p.current < p.target)) return true;
  if (Object.values(equipmentLevels.value).some(e => e && e.current < e.target)) return true;
  if ((gradeLevels.value.current ?? 1) < (gradeLevels.value.target ?? 1)) return true;
  if ((exclusiveGearLevel.value.current ?? 0) < (exclusiveGearLevel.value.target ?? 0)) return true;
  return false;
});

function applyMaterialDelta(snapshot: Material[], afterMap: Map<number, number>) {
  for (const mat of snapshot) {
    const deducted = mat.materialQuantity - (afterMap.get(mat.material.Id) ?? 0);
    if (deducted <= 0) continue;
    const id = mat.material.Id;
    if (mat.type === 'equipments') {
      equipmentFormData.value[id] = Math.max(0, (equipmentFormData.value[id] ?? 0) - deducted);
    } else {
      itemFormData.value[id] = Math.max(0, (itemFormData.value[id] ?? 0) - deducted);
    }
  }
}

function handleApplySelected(selectedIds: SectionId[]) {
  pendingSelectedIds.value = selectedIds;
  showApplyPanel.value = false;
  showConfirmModal.value = true;
}

function doApplyUpgrade() {
  const selectedIds = pendingSelectedIds.value;

  // 0. Snapshot XP costs BEFORE levels change (step 2 sets current = target)
  const charXpCost = selectedIds.includes('level')
    ? computeCharacterXpCost(characterLevels.value.current, characterLevels.value.target)
    : 0;
  const equipXpCost = selectedIds.includes('equipment')
    ? computeEquipmentXpCost(equipmentLevels.value)
    : 0;

  // 1. Snapshot materials BEFORE applying level changes
  const beforeUpgrade = [...allMaterialsNeeded.value];
  const beforeGear    = [...equipmentMaterialsNeeded.value];

  // 2. Apply: set current = target for each selected section
  if (selectedIds.includes('level')) {
    characterLevels.value.current = characterLevels.value.target;
  }
  if (selectedIds.includes('skills')) {
    Object.keys(skillLevels.value).forEach(t => {
      const sk = skillLevels.value[t as SkillType];
      if (sk) sk.current = sk.target;
    });
  }
  if (selectedIds.includes('potential')) {
    Object.keys(potentialLevels.value).forEach(t => {
      const pt = potentialLevels.value[t as PotentialType];
      if (pt) pt.current = pt.target;
    });
  }
  if (selectedIds.includes('equipment')) {
    Object.keys(equipmentLevels.value).forEach(t => {
      const eq = equipmentLevels.value[t as EquipmentType];
      if (eq) eq.current = eq.target;
    });
  }
  if (selectedIds.includes('grade')) {
    gradeLevels.value.current = gradeLevels.value.target;
  }
  if (selectedIds.includes('exclusive') && exclusiveGearLevel.value.current !== undefined) {
    exclusiveGearLevel.value.current = exclusiveGearLevel.value.target ?? 0;
  }

  // 3. Read materials AFTER (computed reacts synchronously on next read)
  const afterUpgrade = new Map(allMaterialsNeeded.value.map(m => [m.material.Id, m.materialQuantity]));
  const afterGear    = new Map(equipmentMaterialsNeeded.value.map(m => [m.material.Id, m.materialQuantity]));

  // 4. Deduct the delta from inventory (watchers auto-persist to IndexedDB)
  applyMaterialDelta(beforeUpgrade, afterUpgrade);
  applyMaterialDelta(beforeGear, afterGear);

  // 5. Deduct EXP items (greedy coin-change, highest-value first)
  if (charXpCost > 0) {
    deductXpItems(
      charXpCost,
      getCharXpItems(id => itemFormData.value[id] ?? 0),
      (id, qty) => { itemFormData.value[id] = qty; },
    );
  }
  if (equipXpCost > 0) {
    deductXpItems(
      equipXpCost,
      getEquipXpItems(id => equipmentFormData.value[id] ?? 0),
      (id, qty) => { equipmentFormData.value[id] = qty; },
    );
  }

  showConfirmModal.value = false;
  pendingSelectedIds.value = [];
}

function setActiveTab(nextTab: ModalTab) {
  if (nextTab === activeTab.value) return;
  tabDirection.value = MODAL_TAB_ORDER[nextTab] >= MODAL_TAB_ORDER[activeTab.value]
    ? 'forward'
    : 'backward';
  activeTab.value = nextTab;
}

async function toggleOwnership() {
  if (!displayedStudent.value) return;
  await setOwned(displayedStudent.value.Id, !isOwned.value);
}

// Auto-reset to Info tab when a student becomes unowned or when unowned student is opened
watch(isOwned, (owned) => {
  if (!owned && activeTab.value !== 'info') {
    activeTab.value = 'info';
  }
});

// Keyboard
function handleKeyDown(event: KeyboardEvent) {
  if (!props.isVisible) return;

  // If apply panel is open, Escape closes it first
  if (showApplyPanel.value) {
    if (event.key === 'Escape') {
      showApplyPanel.value = false;
      event.preventDefault();
    }
    return;
  }

  // If inventory modal is open, Escape closes it first
  if (isInventoryOpen.value) {
    if (event.key === 'Escape') {
      isInventoryOpen.value = false;
      event.preventDefault();
    }
    return;
  }

  // Don't hijack arrows when user is typing in an input
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    if (event.key === 'Escape') {
      handleClose();
      event.preventDefault();
    }
    return;
  }

  if (event.key === 'ArrowLeft') {
    navigateToPrevious();
    event.preventDefault();
  } else if (event.key === 'ArrowRight') {
    navigateToNext();
    event.preventDefault();
  } else if (event.key === 'Escape') {
    handleClose();
    event.preventDefault();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

// Centralized hydration flow: initialize defaults once, then load all hook data together.
watch([() => props.isVisible, () => props.student], async ([visible, student]) => {
  if (!visible || !student) return;

  activeStyleId.value = null;
  const requestToken = ++hydrateRequestToken;

  try {
    const formData = await initializeStudentFormData(student);
    if (requestToken !== hydrateRequestToken) return;

    setStudentDataDirect(student.Id, formData);

    await Promise.all([
      loadGiftData(),
      loadUpgradeData(),
      loadGearData(),
      loadItems(),
      loadEquipments()
    ]);

    if (requestToken !== hydrateRequestToken) return;
    displayedStudent.value = student;

    // Preload neighbor images so next/prev navigation is near-instant
    if (props.studentsArray && props.studentsArray.length > 1) {
      const idx = props.studentsArray.findIndex(s => s.Id === student.Id);
      if (idx !== -1) {
        const prevIdx = idx > 0 ? idx - 1 : props.studentsArray.length - 1;
        const nextIdx = idx < props.studentsArray.length - 1 ? idx + 1 : 0;
        preloadStudentImages(props.studentsArray[prevIdx]);
        preloadStudentImages(props.studentsArray[nextIdx]);
      }
    }
  } finally {
    // no-op: previous student remains displayed until hydrate completes
  }
}, { immediate: true });
</script>

<template>
  <div
    v-if="isVisible"
    class="fullscreen-modal"
    :class="{ 'modal-origin-ready': hasOriginMorph }"
    :style="modalOriginStyle"
  >
    <!-- TOP ROW: Title + Actions (above tabs) -->
    <div class="modal-header-row">
      <div class="modal-title">
        {{ $t('studentDetails') }}
      </div>
      <div class="modal-header-actions">
        <button class="header-action-btn inventory-btn" @click="isInventoryOpen = true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/>
          </svg>
          {{ $t('inventory') }}
        </button>
        <button class="header-action-btn close-btn" @click="handleClose" :title="$t('close')">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- MIDDLE: Active Tab Content -->
    <div class="modal-body">
      <div v-if="displayedStudent" class="modal-grid">
        <div class="tab-content">
          <div class="left-column">
            <ModalHeader class="student-hero-card" :student="activeStyleStudent!" />
          </div>

          <div
            class="right-column right-column--scrollable"
            :class="{ 'right-column--bond': activeTab === 'bond' }"
          >
            <MetaHeader
              :student="activeStyleStudent!"
              :character-levels="characterLevels"
              :current-bond="currentBond"
              :new-bond-level="newBondLevel"
              :has-style-switch="hasStyleSwitch"
              :active-style-id="activeStyleId ?? displayedStudent?.Id"
              :primary-student-id="displayedStudent?.Id"
              @toggle-style="handleStyleToggle"
            />

            <!-- Status bars row: Recruitment | Apply Upgrade -->
            <div class="status-bars-row">
              <!-- Recruitment -->
              <div class="recruitment-bar" :class="{ 'recruitment-bar--unowned': !isOwned }">
                <span class="recruitment-status">
                  {{ isOwned ? $t('ownership.recruited') : $t('ownership.notRecruited') }}
                </span>
                <button class="recruitment-toggle-btn" type="button" @click="toggleOwnership">
                  {{ isOwned ? $t('ownership.markNotRecruited') : $t('ownership.markRecruited') }}
                </button>
              </div>

              <!-- Apply Upgrade -->
              <div v-if="isOwned" class="upgrade-bar">
                <span class="upgrade-bar-label">Progression</span>
                <button
                  class="apply-upgrade-btn"
                  type="button"
                  :disabled="!hasAnyPendingUpgrade"
                  @click="toggleApplyPanel($event)"
                >
                  Apply Upgrade
                </button>
              </div>
            </div>

            <div class="modal-tabs">
              <button
                :class="['tab-button', { active: activeTab === 'info' }]"
                @click="setActiveTab('info')"
              >
                {{ $t('info') }}
              </button>
              <button
                :class="['tab-button', { active: activeTab === 'bond', 'tab-button--disabled': !isOwned }]"
                :disabled="!isOwned"
                @click="isOwned ? setActiveTab('bond') : undefined"
              >
                {{ $t('bond') }}
              </button>
              <button
                :class="['tab-button', { active: activeTab === 'upgrade', 'tab-button--disabled': !isOwned }]"
                :disabled="!isOwned"
                @click="isOwned ? setActiveTab('upgrade') : undefined"
              >
                {{ $t('upgrade') }}
              </button>
              <button
                :class="['tab-button', { active: activeTab === 'gear', 'tab-button--disabled': !isOwned }]"
                :disabled="!isOwned"
                @click="isOwned ? setActiveTab('gear') : undefined"
              >
                {{ $t('gear') }}
              </button>
            </div>

            <Transition :name="activeTabTransitionName" mode="out-in">
              <div :key="activeTabTransitionKey" class="tab-pane-state">
                <template v-if="activeTab === 'info'">
                  <div class="tab-pane-scroll tab-pane-scroll--info">
                    <InfoSkills
                      :student="activeStyleStudent!"
                      :skill-levels="skillLevels"
                    />

                    <InfoWeapon
                      :student="activeStyleStudent!"
                      :grade-levels="gradeLevels"
                      :equipment-levels="equipmentLevels"
                      :exclusive-gear-level="exclusiveGearLevel"
                    />

                    <InfoGear
                      :student="displayedStudent"
                      :grade-levels="gradeLevels"
                      :equipment-levels="equipmentLevels"
                      :exclusive-gear-level="exclusiveGearLevel"
                      :has-exclusive-gear="hasExclusiveGear"
                    />
                  </div>
                </template>

                <template v-else-if="activeTab === 'bond'">
                  <div class="bond-layout" :class="{ 'bond-layout-max': currentBond === 100 }">
                    <div class="bond-top-row">
                      <BondSection
                        class="bond-panel"
                        :class="{ 'bond-panel-full': currentBond === 100 }"
                        :current-bond="currentBond"
                        :new-bond-level="newBondLevel"
                        :remaining-xp="bondRemainingXp"
                        :total-exp="totalCumulativeExp"
                        @update-bond="handleBondInput"
                      />

                      <GiftOption
                        v-if="currentBond < 100"
                        class="bond-options-panel"
                        @toggle-convert="convertBoxes"
                        @auto-fill-gift="autoFillGifts"
                        @reset-gifts="resetGifts"
                        @undo-changes="undoChanges"
                      />
                    </div>

                    <div v-if="currentBond < 100" class="bond-gift-scroll">
                      <GiftGrid
                        class="bond-gift-grid"
                        :student="displayedStudent!"
                        :gift-form-data="giftFormData"
                        :box-form-data="boxFormData"
                        :should-show-gift-grade="shouldShowGiftGrade"
                        @update-gift="handleGiftInput"
                        @update-box="handleBoxInput"
                      />
                    </div>
                  </div>
                </template>

                <template v-else-if="activeTab === 'upgrade'">
                  <div class="tab-pane-scroll tab-pane-scroll--upgrade">
                    <LevelSection
                      class="upgrade-level-panel"
                      :character-levels="characterLevels"
                      :total-xp-needed="characterRemainingXp"
                      @update-level="handleLevelUpdate"
                    />

                    <SkillSection
                      :student="activeStyleStudent!"
                      :skill-levels="skillLevels"
                      :all-skills-maxed="allSkillsMaxed"
                      :target-skills-maxed="targetSkillsMaxed"
                      @update-skill="handleSkillUpdate"
                      @toggle-max-skills="toggleMaxAllSkills"
                      @toggle-max-target="toggleMaxTargetSkills"
                    />

                    <PotentialSection
                      :potential-levels="potentialLevels"
                      :all-potentials-maxed="allPotentialsMaxed"
                      :target-potentials-maxed="targetPotentialsMaxed"
                      @update-potential="handlePotentialUpdate"
                      @toggle-max-potentials="toggleMaxAllPotentials"
                      @toggle-max-target-potentials="toggleMaxTargetPotentials"
                    />

                    <MaterialsSection
                      :materials="allMaterialsNeeded"
                    />
                  </div>
                </template>

                <template v-else>
                  <div class="tab-pane-scroll tab-pane-scroll--gear">
                    <ElephEligmaSection
                      v-if="(gradeLevels.current ?? 1) < 9"
                      :student="displayedStudent"
                      :eleph-needed="getElephsForGrade(gradeLevels.current ?? 1, gradeLevels.target ?? 1, gradeInfos?.owned ?? 0)"
                      :grade-infos="gradeInfos"
                      @update-info="handleGradeInfoUpdate"
                    />

                    <EquipmentGrowthSection
                      :student="displayedStudent"
                      :equipment-levels="equipmentLevels"
                      :exclusive-gear-level="exclusiveGearLevel"
                      :has-exclusive-gear="hasExclusiveGear"
                      :max-unlockable-gear-tier="maxUnlockableGearTier"
                      :all-gears-maxed="allGearsMaxed"
                      :target-gears-maxed="targetGearsMaxed"
                      @update-equipment="handleEquipmentUpdate"
                      @update-exclusive-gear="handleExclusiveGearUpdate"
                      @toggle-max-gears="toggleMaxAllGears"
                      @toggle-max-target-gears="toggleMaxTargetGears"
                    />

                    <ExclusiveWeaponSection
                      :student="activeStyleStudent!"
                      :grade-levels="gradeLevels"
                      @update-grade="handleGradeUpdate"
                    />

                    <MaterialsSection
                      :materials="equipmentMaterialsNeeded"
                      :is-equipment-tab="true"
                    />
                  </div>
                </template>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- BOTTOM: Student Strip -->
    <StudentStrip
      v-if="studentsArray && studentsArray.length > 0"
      :students="studentsArray"
      :active-student-id="displayedStudent?.Id"
      @select-student="(s) => emit('navigate', s)"
      @navigate-prev="navigateToPrevious"
      @navigate-next="navigateToNext"
    />

    <!-- Level 2: Global Inventory Modal -->
    <Transition name="inventory-modal-shell">
      <GlobalInventoryModal
        v-if="isInventoryOpen"
        :resource-form-data="itemFormData"
        :equipment-form-data="equipmentFormData"
        @close="isInventoryOpen = false"
        @update-resource="handleItemInput"
        @update-equipment="handleEquipmentInput"
      />
    </Transition>

    <!-- Apply Upgrade panel — teleported to body for viewport-aware positioning -->
    <Teleport to="body">
      <template v-if="displayedStudent && showApplyPanel">
        <div class="apply-panel-backdrop" @click="showApplyPanel = false" />
        <div ref="applyPanelWrapper" class="apply-panel-wrapper" :style="applyPanelStyle">
          <ApplyUpgradePanel
            :student="displayedStudent"
            :character-levels="characterLevels"
            :skill-levels="skillLevels"
            :potential-levels="potentialLevels"
            :equipment-levels="equipmentLevels"
            :grade-levels="gradeLevels"
            :exclusive-gear-level="exclusiveGearLevel"
            :has-sufficient-materials="hasSufficientMaterials"
            :insufficient-list="insufficientList"
            @apply="handleApplySelected"
            @close="showApplyPanel = false"
          />
        </div>
      </template>
    </Teleport>

    <!-- Confirmation modal — shown after Apply is clicked in ApplyUpgradePanel -->
    <ApplyConfirmModal
      v-if="showConfirmModal"
      :preview-items="confirmPreviewItems"
      @confirm="doApplyUpgrade"
      @cancel="showConfirmModal = false; pendingSelectedIds = []"
    />
  </div>
</template>

<style scoped>
.fullscreen-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: var(--background-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* TOP ROW: Title + Actions */
.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-primary);
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.15s ease;
}

.header-action-btn:hover {
  background: var(--hover-bg);
  border-color: var(--accent-color);
}

.close-btn {
  padding: 6px 8px;
  border-color: transparent;
  background: transparent;
}

.close-btn:hover {
  background: rgba(255, 80, 80, 0.1);
  color: #ff5050;
  border-color: transparent;
}

/* BODY: Tab content area */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 15px 20px;
}

.modal-grid {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}


/* Status bars row: Recruitment + Apply Upgrade side-by-side */
.status-bars-row {
  display: flex;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  background: var(--background-secondary);
  flex-shrink: 0;
}

.recruitment-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--border-color);
}

.recruitment-bar--unowned {
  background: rgba(120, 120, 120, 0.08);
}

/* Upgrade bar (right half) */
.upgrade-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  flex: 1;
  min-width: 0;
}

.upgrade-bar-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.apply-upgrade-btn {
  font-size: 0.78rem;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  flex-shrink: 0;
  white-space: nowrap;
}
.apply-upgrade-btn:hover:not(:disabled) {
  border-color: var(--accent-color);
  color: var(--accent-color);
}
.apply-upgrade-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.apply-panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
}

.apply-panel-wrapper {
  position: fixed;
  z-index: 201;
}

@media (max-width: 480px) {
  .apply-panel-wrapper {
    top: auto !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0;
  }
}

.recruitment-status {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.recruitment-bar--unowned .recruitment-status {
  color: var(--text-secondary);
}

.recruitment-toggle-btn {
  font-size: 0.78rem;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  flex-shrink: 0;
}

.recruitment-toggle-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

/* Disabled tab styling for unowned students */
.tab-button--disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.tab-button--disabled:hover {
  background: transparent !important;
  color: inherit !important;
}

@media (max-width: 576px) {
  .modal-header-row {
    padding: 8px 12px;
  }

  .modal-body {
    padding: 10px;
  }

  .inventory-btn span {
    display: none;
  }
}
</style>
