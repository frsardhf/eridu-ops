import { resolveLocalized } from '@/consumables/utils/localizationUtils';
import { getSquadTypeColor, getBulletTypeColor, getArmorTypeColor } from '@/consumables/utils/colorUtils';

export const SQUAD_TYPE_KEYS = ['Main', 'Support'] as const;
export const STAR_GRADE_VALUES = [1, 2, 3] as const;
export const BULLET_TYPE_KEYS = ['Explosion', 'Pierce', 'Mystic', 'Sonic', 'Chemical'] as const;
// Unarmed = Special Armor in-game; kept as a single representative key (matches SpecialArmor too)
export const ARMOR_TYPE_KEYS = ['LightArmor', 'HeavyArmor', 'ElasticArmor', 'Unarmed', 'CompositeArmor'] as const;
export const EQUIPMENT_TYPE_KEYS = ['Hat', 'Gloves', 'Shoes', 'Bag', 'Badge', 'Hairpin', 'Charm', 'Watch', 'Necklace'] as const;

// Schools grouped under a single "Other" chip in the filter panel
// (crossover / catch-all schools that aren't part of the main Blue Archive setting)
export const OTHER_SCHOOL_KEYS = ['ETC', 'Tokiwadai', 'Sakugawa'] as const;
const OTHER_SCHOOL_SET = new Set<string>(OTHER_SCHOOL_KEYS);
export function isOtherSchool(key: string): boolean {
  return OTHER_SCHOOL_SET.has(key);
}

export const AVAILABILITY_OPTIONS = [
  { value: 0, key: 'filter.regular' },
  { value: 1, key: 'filter.limited' },
  { value: 2, key: 'filter.unique' },
  { value: 3, key: 'filter.fest' },
  { value: 4, key: 'filter.perm3star' },
] as const;

export function useFilterLabels() {
  function getSquadLabel(key: string): string {
    return resolveLocalized('SquadType', key) || key;
  }

  function getBulletLabel(key: string): string {
    return resolveLocalized('BulletType', key) || key;
  }

  function getArmorLabel(key: string): string {
    return resolveLocalized('ArmorType', key) || key;
  }

  function getSchoolLabel(key: string): string {
    return resolveLocalized('School', key) || key;
  }

  function getSquadColor(key: string): string {
    return getSquadTypeColor(key);
  }

  function getBulletColor(key: string): string {
    return getBulletTypeColor(key);
  }

  function getArmorColor(key: string): string {
    return getArmorTypeColor(key);
  }

  return {
    getSquadLabel,
    getBulletLabel,
    getArmorLabel,
    getSchoolLabel,
    getSquadColor,
    getBulletColor,
    getArmorColor,
  };
}
