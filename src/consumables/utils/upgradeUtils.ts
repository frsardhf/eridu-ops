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
 * Format skill cost display
 */
export function formatSkillCost(cost: number[], current: number, target: number) {
  if (!cost?.length) return '';
  const currentValue = cost[current - 1] || cost[0];
  const targetValue = cost[target - 1] || cost[0];
  
  return formatValueWithTarget(currentValue, targetValue);
}

