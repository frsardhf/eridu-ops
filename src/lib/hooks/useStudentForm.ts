import { ref, computed, watch, type Ref } from 'vue';
import { StudentProps } from '../../types/student';
import {
  CharacterLevels, SkillLevels, SkillType, PotentialLevels, PotentialType,
  DEFAULT_CHARACTER_LEVELS, DEFAULT_SKILL_LEVELS, DEFAULT_POTENTIAL_LEVELS,
  Material,
} from '../../types/upgrade';
import {
  EquipmentLevels, EquipmentType, GradeLevels, GradeInfos, ExclusiveGearLevel,
} from '../../types/gear';
import {
  BondDetailDataProps, DEFAULT_BOND_DETAIL,
  OtherExpDataProps, DEFAULT_OTHER_EXP,
} from '../../types/gift';
import { loadFormDataToRefs, saveFormData } from '../utils/studentStorage';
import { setStudentDataDirect, studentDataStore } from '../stores/studentStore';
import { updateMaterialsData } from '../stores/materialsStore';
import { updateGearsData, getAllGearsData } from '../stores/gearsStore';
import { calculateAllMaterials } from '../utils/upgradeMaterialUtils';
import { calculateAllGears, getMaxTierForTypeSync } from '../utils/gearMaterialUtils';
import { MAX_POTENTIAL_LEVEL } from '../utils/upgradeUtils';
import { calculateGiftStackExp, computeCafeDays, computeCafeExp } from '../utils/bondExpUtils';
import { getAllItemsFromCache, getResourceDataByIdSync } from '../stores/resourceCacheStore';
import {
  SELECTOR_BOX_ID, SR_GIFT_MATERIAL_ID, SSR_GIFT_MATERIAL_ID, YELLOW_STONE_ID,
} from '../../types/resource';
import { BOX_ITEM_IDS } from '../constants/giftConstants';
import { getAllocatedGifts } from './useGiftCalculation';
import { useDebouncedFormPersistence } from './useDebouncedFormPersistence';
import bondData from '../../data/data.json';

/**
 * Consolidated per-student form hook.
 *
 * Replaces useStudentUpgrade + useStudentGear + useStudentGifts. The three
 * predecessors each owned a slice of the same `forms[studentId]` IndexedDB
 * row and ran independent debounced persistence cycles; with their watchers
 * firing in the same tick (e.g. ApplyUpgrade mutates upgrade AND gear refs
 * together), concurrent get-merge-put saves could clobber each other's keys.
 *
 * This hook holds ALL per-student form state behind ONE persistence cycle,
 * so a single save writes the full row atomically. No cross-hook race exists
 * because there are no cross-hooks anymore.
 *
 * The exposed API is a union of the three predecessors' surfaces with two
 * disambiguating renames:
 *   - `characterRemainingXp` (was `remainingXp` in useStudentUpgrade)
 *   - `remainingXp` (kept the gifts hook's meaning: bond XP to next level)
 */

const HISTORY_LIMIT = 10;

interface GiftSnapshot {
  giftFormData:     Record<string, number>;
  boxFormData:      Record<string, number>;
  nonFavorGiftsMap: Record<number, number>;
}

export interface UseStudentFormOptions {
  /** Persistence gate — saves are skipped when this returns false. Defaults to always-visible. */
  isVisible?: () => boolean;
  /** Optional close hook fired by `closeModal()`. */
  onClose?:   () => void;
}

