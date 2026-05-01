import { ref, computed } from 'vue';
import { StudentProps } from '../../types/student';
import { BondDetailDataProps, DEFAULT_BOND_DETAIL, GiftProps } from '../../types/gift';
import { loadFormDataToRefs, saveFormData } from '../utils/studentStorage';
import { getAllItemsFromCache, getResourceDataByIdSync } from '../stores/resourceCacheStore';
import bondData from '../../data/data.json';
import { updateStudentData, setStudentDataDirect, studentDataStore } from '../stores/studentStore';
import { SELECTOR_BOX_ID, SR_GIFT_MATERIAL_ID, SSR_GIFT_MATERIAL_ID, YELLOW_STONE_ID } from '../../types/resource';
import { getAllocatedGifts } from './useGiftCalculation';
import { getAllGearsData } from '../stores/gearsStore';
import { Material } from '../../types/upgrade';
import { useDebouncedFormPersistence } from './useDebouncedFormPersistence';

const HISTORY_LIMIT = 10;
const BOX_ITEM_IDS = new Set([YELLOW_STONE_ID, SR_GIFT_MATERIAL_ID, SSR_GIFT_MATERIAL_ID, SELECTOR_BOX_ID]);

interface GiftSnapshot {
  giftFormData: Record<string, number>;
  boxFormData: Record<string, number>;
  nonFavorGiftsMap: Record<number, number>;
}

