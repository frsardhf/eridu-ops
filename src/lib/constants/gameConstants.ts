// Character progression
export const MAX_LEVEL = 90;
export const MAX_POTENTIAL_LEVEL = 25;

// Bond
export const MIN_BOND_LEVEL = 1;
export const MAX_BOND_LEVEL = 100;

// Exclusive weapon grades (1–9)
export const MAX_GRADE = 9;
/** Grades 1–5 are gold stars; grades 6–9 are blue stars. Also the threshold below which the weapon is locked. */
export const WEAPON_STAR_THRESHOLD = 5;

// Exclusive gear level (0–2)
export const MAX_EXCLUSIVE_GEAR_LEVEL = 2;
/** Gear level ≥ 2 unlocks the GearPublic (Basic) skill enhancement */
export const GEAR_UNLOCK_PUBLIC_SKILL = 2;
/** Weapon grade ≥ 7 unlocks the WeaponPassive (Passive) skill enhancement */
export const GEAR_UNLOCK_PASSIVE_SKILL = 7;

// Skill level maxes — SchaleDB provides the real per-student max via Parameters[0].length;
// these are fallbacks for when that field is missing.
export const MAX_EX_SKILL_LEVEL = 5;
export const MAX_SKILL_LEVEL = 10;

// Exclusive gear T2 material cost (Credits)
export const EXCLUSIVE_GEAR_T2_CREDIT_COST = 500_000;

// Eleph / Eligma grade-info inputs
export const MAX_ELEPH_OWNED = 520;
export const MIN_ELEPH_PRICE = 1;
export const MAX_ELEPH_PRICE = 5;
export const MIN_ELEPH_PURCHASABLE = 1;
export const MAX_ELEPH_PURCHASABLE = 20;
