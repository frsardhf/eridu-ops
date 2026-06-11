/**
 * Pure SchaleDB image URL builders.
 * All functions are stateless — they take plain values and return URL strings.
 * No Vue reactivity; composables wrap these with toValue() where needed.
 */

const SCHALEDB_BASE = 'https://schaledb.com/images';

// ── Student images ────────────────────────────────────────────────────────────

export function getStudentPortraitUrl(id: number): string {
  return `${SCHALEDB_BASE}/student/portrait/${id}.webp`;
}

export function getStudentCollectionUrl(id: number): string {
  return `${SCHALEDB_BASE}/student/collection/${id}.webp`;
}

export function getStudentIconUrl(id: number): string {
  return `${SCHALEDB_BASE}/student/icon/${id}.webp`;
}

export function getBackgroundUrl(bg: string): string {
  return `${SCHALEDB_BASE}/background/${bg}.jpg`;
}

// ── Skills / weapons / gear ───────────────────────────────────────────────────

export function getSkillIconUrl(iconName: string): string {
  return `${SCHALEDB_BASE}/skill/${iconName}.webp`;
}

export function getWeaponIconUrl(weaponImg: string | null | undefined): string {
  if (!weaponImg) return '';
  return `${SCHALEDB_BASE}/weapon/${weaponImg}.webp`;
}

export function getEquipmentIconUrl(type: string, tier: number): string {
  return `${SCHALEDB_BASE}/equipment/icon/equipment_icon_${type.toLowerCase()}_tier${tier}.webp`;
}

export function getExclusiveGearIconUrl(studentId: number | null | undefined): string {
  if (!studentId) return '';
  return `${SCHALEDB_BASE}/gear/full/${studentId}.webp`;
}

/**
 * Builds the icon URL for an inventory item or equipment piece.
 * Equipment crafting pieces (Tier >= 1) use the '_piece' suffix.
 * Items with Tier === 0 or Tier undefined (e.g. equipment exp items) use the plain icon name.
 */
export function getItemIconUrl(icon: string, itemType: 'item' | 'equipment', tier?: number): string {
  const isEquipment = itemType === 'equipment';
  const iconName = isEquipment && !!tier ? `${icon}_piece` : icon;
  return `${SCHALEDB_BASE}/${isEquipment ? 'equipment' : 'item'}/icon/${iconName}.webp`;
}

export function getGiftIconUrl(icon: string, isBox: boolean): string {
  return `${SCHALEDB_BASE}/${isBox ? 'item/full' : 'item/icon'}/${icon}.webp`;
}

export function getGiftGradeIconUrl(grade: number): string {
  return `${SCHALEDB_BASE}/ui/Cafe_Interaction_Gift_0${grade}.png`;
}

// ── UI icons ──────────────────────────────────────────────────────────────────

// Schools without their own icon on SchaleDB — mapped to a fallback key
const SCHOOL_ICON_FALLBACKS: Record<string, string> = {
  Sakugawa: 'ETC',
};

export function getSchoolIconUrl(school: string): string {
  const key = SCHOOL_ICON_FALLBACKS[school] ?? school;
  return `${SCHALEDB_BASE}/schoolicon/${key}.png`;
}

export function getTypeIconUrl(type: 'Attack' | 'Defense'): string {
  return `${SCHALEDB_BASE}/ui/Type_${type}.png`;
}

export function getRoleIconUrl(tacticRole: string): string {
  return `${SCHALEDB_BASE}/ui/Role_${tacticRole}.png`;
}

export function getEquipmentSlotIconUrl(slot: string): string {
  return `${SCHALEDB_BASE}/ui/Icon_Inven_${slot}.png`;
}

export function getBondIconUrl(): string {
  return `${SCHALEDB_BASE}/ui/School_Icon_Schedule_Favor.png`;
}
