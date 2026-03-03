/**
 * Pure SchaleDB image URL builders.
 * All functions are stateless — they take plain values and return URL strings.
 * No Vue reactivity; composables wrap these with toValue() where needed.
 */

export function getSkillIconUrl(iconName: string): string {
  return `https://schaledb.com/images/skill/${iconName}.webp`;
}

export function getPotentialIconUrl(iconName: string): string {
  return `https://schaledb.com/images/item/icon/${iconName}.webp`;
}

export function getWeaponIconUrl(weaponImg: string | null | undefined): string {
  if (!weaponImg) return '';
  return `https://schaledb.com/images/weapon/${weaponImg}.webp`;
}

export function getEquipmentIconUrl(type: string, tier: number): string {
  return `https://schaledb.com/images/equipment/icon/equipment_icon_${type.toLowerCase()}_tier${tier}.webp`;
}

export function getExclusiveGearIconUrl(studentId: number | null | undefined): string {
  if (!studentId) return '';
  return `https://schaledb.com/images/gear/full/${studentId}.webp`;
}

/**
 * Builds the icon URL for an inventory item or equipment piece.
 * Equipment items with tier > 0 use the '_piece' suffix.
 */
export function getItemIconUrl(icon: string, itemType: 'item' | 'equipment', tier?: number): string {
  const isEquipment = itemType === 'equipment';
  const iconName = isEquipment && tier !== 0 ? `${icon}_piece` : icon;
  return `https://schaledb.com/images/${isEquipment ? 'equipment' : 'item'}/icon/${iconName}.webp`;
}

export function getGiftIconUrl(icon: string, isBox: boolean): string {
  return `https://schaledb.com/images/${isBox ? 'item/full' : 'item/icon'}/${icon}.webp`;
}

export function getGiftGradeIconUrl(grade: number): string {
  return `https://schaledb.com/images/ui/Cafe_Interaction_Gift_0${grade}.png`;
}
