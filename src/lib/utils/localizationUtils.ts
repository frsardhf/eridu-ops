import { ref } from 'vue';
import { formatValueWithTarget } from './upgradeUtils';
import { SchaleLocalization, SchaleSkillBase } from '@/types/schaledb';

// Shared reactive cache for localization data fetched from SchaleDB
export const localizationData = ref<SchaleLocalization | null>(null);

/**
 * Fetch localization data from SchaleDB and populate the shared store
 * @param lang Language code (e.g. 'en', 'jp')
 * @returns Promise that resolves with the localization data
 */
export function fetchLocalizationData(lang: string = 'en'): Promise<SchaleLocalization> {
  return fetch(`https://schaledb.com/data/${lang}/localization.json`)
    .then(response => response.json())
    .then((data: SchaleLocalization) => {
      localizationData.value = data;
      return data;
    });
}

/**
 * Returns the localized display name for a given localization category and key.
 * @param category The localization group (e.g. 'School', 'Club', 'SquadType').
 * @param key The raw key from the student data.
 * @returns The localized string if found; otherwise the original key or an empty string.
 */
export function resolveLocalized (category: keyof SchaleLocalization, key?: string) {
  if (!key) return '';
  const map = localizationData.value?.[category];
  if (!map) return '';
  return map[key] ?? key;
};

/**
 * Fetch localized buff name from the shared localization store
 * @param key The buff key to lookup (e.g. 'Buff_AttackPower')
 * @returns The localized buff name or the cleaned key as fallback
 */
export function fetchLocalizedBuffName(key: string): string {
  const cache = localizationData.value;
  if (cache?.BuffName?.[key]) {
    return cache.BuffName[key];
  }
  return key.replace(/^(Buff_|Debuff_|CC_|Special_)/, '');
}

/**
 * Format skill description with parameter replacements and tag processing
 */
export function formatSkillDescription(
  skill: SchaleSkillBase | undefined,
  current: number,
  target: number,
): string {
  if (!skill?.Desc || !skill?.Parameters) return '';

  let formattedDesc = skill.Desc;
  const parameters = skill.Parameters;

  // Replace parameter placeholders with current/target values
  parameters.forEach((paramGroup: number[], groupIndex: number) => {
    const currentValue = paramGroup[current - 1] ?? paramGroup[0];
    const targetValue = paramGroup[target - 1] ?? paramGroup[0];
    const placeholder = `<?${groupIndex + 1}>`;

    formattedDesc = formattedDesc.replace(
      placeholder,
      formatValueWithTarget(currentValue, targetValue)
    );
  });

  // Handle knockback tag <kb:value>
  formattedDesc = formattedDesc.replace(/<kb:(\d+)>/g, (match: string, valueIndex: string) => {
    const indexNum = parseInt(valueIndex, 10);
    if (!skill.Effects) return match;

    const knockbackEffect = skill.Effects.find(effect => effect.Type === 'Knockback');
    if (!knockbackEffect?.Scale) return match;

    let knockbackSum = 0;
    for (let i = 0; i <= indexNum && i < knockbackEffect.Scale.length; i++) {
      knockbackSum += knockbackEffect.Scale[i] ?? 0;
    }
    return `${knockbackSum} units`;
  });

  // Process special tags with localization data. Some tags carry an inline
  // display override inside the brackets, e.g. <s:CH0076_Ex='Keychains'> — when
  // present, use the quoted text verbatim so the raw key never leaks. Plain tags
  // (<s:CH0076_Ex>, <b:AttackPower>) fall through to the localization lookup.
  formattedDesc = formattedDesc.replace(/<([bcds]):([^>=']+)(?:='([^']*)')?>/g,
    (match: string, tagType: string, value: string, override?: string) => {
      if (override !== undefined) return override;
      let prefix = '';
      switch (tagType) {
        case 'b': prefix = 'Buff_'; break;
        case 'd': prefix = 'Debuff_'; break;
        case 'c': prefix = 'CC_'; break;
        case 's': prefix = 'Special_'; break;
      }
      const localizedName = fetchLocalizedBuffName(prefix + value);
      return localizedName || value;
    });

  return formattedDesc;
}
