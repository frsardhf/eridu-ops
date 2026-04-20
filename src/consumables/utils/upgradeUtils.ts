// materialUtils.ts
import { type Ref } from 'vue';
export { MAX_POTENTIAL_LEVEL } from '@/consumables/constants/gameConstants';

/**
 * Determines the state of level displays (max, same, or different)
 */
export function getLevelDisplayState(current: number, target: number, maxLevel: number) {
  if (current === maxLevel && target === maxLevel) {
    return 'max';
  } else if (current === target) {
    return 'same';
  } else {
    return 'different';
  }
}

/**
 * Checks if target level is at maximum
 */
export function isTargetMaxLevel(target: number, maxLevel: number) {
  return target === maxLevel;
}

/**
 * Determines if target slider should be shown based on hover state and level differences
 */
export function shouldShowTargetSliderUtil<T extends string>(
  type: T, 
  hoveredItem: Ref<T | null>, 
  currentValue: number, 
  targetValue: number
) {
  return hoveredItem.value === type || currentValue !== targetValue;
}

/**
 * Updates the current level with appropriate constraints
 * Ensures target is always >= current
 */
export function updateCurrentLevel(value: number, minLevel: number, maxLevel: number) {
  if (value >= minLevel && value <= maxLevel) {
    return value;
  }
  return Math.min(Math.max(value, minLevel), maxLevel);
}

/**
 * Updates the target level with appropriate constraints
 * Ensures target is always >= current and within range
 */
export function updateTargetLevel(value: number, current: number, minLevel: number, maxLevel: number) {
  if (value >= minLevel && value <= maxLevel) {
    return Math.max(value, current);
  }
  return Math.min(Math.max(value, current, minLevel), maxLevel);
}

/**
 * Parses a raw string input to an integer.
 * Returns `fallback` when the string is empty or non-numeric.
 */
export function parseEditValue(rawValue: string, fallback: number): number {
  const parsed = parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Creates a keydown handler for number editor inputs.
 * Blocks invalid keys (e, E, +, -, .) and handles Enter (commit) / Escape (cancel).
 */
export function createEditorKeydownHandler(
  onCommit: () => void,
  onCancel: () => void
) {
  return (event: KeyboardEvent) => {
    if (['e', 'E', '+', '-', '.'].includes(event.key)) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      onCommit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };
}

/**
 * Clamps a current/target level pair, ensuring target >= current.
 * When isTarget=false, updates current and bumps target up if needed.
 * When isTarget=true, updates target and pulls current down if needed.
 */
export function clampLevelPair(
  newValue: number,
  otherValue: number,
  min: number,
  max: number,
  isTarget: boolean
): { current: number; target: number } | null {
  if (newValue < min || newValue > max) return null;

  if (isTarget) {
    return {
      current: otherValue > newValue ? newValue : otherValue,
      target: newValue,
    };
  } else {
    return {
      current: newValue,
      target: Math.max(newValue, otherValue),
    };
  }
}

/**
 * Factory returning a current/target update pair.
 * Pure utility — no Vue reactivity. Wraps clampLevelPair for a
 * consistent update pattern used by SkillSection, PotentialSection, etc.
 *
 * @param getLevels - getter returning the current { current, target } pair
 * @param onUpdate  - callback invoked with the new (current, target) values
 * @param min       - minimum allowed value
 * @param getMax    - getter returning the maximum allowed value (reactive-friendly)
 */
export function makeCurrentTargetPair(
  getLevels: () => { current: number; target: number },
  onUpdate: (current: number, target: number) => void,
  min: number,
  getMax: () => number,
) {
  return {
    updateCurrent(newValue: number) {
      const result = clampLevelPair(newValue, getLevels().target, min, getMax(), false);
      if (result) onUpdate(result.current, result.target);
    },
    updateTarget(newValue: number) {
      const result = clampLevelPair(newValue, getLevels().current, min, getMax(), true);
      if (result) onUpdate(result.current, result.target);
    },
  };
}

/**
 * Formats value display with current/target highlighting
 */
export function formatValueWithTarget(currentValue: number, targetValue: number) {
  // If current and target are the same, just show a single value
  if (currentValue === targetValue) {
    return `<span style="color: var(--accent-color)">${currentValue}</span>`;
  } else {
    return `${currentValue}/<span style="color: var(--accent-color)">${targetValue}</span>`;
  }
}

/**
 * Greedily deduct inventory items to cover an XP cost (Greedy Coin Change).
 *
 * Phase 1: floor-deduct highest-value items first — never over-spends a
 *          high-value item when lower-value items can cover the remainder.
 * Phase 2: if a fractional remainder persists, consume one more of the
 *          smallest available item (minimum waste, one-item ceiling step).
 *
 * Items must be sorted descending by xpValue.
 * Inventory floors at 0 when the player has fewer items than needed.
 */
export function deductXpItems(
  xpNeeded: number,
  items: Array<{ id: number; xpValue: number; owned: number }>,
  setOwned: (id: number, qty: number) => void,
): void {
  if (xpNeeded <= 0) return;
  let remaining = xpNeeded;
  const remainingOwned = items.map(item => item.owned);

  // Phase 1: floor-deduct highest-value items first
  for (let i = 0; i < items.length; i++) {
    if (remaining <= 0) break;
    const item = items[i];
    if (remainingOwned[i] <= 0 || item.xpValue <= 0) continue;
    const toUse = Math.min(remainingOwned[i], Math.floor(remaining / item.xpValue));
    if (toUse > 0) {
      remainingOwned[i] -= toUse;
      setOwned(item.id, remainingOwned[i]);
      remaining -= toUse * item.xpValue;
    }
  }

  // Phase 2: cover fractional remainder with one more of the smallest available item
  if (remaining > 0) {
    for (let i = items.length - 1; i >= 0; i--) {
      if (remainingOwned[i] > 0 && items[i].xpValue > 0) {
        setOwned(items[i].id, remainingOwned[i] - 1);
        break;
      }
    }
  }
}

/**
 * Dry-run of the greedy XP deduction — returns how many of each item would be
 * consumed (same index order as input) without modifying any state.
 * Mirrors the Phase 1 + Phase 2 logic of deductXpItems exactly.
 */
export function simulateXpDeduction(
  xpNeeded: number,
  items: Array<{ id: number; xpValue: number; owned: number }>,
): number[] {
  const consumed = items.map(() => 0);
  if (xpNeeded <= 0) return consumed;

  const remainingOwned = items.map(i => i.owned);
  let remaining = xpNeeded;

  for (let i = 0; i < items.length; i++) {
    if (remaining <= 0) break;
    if (remainingOwned[i] <= 0 || items[i].xpValue <= 0) continue;
    const toUse = Math.min(remainingOwned[i], Math.floor(remaining / items[i].xpValue));
    if (toUse > 0) {
      consumed[i] += toUse;
      remainingOwned[i] -= toUse;
      remaining -= toUse * items[i].xpValue;
    }
  }

  if (remaining > 0) {
    for (let i = items.length - 1; i >= 0; i--) {
      if (remainingOwned[i] > 0 && items[i].xpValue > 0) {
        consumed[i] += 1;
        break;
      }
    }
  }

  return consumed;
}

/**
 * Format skill cost display
 */
export function formatSkillCost(cost: number[], current: number, target: number) {
  if (!cost?.length) return '';
  const currentValue = cost[current - 1] || cost[0];
  const targetValue = cost[target - 1] || cost[0];
  
  return formatValueWithTarget(currentValue, targetValue);
}

