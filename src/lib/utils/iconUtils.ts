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

// ── Chibi 3D (live three.js path) ──────────────────────────────────────────────
// One GLB + manifest + shared mouth textures per character. Base maps are embedded in the
// GLB; only the mouth atlas + mask load externally (from `textures/`). Defaults to the local
// `public/chibi3d/` for dev; in production set VITE_CHIBI3D_BASE to the R2 origin (e.g.
// https://assets.eriduops.com/chibi3d) — the GLBs are too big / too many for the app host.
const CHIBI3D_BASE = (import.meta.env.VITE_CHIBI3D_BASE as string | undefined) ?? '/chibi3d';

export function getChibi3dManifestUrl(charId: string): string {
  return `${CHIBI3D_BASE}/${charId}/${charId}.manifest.json`;
}

export function getChibi3dModelUrl(charId: string, model: string): string {
  return `${CHIBI3D_BASE}/${charId}/${model}`;
}

export function getChibi3dTextureUrl(charId: string, file: string): string {
  return `${CHIBI3D_BASE}/${charId}/textures/${file}`;
}

// ── Chibi voice lines (SchaleDB R2 CDN) ────────────────────────────────────────
// In-game JP voice clips, e.g. the pickup line `ch0158_formation_select.mp3`. Played
// via an HTMLAudioElement (no CORS needed). Path: `voice/jp_<charId>/<charId>_<line>.mp3`.
const SCHALEDB_VOICE_BASE = 'https://r2.schaledb.com/voice';

export function getChibiVoiceUrl(charId: string, line: string): string {
  return `${SCHALEDB_VOICE_BASE}/jp_${charId}/${charId}_${line}.mp3`;
}