export function useStudentForm(
  studentRef: Ref<StudentProps>,
  opts: UseStudentFormOptions = {},
) {
  const student = () => studentRef.value;
  const characterXpTable = bondData.character_xp;
  const bondXpTable      = bondData.bond_xp;

  // ── Form refs (everything that persists to `forms[studentId]`) ─────────────
  // Upgrade slice
  const characterLevels = ref<CharacterLevels>({ ...DEFAULT_CHARACTER_LEVELS });
  const skillLevels     = ref<SkillLevels>({ ...DEFAULT_SKILL_LEVELS });
  const potentialLevels = ref<PotentialLevels>({ ...DEFAULT_POTENTIAL_LEVELS });

  // Gear slice
  const equipmentLevels    = ref<EquipmentLevels>({});
  const gradeLevels        = ref<GradeLevels>({});
  const gradeInfos         = ref<GradeInfos>({});
  const exclusiveGearLevel = ref<ExclusiveGearLevel>({});

  // Gifts + bond slice
  const giftFormData     = ref<Record<string, number>>({});
  const boxFormData      = ref<Record<string, number>>({});
  const nonFavorGiftsMap = ref<Record<number, number>>({});
  const bondDetailData   = ref<BondDetailDataProps>({ ...DEFAULT_BOND_DETAIL });
  const otherExpData     = ref<OtherExpDataProps>({ ...DEFAULT_OTHER_EXP });

  // ── Transient (non-persisted) state ────────────────────────────────────────
  const allSkillsMaxed         = ref(false);
  const targetSkillsMaxed      = ref(false);
  const allPotentialsMaxed     = ref(false);
  const targetPotentialsMaxed  = ref(false);
  const allGearsMaxed          = ref(false);
  const targetGearsMaxed       = ref(false);

  const isCalculating          = ref(false);
  const showConvertModal       = ref(false);
  const convertModalNeeded     = ref(0);
  const showSyncGiftsModal     = ref(false);
  const undoStack              = ref<GiftSnapshot[]>([]);
  const redoStack              = ref<GiftSnapshot[]>([]);

  // ── Defaults (built once per mount; student switching expects remount) ─────
  // Equipment defaults follow the student's Equipment slot list. Built lazily
  // here at hook construction time; if the studentRef swaps mid-mount the
  // defaults stay tied to the original student. Both StudentModal and
  // BondsStudentEditor key their hook calls per student so this is fine.
  const defaultEquipmentLevels: EquipmentLevels = {};
  (student()?.Equipment ?? []).forEach(type => {
    defaultEquipmentLevels[type as EquipmentType] = { current: 1, target: 1 };
  });
  const starGrade = student()?.StarGrade ?? 1;

  const FORM_DEFAULTS = {
    characterLevels:    { ...DEFAULT_CHARACTER_LEVELS } as CharacterLevels,
    skillLevels:        { ...DEFAULT_SKILL_LEVELS }     as SkillLevels,
    potentialLevels:    { ...DEFAULT_POTENTIAL_LEVELS } as PotentialLevels,
    equipmentLevels:    defaultEquipmentLevels,
    gradeLevels:        { current: starGrade, target: starGrade } as GradeLevels,
    gradeInfos:         { owned: 0, price: 1, purchasable: 20 } as GradeInfos,
    exclusiveGearLevel: { current: 0, target: 0 } as ExclusiveGearLevel,
    giftFormData:       {} as Record<string, number>,
    boxFormData:        {} as Record<string, number>,
    nonFavorGiftsMap:   {} as Record<number, number>,
    bondDetailData:     { ...DEFAULT_BOND_DETAIL } as BondDetailDataProps,
    otherExpData:       { ...DEFAULT_OTHER_EXP }   as OtherExpDataProps,
  };

  // ── Persistence (single debounced flush, single load, single token guard) ──
  const { loadNow: loadFromIndexedDB, flushNow: saveToIndexedDB } =
    useDebouncedFormPersistence({
      isVisible: opts.isVisible ?? (() => true),
      refs: {
        characterLevels, skillLevels, potentialLevels,
        equipmentLevels, gradeLevels, gradeInfos, exclusiveGearLevel,
        giftFormData, boxFormData, nonFavorGiftsMap,
        bondDetailData, otherExpData,
      },
      defaults: FORM_DEFAULTS,
      loadFn:   (staged) => loadFormDataToRefs(student().Id, staged, FORM_DEFAULTS),
      saveFn:   () => saveFormData(student().Id, {
        characterLevels:    characterLevels.value,
        skillLevels:        skillLevels.value,
        potentialLevels:    potentialLevels.value,
        equipmentLevels:    { ...equipmentLevels.value },
        gradeLevels:        { ...gradeLevels.value },
        gradeInfos:         { ...gradeInfos.value },
        exclusiveGearLevel: { ...exclusiveGearLevel.value },
        giftFormData:       giftFormData.value,
        boxFormData:        boxFormData.value,
        nonFavorGiftsMap:   nonFavorGiftsMap.value,
        bondDetailData:     bondDetailData.value,
        otherExpData:       otherExpData.value,
      }),
      onSaved:  (saved) => setStudentDataDirect(student().Id, saved),
      afterLoad: () => {
        // Clear undo history so loaded state isn't undoable.
        undoStack.value = [];
        redoStack.value = [];
      },
      watchSources: [
        characterLevels, skillLevels, potentialLevels,
        equipmentLevels, gradeLevels, gradeInfos, exclusiveGearLevel,
        giftFormData, boxFormData, nonFavorGiftsMap,
        bondDetailData, otherExpData,
      ],
    });

  // ── Maxed-state watchers ──────────────────────────────────────────────────
  const checkAllSkillsMaxed = () =>
    Object.entries(skillLevels.value).every(([type, levels]) => {
      const max = student()?.Skills?.[type]?.Parameters?.[0]?.length;
      return levels.current === max && levels.target === max;
    });
  const checkTargetSkillsMaxed = () =>
    Object.entries(skillLevels.value).every(([type, levels]) => {
      const max = student()?.Skills?.[type]?.Parameters?.[0]?.length;
      return levels.target === max;
    });
  const checkAllPotentialsMaxed = () =>
    Object.values(potentialLevels.value).every(l =>
      l.current === MAX_POTENTIAL_LEVEL && l.target === MAX_POTENTIAL_LEVEL,
    );
  const checkTargetPotentialsMaxed = () =>
    Object.values(potentialLevels.value).every(l => l.target === MAX_POTENTIAL_LEVEL);

  watch(skillLevels, () => {
    allSkillsMaxed.value    = checkAllSkillsMaxed();
    targetSkillsMaxed.value = checkTargetSkillsMaxed();
  }, { deep: true });

  watch(potentialLevels, () => {
    allPotentialsMaxed.value    = checkAllPotentialsMaxed();
    targetPotentialsMaxed.value = checkTargetPotentialsMaxed();
  }, { deep: true });

  const checkAllGearsMaxed = () => {
    return (student()?.Equipment ?? []).every((type) => {
      const max = getMaxTierForTypeSync(type);
      const levels = equipmentLevels.value[type as EquipmentType];
      return levels?.current === max && levels?.target === max;
    });
  };
  const checkTargetGearsMaxed = () => {
    return (student()?.Equipment ?? []).every((type) => {
      const max = getMaxTierForTypeSync(type);
      const levels = equipmentLevels.value[type as EquipmentType];
      return levels?.target === max;
    });
  };

  watch(equipmentLevels, () => {
    allGearsMaxed.value    = checkAllGearsMaxed();
    targetGearsMaxed.value = checkTargetGearsMaxed();
  }, { deep: true });

  // ── Material aggregates ────────────────────────────────────────────────────
  const allMaterialsNeeded = computed<Material[]>(() =>
    calculateAllMaterials(
      student(),
      characterLevels.value,
      skillLevels.value,
      potentialLevels.value,
    ),
  );

  const equipmentMaterialsNeeded = computed<Material[]>(() =>
    calculateAllGears(
      student(),
      equipmentLevels.value,
      gradeLevels.value,
      gradeInfos.value,
      exclusiveGearLevel.value,
    ),
  );

  // Update aggregate stores when calcs change (side effects belong in watchers).
  watch(allMaterialsNeeded, (mats) => {
    updateMaterialsData(student().Id, mats);
  }, { immediate: true });

  watch(equipmentMaterialsNeeded, (mats) => {
    updateGearsData(student().Id, mats);
  }, { immediate: true });

  // ── Exclusive gear ────────────────────────────────────────────────────────
  const hasExclusiveGear = computed(() => {
    const gear = student()?.Gear;
    return !!(gear && Object.keys(gear).length > 0);
  });

  // Bond gates for exclusive weapon unlocks read from local bondDetailData so
  // they react immediately to inline edits (the predecessor useStudentGear
  // pulled from studentDataStore, which lagged behind the local ref).
  const canUnlockT1 = computed(() => bondDetailData.value.currentBond > 15);
  const canUnlockT2 = computed(() => bondDetailData.value.currentBond >= 20);

  const maxUnlockableGearTier = computed(() => {
    if (!hasExclusiveGear.value) return 0;
    if (canUnlockT2.value) return 2;
    if (canUnlockT1.value) return 1;
    return 0;
  });

  // ── XP / Bond computeds ────────────────────────────────────────────────────
  const characterRemainingXp = computed(() => {
    const currentXp = characterXpTable[characterLevels.value.current - 1] ?? 0;
    const targetXp  = characterXpTable[characterLevels.value.target  - 1] ?? 0;
    return Math.max(0, targetXp - currentXp);
  });

  const giftsExp = computed(() => calculateGiftStackExp(student().Gifts, giftFormData.value));
  const boxesExp = computed(() => calculateGiftStackExp(student().Boxes, boxFormData.value));
  const cafeDays = computed(() =>
    computeCafeDays(
      otherExpData.value.cafeStartDateIso,
      otherExpData.value.cafeTargetDateIso,
      otherExpData.value.cafeDateInclusive,
    ),
  );
  const cafeExp  = computed(() => computeCafeExp(otherExpData.value.cafeTapsPerDay, cafeDays.value));
  const bonusExp = computed(() => Math.max(0, otherExpData.value.bonusExp || 0));

  const totalCumulativeExp = computed(() =>
    giftsExp.value + boxesExp.value + cafeExp.value + bonusExp.value,
  );

  const newBondLevel = computed(() => {
    if (bondDetailData.value.currentBond >= 100) return 100;
    if (totalCumulativeExp.value <= 0) return bondDetailData.value.currentBond;

    const currentLevelCumulativeXp = bondXpTable[bondDetailData.value.currentBond - 1] ?? 0;
    const totalXp = currentLevelCumulativeXp + totalCumulativeExp.value;

    let newLevel = bondDetailData.value.currentBond;
    for (let i = bondDetailData.value.currentBond; i < 100; i++) {
      if (totalXp >= bondXpTable[i]) newLevel = i + 1;
      else break;
    }
    return newLevel;
  });

  const remainingXp = computed(() => {
    if (newBondLevel.value >= 100) return 0;
    const currentLevelCumulativeXp = bondXpTable[bondDetailData.value.currentBond - 1] ?? 0;
    const totalXp = currentLevelCumulativeXp + totalCumulativeExp.value;
    const nextLevelXp = bondXpTable[newBondLevel.value];
    return Math.max(0, nextLevelXp - totalXp);
  });

  // Writable computed exposes bondDetailData.currentBond as a flat scalar.
  const currentBond = computed({
    get: () => bondDetailData.value.currentBond,
    set: (v) => { bondDetailData.value.currentBond = v; },
  });

  // ── Undo/redo helpers (gift inputs only) ──────────────────────────────────
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  function savePreviousState() {
    if (undoStack.value.length >= HISTORY_LIMIT) undoStack.value.shift();
    undoStack.value.push({
      giftFormData:     { ...giftFormData.value },
      boxFormData:      { ...boxFormData.value },
      nonFavorGiftsMap: { ...nonFavorGiftsMap.value },
    });
    redoStack.value = [];
  }

  // ── Upgrade handlers ──────────────────────────────────────────────────────
  function handleLevelUpdate(current: number, target: number) {
    characterLevels.value.current = current;
    characterLevels.value.target  = target;
  }

  function handleSkillUpdate(type: SkillType, current: number, target: number) {
    if (current >= 1 && target >= current && skillLevels.value[type]) {
      skillLevels.value[type].current = current;
      skillLevels.value[type].target  = target;
    }
  }

  function handlePotentialUpdate(type: PotentialType, current: number, target: number) {
    if (current >= 0 && target >= current && potentialLevels.value[type]) {
      potentialLevels.value[type].current = current;
      potentialLevels.value[type].target  = target;
    }
  }

  function toggleMaxAllSkills(checked: boolean) {
    Object.keys(skillLevels.value).forEach((type) => {
      const max = student()?.Skills?.[type as SkillType]?.Parameters?.[0]?.length;
      const sl  = skillLevels.value[type as SkillType];
      if (!sl) return;
      if (checked) { sl.current = max; sl.target = max; }
      else         { sl.current = 1;   sl.target = 1;   }
    });
    allSkillsMaxed.value    = checked;
    targetSkillsMaxed.value = checked;
    saveToIndexedDB();
  }

  function toggleMaxTargetSkills(checked: boolean) {
    Object.keys(skillLevels.value).forEach((type) => {
      const max = student()?.Skills?.[type as SkillType]?.Parameters?.[0]?.length;
      const sl  = skillLevels.value[type as SkillType];
      if (!sl) return;
      if (checked) {
        sl.target = max;
        if (sl.current > max) sl.current = max;
      } else {
        sl.target = sl.current;
      }
    });
    targetSkillsMaxed.value = checked;
    allSkillsMaxed.value    = checkAllSkillsMaxed();
    saveToIndexedDB();
  }

  function toggleMaxAllPotentials(checked: boolean) {
    Object.keys(potentialLevels.value).forEach((type) => {
      const pl = potentialLevels.value[type as PotentialType];
      if (!pl) return;
      if (checked) { pl.current = MAX_POTENTIAL_LEVEL; pl.target = MAX_POTENTIAL_LEVEL; }
      else         { pl.current = 0;                    pl.target = 0;                    }
    });
    allPotentialsMaxed.value    = checked;
    targetPotentialsMaxed.value = checked;
    saveToIndexedDB();
  }

  function toggleMaxTargetPotentials(checked: boolean) {
    Object.keys(potentialLevels.value).forEach((type) => {
      const pl = potentialLevels.value[type as PotentialType];
      if (!pl) return;
      if (checked) pl.target = MAX_POTENTIAL_LEVEL;
      else         pl.target = pl.current;
    });
    targetPotentialsMaxed.value = checked;
    allPotentialsMaxed.value    = checkAllPotentialsMaxed();
    saveToIndexedDB();
  }

  // ── Gear handlers ─────────────────────────────────────────────────────────
  function handleEquipmentUpdate(type: EquipmentType, current: number, target: number) {
    const max = getMaxTierForTypeSync(type);
    if (current < 1 || current > max || target < current || target > max) return;
    if (!equipmentLevels.value[type]) {
      console.error('Equipment type not found in levels:', type);
      return;
    }
    equipmentLevels.value[type].current = current;
    equipmentLevels.value[type].target  = target;
  }

  function handleGradeUpdate(current: number, target: number) {
    if (current < 1 || current > 9 || target < current || target > 9) return;
    if (!gradeLevels.value) return;
    gradeLevels.value.current = current;
    gradeLevels.value.target  = target;
  }

  function handleGradeInfoUpdate(owned: number, price: number, purchasable: number) {
    if (!gradeInfos.value) return;
    gradeInfos.value.owned       = owned;
    gradeInfos.value.price       = price;
    gradeInfos.value.purchasable = purchasable;
  }

  function handleExclusiveGearUpdate(current: number, target: number) {
    const max = maxUnlockableGearTier.value;
    current = Math.min(Math.max(0, current), max);
    target  = Math.min(Math.max(current, target), 2);
    exclusiveGearLevel.value = { current, target };
    if (opts.isVisible?.() ?? true) saveToIndexedDB();
  }

  function toggleMaxAllGears(checked: boolean) {
    (student()?.Equipment ?? []).forEach((type) => {
      const max = getMaxTierForTypeSync(type);
      equipmentLevels.value[type as EquipmentType] = checked
        ? { current: max, target: max }
        : { current: 1,   target: 1   };
    });
    allGearsMaxed.value    = checked;
    targetGearsMaxed.value = checked;
    saveToIndexedDB();
  }

  function toggleMaxTargetGears(checked: boolean) {
    (student()?.Equipment ?? []).forEach((type) => {
      const max = getMaxTierForTypeSync(type);
      const current = equipmentLevels.value[type as EquipmentType]?.current ?? 1;
      equipmentLevels.value[type as EquipmentType] = checked
        ? { current, target: max     }
        : { current, target: current };
    });
    targetGearsMaxed.value = checked;
    allGearsMaxed.value    = checkAllGearsMaxed();
    saveToIndexedDB();
  }

  // ── Gift handlers ─────────────────────────────────────────────────────────
  const removeLeadingZeros = (event: Event) => {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/^0+(?=\d)/, '');
  };

  function handleGiftInput(giftId: number, event: Event) {
    savePreviousState();
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    giftFormData.value[giftId] = parseInt(input.value) || 0;
  }

  function handleBoxInput(boxId: number, event: Event) {
    savePreviousState();
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    const newValue = parseInt(input.value) || 0;
    boxFormData.value[boxId] = newValue;

    // Manual aggregate edits below the per-rarity sum invalidate per-gift tracking.
    if (boxId === SR_GIFT_MATERIAL_ID)  clearNonFavorIfOvercount('SR',  newValue);
    if (boxId === SSR_GIFT_MATERIAL_ID) clearNonFavorIfOvercount('SSR', newValue);
  }

  // Re-derives the SR/SSR aggregate entries in boxFormData from the per-gift
  // counts in nonFavorGiftsMap so bond EXP (which reads the aggregate) stays
  // in sync when individual non-favored gifts are edited.
  function recomputeNonFavorAggregates() {
    let sr = 0, ssr = 0;
    Object.entries(nonFavorGiftsMap.value).forEach(([id, qty]) => {
      const rarity = getResourceDataByIdSync(Number(id))?.Rarity;
      if (rarity === 'SR')  sr  += qty;
      if (rarity === 'SSR') ssr += qty;
    });
    boxFormData.value[SR_GIFT_MATERIAL_ID]  = sr;
    boxFormData.value[SSR_GIFT_MATERIAL_ID] = ssr;
  }

  function handleNonFavorGiftInput(giftId: number, event: Event) {
    savePreviousState();
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    const newValue = parseInt(input.value) || 0;
    if (newValue <= 0) delete nonFavorGiftsMap.value[giftId];
    else                 nonFavorGiftsMap.value[giftId] = newValue;
    recomputeNonFavorAggregates();
  }

  // When the aggregate stepper drops below the tracked per-gift sum, we can't
  // tell which specific gifts were removed — clear that rarity's tracking.
  function clearNonFavorIfOvercount(rarity: 'SR' | 'SSR', newTotal: number) {
    const nonFavorIds = Object.keys(nonFavorGiftsMap.value)
      .filter(id => getResourceDataByIdSync(Number(id))?.Rarity === rarity);
    const nonFavorSum = nonFavorIds.reduce((s, id) => s + (nonFavorGiftsMap.value[Number(id)] ?? 0), 0);

    const convertedIds = Object.keys(boxFormData.value)
      .filter(id => !BOX_ITEM_IDS.has(Number(id)) && getResourceDataByIdSync(Number(id))?.Rarity === rarity);
    const convertedSum = convertedIds.reduce((s, id) => s + (boxFormData.value[Number(id)] ?? 0), 0);

    if (newTotal < nonFavorSum + convertedSum) {
      nonFavorIds.forEach(id => delete nonFavorGiftsMap.value[Number(id)]);
      convertedIds.forEach(id => delete boxFormData.value[Number(id)]);
    }
  }

  function handleBondInput(value: number) {
    bondDetailData.value.currentBond = value;
  }

  function updateOtherExp(patch: Partial<OtherExpDataProps>) {
    otherExpData.value = { ...otherExpData.value, ...patch };
  }

  function resetOtherExp() {
    otherExpData.value = { ...DEFAULT_OTHER_EXP };
  }

  // ── Convert / Sync gifts ──────────────────────────────────────────────────
  function convertBoxes() {
    if (!student()?.Boxes?.length) return;

    const srCount    = boxFormData.value[SR_GIFT_MATERIAL_ID] ?? 0;
    const stoneCount = boxFormData.value[YELLOW_STONE_ID]     ?? 0;
    if (srCount <= 0 || stoneCount <= 0) return;

    const convertedCount = Math.min(Math.floor(srCount / 2), stoneCount);
    const giftsNeeded    = convertedCount * 2;

    const hasIndividualTracking = Object.keys(nonFavorGiftsMap.value).length > 0;
    if (hasIndividualTracking) {
      convertModalNeeded.value = giftsNeeded;
      showConvertModal.value   = true;
    } else {
      savePreviousState();
      calculateOptimalConversion();
    }
  }

  function confirmConversion(selection: Record<number, number>) {
    showConvertModal.value = false;
    savePreviousState();

    // Move the user's selected per-gift counts from nonFavorGiftsMap into
    // boxFormData so they remain counted as "needed" for the leftover calc.
    for (const [id, qty] of Object.entries(selection)) {
      const giftId = Number(id);
      const remaining = (nonFavorGiftsMap.value[giftId] ?? 0) - qty;
      if (remaining <= 0) delete nonFavorGiftsMap.value[giftId];
      else                  nonFavorGiftsMap.value[giftId] = remaining;
      if (qty > 0) {
        boxFormData.value[giftId] = (boxFormData.value[giftId] ?? 0) + qty;
      }
    }

    // Do not pre-subtract the SR aggregate here — calculateOptimalConversion
    // reads SR_GIFT_MATERIAL_ID directly and subtracts convertedCount * 2 itself.
    calculateOptimalConversion();
  }

  function cancelConversion() {
    showConvertModal.value = false;
  }

  function calculateOptimalConversion() {
    if (isCalculating.value) return;
    try {
      isCalculating.value = true;
      const yellowStoneQuantity     = boxFormData.value[YELLOW_STONE_ID]      || 0;
      const srGiftMaterialQuantity  = boxFormData.value[SR_GIFT_MATERIAL_ID]  || 0;
      const selectorBoxQuantity     = boxFormData.value[SELECTOR_BOX_ID]     || 0;
      if (yellowStoneQuantity <= 0 || srGiftMaterialQuantity <= 0) return;

      const maxConvertibleByMaterials = Math.floor(srGiftMaterialQuantity / 2);
      const maxConvertibleByStones    = yellowStoneQuantity;
      const convertedQuantity         = Math.min(maxConvertibleByMaterials, maxConvertibleByStones);

      boxFormData.value = {
        ...boxFormData.value,
        [YELLOW_STONE_ID]:      yellowStoneQuantity - convertedQuantity,
        [SR_GIFT_MATERIAL_ID]:  srGiftMaterialQuantity - convertedQuantity * 2,
        [SELECTOR_BOX_ID]:      selectorBoxQuantity + convertedQuantity,
      };
    } finally {
      isCalculating.value = false;
    }
  }

  // Yellow stones lack an exp value so their grade icon would be missing.
  const shouldShowGiftGrade = (id: number): boolean => id !== YELLOW_STONE_ID;

  function resetGifts() {
    savePreviousState();
    giftFormData.value     = {};
    boxFormData.value      = {};
    nonFavorGiftsMap.value = {};
  }

  function undoChanges() {
    const snapshot = undoStack.value.pop();
    if (!snapshot) return;
    redoStack.value.push({
      giftFormData:     { ...giftFormData.value },
      boxFormData:      { ...boxFormData.value },
      nonFavorGiftsMap: { ...nonFavorGiftsMap.value },
    });
    giftFormData.value     = snapshot.giftFormData;
    boxFormData.value      = snapshot.boxFormData;
    nonFavorGiftsMap.value = snapshot.nonFavorGiftsMap;
  }

  function redoChanges() {
    const snapshot = redoStack.value.pop();
    if (!snapshot) return;
    undoStack.value.push({
      giftFormData:     { ...giftFormData.value },
      boxFormData:      { ...boxFormData.value },
      nonFavorGiftsMap: { ...nonFavorGiftsMap.value },
    });
    giftFormData.value     = snapshot.giftFormData;
    boxFormData.value      = snapshot.boxFormData;
    nonFavorGiftsMap.value = snapshot.nonFavorGiftsMap;
  }

  // ── Sync-from-inventory ────────────────────────────────────────────────────
  // Returns gear material needs (Category === 'Favor') across all OTHER
  // recruited students. Used by `syncGifts('aware')` to reserve gifts before
  // greedy-filling the current student's inputs.
  function getGearGiftNeedsExcluding(excludeStudentId: number): Record<number, number> {
    const needs: Record<number, number> = {};
    const allGearsData = getAllGearsData();
    Object.entries(allGearsData).forEach(([studentId, materials]) => {
      if (Number(studentId) === excludeStudentId) return;
      if (studentDataStore.value[Number(studentId)]?.isOwned === false) return;
      (materials as Material[]).forEach(material => {
        if (material.material?.Category !== 'Favor') return;
        const id = material.material?.Id;
        if (!id) return;
        needs[id] = (needs[id] ?? 0) + material.materialQuantity;
      });
    });
    return needs;
  }

  function syncGifts(mode: 'greedy' | 'aware') {
    savePreviousState();

    const resources         = getAllItemsFromCache();
    const allocatedByOthers = getAllocatedGifts(student()?.Id);
    const gearNeeds         = mode === 'aware' ? getGearGiftNeedsExcluding(student().Id) : {};

    const gifts = Object.values(resources ?? {}).filter(r => r && r.Category === 'Favor');

    if (!giftFormData.value) giftFormData.value = {};
    nonFavorGiftsMap.value = {};

    let nonFavorGiftsSr = 0;
    let nonFavorGiftsSsr = 0;
    // SchaleDB blacklist: certain SSR gifts (selectors) shouldn't auto-fill
    // because they're better spent manually.
    const blackListIds = [5996, 5997, 5998, 5999];

    if (student()?.Gifts) {
      gifts.forEach(gift => {
        if (!gift.Id) return;
        const owned            = gift.QuantityOwned ?? 0;
        const alreadyAllocated = allocatedByOthers[gift.Id] ?? 0;
        const available        = Math.max(0, owned - alreadyAllocated - (gearNeeds[gift.Id] ?? 0));
        const isStudentGift    = (student()?.Gifts ?? []).some(g => g.gift.Id === gift.Id);

        if (isStudentGift) {
          giftFormData.value[gift.Id] = available;
        } else {
          if (available > 0) nonFavorGiftsMap.value[gift.Id] = available;
          if (gift.Rarity === 'SR')                                       nonFavorGiftsSr  += available;
          if (gift.Rarity === 'SSR' && !blackListIds.includes(gift.Id))   nonFavorGiftsSsr += available;
        }
      });
    }

    boxFormData.value[SR_GIFT_MATERIAL_ID]  = nonFavorGiftsSr;
    boxFormData.value[SSR_GIFT_MATERIAL_ID] = nonFavorGiftsSsr;
  }

  function closeModal() {
    saveToIndexedDB();
    opts.onClose?.();
  }

  return {
    // ─ Form refs (state)
    characterLevels, skillLevels, potentialLevels,
    equipmentLevels, gradeLevels, gradeInfos, exclusiveGearLevel,
    giftFormData, boxFormData, nonFavorGiftsMap,
    bondDetailData, otherExpData,
    currentBond,

    // ─ Maxed flags
    allSkillsMaxed, targetSkillsMaxed,
    allPotentialsMaxed, targetPotentialsMaxed,
    allGearsMaxed, targetGearsMaxed,

    // ─ Gear-derived
    hasExclusiveGear, maxUnlockableGearTier,

    // ─ Material aggregates
    allMaterialsNeeded, equipmentMaterialsNeeded,

    // ─ XP / Bond computeds
    characterRemainingXp,
    giftsExp, boxesExp, cafeDays, cafeExp, bonusExp,
    totalCumulativeExp, newBondLevel, remainingXp,

    // ─ Convert/sync modal state
    showConvertModal, convertModalNeeded, confirmConversion, cancelConversion,
    showSyncGiftsModal, syncGifts,

    // ─ Undo/redo
    canUndo, canRedo, undoChanges, redoChanges,

    // ─ Upgrade handlers
    handleLevelUpdate, handleSkillUpdate, handlePotentialUpdate,
    toggleMaxAllSkills, toggleMaxTargetSkills,
    toggleMaxAllPotentials, toggleMaxTargetPotentials,

    // ─ Gear handlers
    handleEquipmentUpdate, handleGradeUpdate, handleGradeInfoUpdate, handleExclusiveGearUpdate,
    toggleMaxAllGears, toggleMaxTargetGears,

    // ─ Gift handlers
    handleGiftInput, handleBoxInput, handleNonFavorGiftInput, handleBondInput,
    updateOtherExp, resetOtherExp,
    convertBoxes, resetGifts, shouldShowGiftGrade,

    // ─ Lifecycle
    loadFromIndexedDB,
    saveBeforeClose: saveToIndexedDB,
    closeModal,
  };
}
