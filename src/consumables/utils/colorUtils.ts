/**
 * Centralized color utility for BulletType, ArmorType, and SquadType colors.
 *
 * Color mapping follows the same-color-family principle:
 * - BulletType and ArmorType share the same color families
 * - Explosion/LightArmor = Red
 * - Pierce/HeavyArmor = Orange
 * - Mystic/SpecialArmor = Blue
 * - Sonic/ElasticArmor = Purple
 * - Chemical/CompositeArmor = Teal
 */

/**
 * BulletType (attack type) color mapping
 */
export const BULLET_TYPE_COLORS: Record<string, string> = {
  Explosion: 'rgb(167, 12, 25)',
  Pierce: 'rgb(178, 109, 31)',
  Mystic: 'rgb(33, 111, 156)',
  Sonic: 'rgb(148, 49, 165)',
  Chemical: 'rgb(19, 121, 115)',
};

/**
 * ArmorType (defense type) color mapping
 * Same color families as BulletType
 */
export const ARMOR_TYPE_COLORS: Record<string, string> = {
  LightArmor: 'rgb(167, 12, 25)',
  HeavyArmor: 'rgb(178, 109, 31)',
  SpecialArmor: 'rgb(33, 111, 156)',
  Unarmed: 'rgb(33, 111, 156)', // Same as SpecialArmor (SchaleDB localization uses "Unarmed" for Special)
  ElasticArmor: 'rgb(148, 49, 165)',
  CompositeArmor: 'rgb(19, 121, 115)',
};

/**
 * SquadType (role) color mapping
 * Main = STRIKER (red), Support = SPECIAL (blue)
 */
export const SQUAD_TYPE_COLORS: Record<string, string> = {
  Main: 'rgba(204, 26, 37, 1)',
  Support: 'rgba(0, 107, 255, 1)',
};

const FALLBACK_COLOR = 'var(--text-secondary)';

/**
 * Convert an rgb/rgba color string to rgba with specified opacity
 * @param color - The color string (e.g., 'rgb(167, 12, 25)' or 'rgba(167, 12, 25, 1)')
 * @param opacity - The opacity value (0-1)
 * @returns RGBA color string
 */
export function colorWithOpacity(color: string, opacity: number): string {
  // Handle rgb format
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
  }

  // Handle rgba format
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${opacity})`;
  }

  // Return original if no match
  return color;
}

/**
 * Get color for a BulletType (attack type)
 * @param bulletType - The BulletType value (e.g., 'Explosion', 'Pierce', 'Mystic', 'Sonic', 'Chemical')
 * @returns RGB color string or fallback color
 */
export function getBulletTypeColor(bulletType: string | undefined | null): string {
  if (!bulletType) return FALLBACK_COLOR;
  return BULLET_TYPE_COLORS[bulletType] ?? FALLBACK_COLOR;
}

/**
 * Get color for an ArmorType (defense type)
 * @param armorType - The ArmorType value (e.g., 'LightArmor', 'HeavyArmor', 'SpecialArmor', 'ElasticArmor', 'CompositeArmor')
 * @returns RGB color string or fallback color
 */
export function getArmorTypeColor(armorType: string | undefined | null): string {
  if (!armorType) return FALLBACK_COLOR;
  return ARMOR_TYPE_COLORS[armorType] ?? FALLBACK_COLOR;
}

/**
 * Get color for a SquadType (role)
 * @param squadType - The SquadType value ('Main' for STRIKER, 'Support' for SPECIAL)
 * @returns RGBA color string or fallback color
 */
export function getSquadTypeColor(squadType: string | undefined | null): string {
  if (!squadType) return FALLBACK_COLOR;
  return SQUAD_TYPE_COLORS[squadType] ?? FALLBACK_COLOR;
}
