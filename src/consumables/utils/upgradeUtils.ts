// materialUtils.ts
import { type Ref } from 'vue';

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
 * Calculates tooltip position to avoid going off-screen
 */
export function calculateTooltipPosition(event: MouseEvent, tooltipWidth: number, tooltipHeight: number) {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  
  // Calculate position
  let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
  let top = rect.top - tooltipHeight - 10; // 10px gap
  
  // Adjust if tooltip would go off screen
  if (left < 0) left = 0;
  if (left + tooltipWidth > window.innerWidth) {
    left = window.innerWidth - tooltipWidth;
  }
  
  // If tooltip would go off top of screen, show below instead
  if (top < 0) {
    top = rect.bottom + 10;
  }
  
  return {
    top: `${top}px`,
    left: `${left}px`
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
 * Format skill cost display
 */
export function formatSkillCost(cost: number[], current: number, target: number) {
  if (!cost?.length) return '';
  const currentValue = cost[current - 1] || cost[0];
  const targetValue = cost[target - 1] || cost[0];
  
  return formatValueWithTarget(currentValue, targetValue);
}

/**
 * Get full URL for skill icon
 */
export function getSkillIconUrl(iconName: string) {
  return `https://schaledb.com/images/skill/${iconName}.webp`;
}

/**
 * Get full URL for potential icon
 */
export function getPotentialIconUrl(iconName: string) {
  return `https://schaledb.com/images/item/icon/${iconName}.webp`;
}