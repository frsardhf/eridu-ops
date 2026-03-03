import { ref, computed, watch, nextTick } from 'vue';
import {
  MAX_LEVEL,
  MIN_BOND_LEVEL,
  MAX_BOND_LEVEL,
  MAX_ELEPH_OWNED,
  MIN_ELEPH_PRICE,
  MAX_ELEPH_PRICE,
  MIN_ELEPH_PURCHASABLE,
  MAX_ELEPH_PURCHASABLE,
} from '@/consumables/constants/gameConstants';
import {
  clampLevelPair,
  createEditorKeydownHandler,
  parseEditValue,
} from '@/consumables/utils/upgradeUtils';

/**
 * Encapsulates the inline level editor state and logic for LevelSection.
 *
 * - Maintains a local mirror of the levels prop so edits are responsive
 *   without touching the parent state mid-edit.
 * - Syncs back when the prop changes externally (e.g. student switch)
 *   and cancels any in-progress edit to avoid stale values.
 * - Delegates clamping to `clampLevelPair` (upgradeUtils) so the
 *   current ↔ target constraint logic lives in one place.
 */
export function useLevelEditor(
  getLevels: () => { current: number; target: number },
  onUpdate: (current: number, target: number) => void,
) {
  const initial = getLevels();
  const levelState = ref({ current: initial.current, target: initial.target });
  const editingField = ref<'current' | 'target' | null>(null);
  const editValue = ref('');
  const currentEditorRef = ref<HTMLInputElement | null>(null);
  const targetEditorRef = ref<HTMLInputElement | null>(null);

  // Sync local state when the prop changes externally; cancel any in-progress edit.
  watch(getLevels, (newVal) => {
    if (!newVal) return;
    levelState.value.current = newVal.current;
    levelState.value.target = newVal.target;
    if (editingField.value) {
      editingField.value = null;
      editValue.value = '';
    }
  }, { deep: true, immediate: true });

  const processLevelUpdate = (value: number, isTarget: boolean) => {
    const other = isTarget ? levelState.value.current : levelState.value.target;
    const clamped = clampLevelPair(value, other, 1, MAX_LEVEL, isTarget);
    if (!clamped) return;
    levelState.value.current = clamped.current;
    levelState.value.target = clamped.target;
    onUpdate(clamped.current, clamped.target);
  };

  const startEdit = async (field: 'current' | 'target') => {
    editingField.value = field;
    editValue.value = (field === 'current'
      ? levelState.value.current
      : levelState.value.target).toString();
    await nextTick();
    const editor = field === 'current' ? currentEditorRef.value : targetEditorRef.value;
    editor?.focus();
    editor?.select();
  };

  const commitEdit = () => {
    if (!editingField.value) return;
    const isTarget = editingField.value === 'target';
    const fallback = isTarget ? levelState.value.current : 1;
    processLevelUpdate(parseEditValue(editValue.value, fallback), isTarget);
    editingField.value = null;
    editValue.value = '';
  };

  const cancelEdit = () => {
    editingField.value = null;
    editValue.value = '';
  };

  const handleEditorKeydown = createEditorKeydownHandler(commitEdit, cancelEdit);

  return {
    levelState,
    editingField,
    editValue,
    currentEditorRef,
    targetEditorRef,
    startEdit,
    commitEdit,
    handleEditorKeydown,
  };
}

// ---------------------------------------------------------------------------

const MAX_BOND = MAX_BOND_LEVEL;
const MIN_BOND = MIN_BOND_LEVEL;

/**
 * Encapsulates the inline bond editor state and logic for BondSection.
 *
 * Same commit/cancel/sync pattern as useLevelEditor but for a single scalar
 * value (1-100) rather than a current/target pair.
 * Generic action names (startEdit, commitEdit, editValue, isEditing) match
 * useLevelEditor's style; domain names used only for state/refs.
 */
