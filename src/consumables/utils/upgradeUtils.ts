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

// Cache for localization data to avoid repeated fetching
let localizationCache: Record<string, any> | null = null;

/**
 * Fetch localized buff names from the schaledb
 * @param key The buff key to lookup
 * @param cache Optional cache to use instead of global cache
 * @returns The localized buff name or the cleaned key
 */
export function fetchLocalizedBuffName(key: string, cache?: Record<string, any> | null) {
  // Use provided cache or global cache
  const useCache = cache || localizationCache;
  
  // If we have cached data and the key exists, return it
  if (useCache?.BuffName?.[key]) {
    return useCache.BuffName[key];
  }
  
  // If no match, return the cleaned key
  return key.replace(/^(Buff_|Debuff_|CC_|Special_)/, '');
}

/**
 * Fetch localization data from the server
 * @returns Promise that resolves with the localization data
 */
export function fetchLocalizationData(): Promise<Record<string, any>> {
  return fetch('https://schaledb.com/data/en/localization.json')
    .then(response => response.json())
    .then(data => {
      localizationCache = data;
      return data;
    });
}

/**
 * Format skill description with parameter replacements and tag processing
 */
export function formatSkillDescription(skill: any, current: number, target: number, cache?: Record<string, any> | null) {
  if (!skill?.Desc || !skill?.Parameters) return '';
  
  let formattedDesc = skill.Desc;
  const parameters = skill.Parameters;
  
  // First replace parameter placeholders with current/target values
  parameters.forEach((paramGroup: any[], groupIndex: number) => {
    const currentValue = paramGroup[current - 1] ?? paramGroup[0];
    const targetValue = paramGroup[target - 1] ?? paramGroup[0];
    const placeholder = `<?${groupIndex + 1}>`;
    
    formattedDesc = formattedDesc.replace(
      placeholder,
      formatValueWithTarget(currentValue, targetValue)
    );
  });
  
  // Handle knockback tag <kb:value> by finding Knockback effect and its scale value
  formattedDesc = formattedDesc.replace(/<kb:(\d+)>/g, (match: string, valueIndex: string) => {
    const indexNum = parseInt(valueIndex);
    if (!skill.Effects) return match;
    
    // Find the Knockback effect
    const knockbackEffect = skill.Effects.find((effect: any) => effect.Type === "Knockback");
    if (!knockbackEffect?.Scale) {
      return match;
    }
    
    // Calculate the sum of all knockback values up to the specified index
    let knockbackSum = 0;
    for (let i = 0; i <= indexNum && i < knockbackEffect.Scale.length; i++) {
      knockbackSum += knockbackEffect.Scale[i] ?? 0;
    }
    
    // Return a fixed format with the sum value and "units"
    return `${knockbackSum} units`;
  });
  
  // Process special tags with localization data
  formattedDesc = formattedDesc.replace(/<([bcds]):([^>]+)>/g, 
    (match: string, tagType: string, value: string) => {
    // Handle special tags according to the rules
    let prefix = '';
    
    switch (tagType) {
      case 'b': prefix = 'Buff_'; break;
      case 'd': prefix = 'Debuff_'; break;
      case 'c': prefix = 'CC_'; break;
      case 's': prefix = 'Special_'; break;
    }
    
    // Fetch the localized name
    const key = prefix + value;
    const localizedName = fetchLocalizedBuffName(key, cache);
    
    if (localizedName) {
      return localizedName;
    }
    
    return value;
  });
  
  return formattedDesc;
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