export function useStudentGifts(props: {
  student: StudentProps,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  const giftFormData = ref<Record<string, number>>({});
  const boxFormData = ref<Record<string, number>>({});
  const nonFavorGiftsMap = ref<Record<number, number>>({}); // Track individual non-favor gifts for Gifts tab display
  const bondDetailData = ref<BondDetailDataProps>({...DEFAULT_BOND_DETAIL});
  const isCalculating = ref(false);

  // Convert modal state
  const showConvertModal = ref(false);
  const convertModalNeeded = ref(0);

  // Sync Gifts mode modal state
  const showSyncGiftsModal = ref(false);

  // Undo/redo stacks
  const undoStack = ref<GiftSnapshot[]>([]);
  const redoStack = ref<GiftSnapshot[]>([]);

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  const bondXpTable = bondData.bond_xp;

  // Push current state onto undo stack; any new action clears redo history.
  // Spread is sufficient because all three objects are flat (Record<string, number>).
  const savePreviousState = () => {
    if (undoStack.value.length >= HISTORY_LIMIT) undoStack.value.shift();
    undoStack.value.push({
      giftFormData: { ...giftFormData.value },
      boxFormData: { ...boxFormData.value },
      nonFavorGiftsMap: { ...nonFavorGiftsMap.value },
    });
    redoStack.value = [];
  };

  const GIFT_DEFAULTS = {
    giftFormData:    {} as Record<string, number>,
    boxFormData:     {} as Record<string, number>,
    nonFavorGiftsMap: {} as Record<number, number>,
    bondDetailData:  { ...DEFAULT_BOND_DETAIL } as BondDetailDataProps,
  };

  const { loadNow: loadFromIndexedDB, flushNow: saveToIndexedDB } =
    useDebouncedFormPersistence({
      isVisible:    () => props.isVisible,
      refs:         { giftFormData, boxFormData, nonFavorGiftsMap, bondDetailData },
      defaults:     GIFT_DEFAULTS,
      loadFn:       (staged) => loadFormDataToRefs(props.student.Id, staged, GIFT_DEFAULTS),
      saveFn:       () => saveFormData(props.student.Id, {
        giftFormData:     giftFormData.value,
        boxFormData:      boxFormData.value,
        nonFavorGiftsMap: nonFavorGiftsMap.value,
        bondDetailData:   bondDetailData.value,
      }),
      onSaved:      (saved) => setStudentDataDirect(props.student.Id, saved),
      afterFlush:   () => updateStudentData(props.student.Id),
      afterLoad:    () => {
        // Clear undo/redo history so loaded state isn't undoable
        undoStack.value  = [];
        redoStack.value  = [];
      },
      watchSources: [giftFormData, boxFormData, nonFavorGiftsMap, bondDetailData],
    });

  // Calculate individual item EXP
  const calculateItemExp = (expValue: number, quantity: number): number => {
    if (isNaN(quantity) || quantity <= 0) return 0;
    return expValue * quantity;
  };

  // Extract exp value from an item regardless of its structure
  const getItemExpValue = (item: any): number => {
    if (!item) return 0;

    // Direct exp property
    if (typeof item.exp === 'number') {
      return item.exp;
    }

    // Nested in gift object
    if (item.gift && typeof item.gift.exp === 'number') {
      return item.gift.exp;
    }

    return 0;
  };

  // Calculate EXP for a single item type (gifts or boxes)
  const calculateItemTypeExp = (
    items: GiftProps[] | undefined,
    formData: Record<string, number>,
    itemType: string // For logging
  ): number => {
    if (!items || !formData) return 0;

    const itemMap = Object.fromEntries(items.map(g => [String(g.gift.Id), g]));

    let typeTotal = 0;

    // Process each item with quantity in the form data
    Object.entries(formData).forEach(([itemId, quantity]) => {
      if (quantity <= 0) return;

      // Get the item by ID
      const item = itemMap[itemId];
      if (!item) return;

      // Get exp value
      const expValue = getItemExpValue(item);
      if (expValue <= 0) return;

      // Calculate and add exp
      const itemExp = calculateItemExp(expValue, quantity);
      typeTotal += itemExp;
    });

    return typeTotal;
  };

  // Compute total cumulative EXP across gifts and boxes
  const calculateCumulativeExp = (): number => {
    // Calculate exp for gifts
    const giftsExp = calculateItemTypeExp(
      props.student.Gifts,
      giftFormData.value,
      'Gift'
    );

    // Calculate exp for boxes
    const boxesExp = calculateItemTypeExp(
      props.student.Boxes,
      boxFormData.value,
      'Box'
    );

    const totalExp = giftsExp + boxesExp;

    return totalExp;
  };

  const totalCumulativeExp = computed(calculateCumulativeExp);

  // Compute new bond level based on current bond and cumulative EXP
  const newBondLevel = computed(() => {
    // Return early if we're already at max level
    if (bondDetailData.value.currentBond >= 100) return 100;

    // No gifts added, stay at current level
    if (totalCumulativeExp.value <= 0) return bondDetailData.value.currentBond;

    // Calculate total XP including current level's cumulative XP and gift XP
    const currentLevelCumulativeXp = bondXpTable[bondDetailData.value.currentBond - 1] ?? 0;
    const totalXp = currentLevelCumulativeXp + totalCumulativeExp.value;

    // Find the highest level we can reach with this total XP
    let newLevel = bondDetailData.value.currentBond;
    for (let i = bondDetailData.value.currentBond; i < 100; i++) {
      if (totalXp >= bondXpTable[i]) {
        newLevel = i + 1;
      } else {
        break;
      }
    }

    return newLevel;
  });

  // Compute remaining XP to the next level
  const remainingXp = computed(() => {
    // Return 0 if already at max level
    if (newBondLevel.value >= 100) return 0;

    // Calculate total XP including current level's cumulative XP and gift XP
    const currentLevelCumulativeXp = bondXpTable[bondDetailData.value.currentBond - 1] ?? 0;
    const totalXp = currentLevelCumulativeXp + totalCumulativeExp.value;

    // Get the XP needed for the next level
    const nextLevelXp = bondXpTable[newBondLevel.value];

    // Calculate remaining XP needed
    const remainingExp = nextLevelXp - totalXp;

    return Math.max(0, remainingExp);
  });

  const removeLeadingZeros = (event: Event) => {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/^0+(?=\d)/, '');
  };

  const handleGiftInput = (giftId: number, event: Event) => {
    // Save current state before modifying
    savePreviousState();

    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    giftFormData.value[giftId] = parseInt(input.value) || 0;
  };

  const handleBoxInput = (boxId: number, event: Event) => {
    // Save current state before modifying
    savePreviousState();

    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    const newValue = parseInt(input.value) || 0;
    boxFormData.value[boxId] = newValue;

    // Clear individual gift tracking for the rarity when manual input would cause overcount
    if (boxId === SR_GIFT_MATERIAL_ID) clearNonFavorIfOvercount('SR', newValue);
    if (boxId === SSR_GIFT_MATERIAL_ID) clearNonFavorIfOvercount('SSR', newValue);
  };

  // When the aggregate SR/SSR stepper is lowered below the tracked per-gift sum,
  // we can't know which specific gifts were removed, so clear that rarity's entries
  // from both nonFavorGiftsMap and any converted gift IDs stored in boxFormData.
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

  const handleBondInput = (value: number) => {
    bondDetailData.value.currentBond = value;
  };

  const convertBoxes = () => {
    if (!props.student?.Boxes?.length) return;

    const srCount = boxFormData.value[SR_GIFT_MATERIAL_ID] ?? 0;
    const stoneCount = boxFormData.value[YELLOW_STONE_ID] ?? 0;
    if (srCount <= 0 || stoneCount <= 0) return;

    const convertedCount = Math.min(Math.floor(srCount / 2), stoneCount);
    const giftsNeeded = convertedCount * 2;

    const hasIndividualTracking = Object.keys(nonFavorGiftsMap.value).length > 0;
    if (hasIndividualTracking) {
      convertModalNeeded.value = giftsNeeded;
      showConvertModal.value = true;
    } else {
      savePreviousState();
      calculateOptimalConversion();
    }
  };

  const confirmConversion = (selection: Record<number, number>) => {
    showConvertModal.value = false;
    savePreviousState();

    // Deduct the selected individual gifts from nonFavorGiftsMap and record
    // them in boxFormData so they remain counted as "needed" for the leftover
    // calculation (they will be physically consumed during conversion).
    for (const [id, qty] of Object.entries(selection)) {
      const giftId = Number(id);
      const remaining = (nonFavorGiftsMap.value[giftId] ?? 0) - qty;
      if (remaining <= 0) {
        delete nonFavorGiftsMap.value[giftId];
      } else {
        nonFavorGiftsMap.value[giftId] = remaining;
      }
      if (qty > 0) {
        boxFormData.value[giftId] = (boxFormData.value[giftId] ?? 0) + qty;
      }
    }

    // calculateOptimalConversion reads SR_GIFT_MATERIAL_ID directly and subtracts
    // convertedCount * 2 on its own — do not pre-subtract here or the materials
    // get deducted twice.
    calculateOptimalConversion();
  };

  const cancelConversion = () => {
    showConvertModal.value = false;
  };

  // Function to calculate optimal conversion
  const calculateOptimalConversion = () => {
    // Prevent recalculation if already calculating
    if (isCalculating.value) return;

    try {
      isCalculating.value = true;

      // Get current values
      const yellowStoneQuantity = boxFormData.value[YELLOW_STONE_ID] || 0;
      const srGiftMaterialQuantity = boxFormData.value[SR_GIFT_MATERIAL_ID] || 0;
      const selectorBoxQuantity = boxFormData.value[SELECTOR_BOX_ID] || 0;

      // Ensure we have valid values
      if (yellowStoneQuantity <= 0 || srGiftMaterialQuantity <= 0) {
        return;
      }

      // Calculate how many boxes can be converted based on available materials
      // Each conversion requires 2 materials and 1 stone
      const maxConvertibleByMaterials = Math.floor(srGiftMaterialQuantity / 2);
      const maxConvertibleByStones = yellowStoneQuantity;

      // Use the minimum of what materials and stones allow
      const convertedQuantity = Math.min(maxConvertibleByMaterials, maxConvertibleByStones);

      boxFormData.value = {
        ...boxFormData.value,
        [YELLOW_STONE_ID]: yellowStoneQuantity - convertedQuantity,
        [SR_GIFT_MATERIAL_ID]: srGiftMaterialQuantity - (convertedQuantity * 2),
        [SELECTOR_BOX_ID]: selectorBoxQuantity + convertedQuantity
      };
    } finally {
      isCalculating.value = false;
    }
  };

  const shouldShowGiftGrade = computed(() => {
    return (id: number): boolean => {
      return (
        // Only show grades for non-keystones to avoid missing grade favor icon
        // because keystone doesn't have exp value
        id !== YELLOW_STONE_ID
      );
    };
  });

  // Reset all gifts to zero
  const resetGifts = () => {
    savePreviousState();
    giftFormData.value = {};
    boxFormData.value = {};
    nonFavorGiftsMap.value = {};
  };

  // Undo last action
  const undoChanges = () => {
    const snapshot = undoStack.value.pop();
    if (!snapshot) return;
    redoStack.value.push({
      giftFormData: { ...giftFormData.value },
      boxFormData: { ...boxFormData.value },
      nonFavorGiftsMap: { ...nonFavorGiftsMap.value },
    });
    giftFormData.value = snapshot.giftFormData;
    boxFormData.value = snapshot.boxFormData;
    nonFavorGiftsMap.value = snapshot.nonFavorGiftsMap;
  };

  // Redo last undone action
  const redoChanges = () => {
    const snapshot = redoStack.value.pop();
    if (!snapshot) return;
    undoStack.value.push({
      giftFormData: { ...giftFormData.value },
      boxFormData: { ...boxFormData.value },
      nonFavorGiftsMap: { ...nonFavorGiftsMap.value },
    });
    giftFormData.value = snapshot.giftFormData;
    boxFormData.value = snapshot.boxFormData;
    nonFavorGiftsMap.value = snapshot.nonFavorGiftsMap;
  };

  // Returns gear material needs (Category === 'Favor') for all recruited students except the given one.
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

  const syncGifts = (mode: 'greedy' | 'aware') => {
    savePreviousState();

    const resources = getAllItemsFromCache();
    const allocatedByOthers = getAllocatedGifts(props.student?.Id);
    const gearNeeds = mode === 'aware' ? getGearGiftNeedsExcluding(props.student.Id) : {};

    // Filter out gifts from the resources
    const gifts = Object.values(resources ?? {}).filter(resource =>
      resource && resource.Category === 'Favor'
    );

    if (!giftFormData.value) {
      giftFormData.value = {};
    }

    // Reset nonFavorGiftsMap for fresh sync
    nonFavorGiftsMap.value = {};

    let nonFavorGiftsSr = 0;
    let nonFavorGiftsSsr = 0;
    const blackListIds = [5996, 5997, 5998, 5999];

    // Check if student has gifts
    if (props.student?.Gifts) {
      // Loop through all gifts from resources
      gifts.forEach(gift => {
        if (gift.Id) {
          // Calculate available quantity (owned - allocated by others - gear needs if aware mode)
          const owned = gift.QuantityOwned ?? 0;
          const alreadyAllocated = allocatedByOthers[gift.Id] ?? 0;
          const available = Math.max(0, owned - alreadyAllocated - (gearNeeds[gift.Id] ?? 0));

          const isStudentGift = (props.student?.Gifts ?? []).some(
            g => g.gift.Id === gift.Id
          );

          if (isStudentGift) {
            giftFormData.value[gift.Id] = available;
          } else {
            // Track individual non-favor gifts for Gifts tab display
            if (available > 0) {
              nonFavorGiftsMap.value[gift.Id] = available;
            }

            // Also aggregate for bond calculation
            if (gift.Rarity === 'SR') {
              nonFavorGiftsSr += available;
            }
            if (gift.Rarity === 'SSR' && !blackListIds.includes(gift.Id)) {
              nonFavorGiftsSsr += available;
            }
          }
        }
      });
    }

    // Set the quantities for non-favor gifts in boxFormData (aggregated for bond calculation)
    boxFormData.value[SR_GIFT_MATERIAL_ID] = nonFavorGiftsSr;
    boxFormData.value[SSR_GIFT_MATERIAL_ID] = nonFavorGiftsSsr;
  };

function closeModal() {
    // Save the current state (including conversion state) before closing
    saveToIndexedDB();
    emit('close');
  }

  // Create computed properties to expose the nested properties for compatibility
  const currentBond = computed({
    get: () => bondDetailData.value.currentBond,
    set: (value) => { bondDetailData.value.currentBond = value; }
  });

  return {
    // State
    giftFormData,
    boxFormData,
    nonFavorGiftsMap,
    currentBond,

    // Convert modal
    showConvertModal,
    convertModalNeeded,
    confirmConversion,
    cancelConversion,

    // Sync Gifts modal
    showSyncGiftsModal,
    syncGifts,

    // Undo/redo
    canUndo,
    canRedo,

    // Computed
    totalCumulativeExp,
    newBondLevel,
    remainingXp,
    shouldShowGiftGrade,

    // Methods
    closeModal,
    loadFromIndexedDB,
    handleGiftInput,
    handleBoxInput,
    handleBondInput,
    convertBoxes,
    resetGifts,
    undoChanges,
    redoChanges,
  };
}