export function useBondEditor(
  getBond: () => number,
  onUpdate: (value: number) => void,
) {
  const bondState = ref(getBond());
  const isEditing = ref(false);
  const editValue = ref('');
  const bondEditorRef = ref<HTMLInputElement | null>(null);

  // Sync local state when the prop changes externally; cancel any in-progress edit.
  watch(getBond, (newVal) => {
    bondState.value = newVal;
    if (isEditing.value) {
      isEditing.value = false;
      editValue.value = '';
    }
  }, { immediate: true });

  const isMaxBond = computed(() => bondState.value >= MAX_BOND);

  const processUpdate = (value: number) => {
    const clamped = Math.max(MIN_BOND, Math.min(MAX_BOND, value));
    bondState.value = clamped;
    onUpdate(clamped);
  };

  const startEdit = async () => {
    isEditing.value = true;
    editValue.value = bondState.value.toString();
    await nextTick();
    bondEditorRef.value?.focus();
    bondEditorRef.value?.select();
  };

  const commitEdit = () => {
    if (!isEditing.value) return;
    processUpdate(parseEditValue(editValue.value, MIN_BOND));
    isEditing.value = false;
    editValue.value = '';
  };

  const cancelEdit = () => {
    isEditing.value = false;
    editValue.value = '';
  };

  return {
    bondState,
    bondEditorRef,
    isMaxBond,
    isEditing,
    editValue,
    startEdit,
    commitEdit,
    handleEditorKeydown: createEditorKeydownHandler(commitEdit, cancelEdit),
  };
}

// ---------------------------------------------------------------------------

/**
 * Encapsulates the focus-overlay pattern used by GiftCard and ResourceCard.
 *
 * - Input element is always in the DOM.
 * - A quantity display overlay hides while the input is focused.
 * - Parent manages value state; this composable only tracks focus + provides
 *   a programmatic focus helper.
 * - No local buffer, no commit/cancel — works with @input live updates.
 */
export function useFocusInput() {
  const isInputFocused = ref(false);
  const inputEl = ref<HTMLInputElement | null>(null);

  function handleFocus() { isInputFocused.value = true; }
  function handleBlur() { isInputFocused.value = false; }
  function forceInputFocus() { inputEl.value?.focus(); }

  return { isInputFocused, inputEl, handleFocus, handleBlur, forceInputFocus };
}

// ---------------------------------------------------------------------------

/**
 * Encapsulates the grade-info editing state for ElephEligmaSection.
 *
 * - Maintains a local mirror of the gradeInfos prop (owned/price/purchasable).
 * - Syncs back when the prop changes externally (e.g. student switch).
 * - Handles per-field clamping and emits the full state on every change.
 */
export function useGradeInfoEditor(
  getGradeInfos: () => { owned?: number; price?: number; purchasable?: number } | undefined,
  onUpdate: (owned: number, price: number, purchasable: number) => void,
) {
  const gradeState = ref({
    owned: getGradeInfos()?.owned ?? 0,
    price: getGradeInfos()?.price ?? 1,
    purchasable: getGradeInfos()?.purchasable ?? 20,
  });

  watch(getGradeInfos, (newVal) => {
    if (!newVal) return;
    gradeState.value.owned = newVal.owned ?? 0;
    gradeState.value.price = newVal.price ?? 1;
    gradeState.value.purchasable = newVal.purchasable ?? 20;
  }, { deep: true, immediate: true });

  const limits = {
    owned:       { min: 0,                  max: MAX_ELEPH_OWNED       },
    price:       { min: MIN_ELEPH_PRICE,    max: MAX_ELEPH_PRICE       },
    purchasable: { min: MIN_ELEPH_PURCHASABLE, max: MAX_ELEPH_PURCHASABLE },
  } as const;

  const updateValue = (event: Event, field: 'owned' | 'price' | 'purchasable') => {
    const value = parseInt((event.target as HTMLInputElement).value, 10) || 0;
    const clamped = Math.max(limits[field].min, Math.min(limits[field].max, value));
    gradeState.value[field] = clamped;
    onUpdate(gradeState.value.owned, gradeState.value.price, gradeState.value.purchasable);
  };

  return { gradeState, updateValue };
}
