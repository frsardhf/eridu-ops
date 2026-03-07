/**
 * Linked Students — Student pairs that represent one in-game unit with multiple styles.
 *
 * In Blue Archive, some units (e.g., Hoshino Armed) have multiple "styles" that share
 * progression data (levels, bond, equipment, grades, gifts). SchaleDB stores them as
 * separate student entities linked via LinkedCharacterId.
 *
 * This module centralizes the definition and management of linked student pairs
 * to ensure consistent handling across the codebase.
 */

export interface LinkedStudentPair {
  primaryId: number;
  secondaryId: number;
}

/**
 * All linked student pairs.
 * To add a future pair, just add an entry here.
 */
export const LINKED_STUDENT_PAIRS: LinkedStudentPair[] = [
  { primaryId: 10098, secondaryId: 10099 },
];

/** Set of all secondary IDs for O(1) lookup */
export const SECONDARY_STUDENT_IDS: Set<number> = new Set(
  LINKED_STUDENT_PAIRS.map(pair => pair.secondaryId)
);

/** Map from secondary ID → primary ID */
const SECONDARY_TO_PRIMARY: Map<number, number> = new Map(
  LINKED_STUDENT_PAIRS.map(pair => [pair.secondaryId, pair.primaryId])
);

/** Map from primary ID → secondary ID */
const PRIMARY_TO_SECONDARY: Map<number, number> = new Map(
  LINKED_STUDENT_PAIRS.map(pair => [pair.primaryId, pair.secondaryId])
);

/** Check if a student ID is a secondary (hidden) linked student. */
export function isSecondaryStudent(id: number): boolean {
  return SECONDARY_STUDENT_IDS.has(id);
}

/** Check if a student ID is part of any linked pair (primary or secondary). */
export function isLinkedStudent(id: number): boolean {
  return PRIMARY_TO_SECONDARY.has(id) || SECONDARY_TO_PRIMARY.has(id);
}

/**
 * Get the primary ID for a student. If the student is already the primary
 * or is not linked, returns the input ID unchanged.
 */
export function getPrimaryStudentId(id: number): number {
  return SECONDARY_TO_PRIMARY.get(id) ?? id;
}

/**
 * Get the linked partner ID for a student.
 * Returns undefined if the student is not part of a linked pair.
 */
export function getLinkedPartnerId(id: number): number | undefined {
  return PRIMARY_TO_SECONDARY.get(id) ?? SECONDARY_TO_PRIMARY.get(id);
}

/** Check if a student ID has a linked partner. */
export function hasLinkedPartner(id: number): boolean {
  return PRIMARY_TO_SECONDARY.has(id) || SECONDARY_TO_PRIMARY.has(id);
}

/**
 * Filter out secondary student IDs from an array of students.
 * Used at the display layer to show only one card per linked pair.
 */
export function filterSecondaryStudents<T extends { Id: number }>(students: T[]): T[] {
  return students.filter(student => !isSecondaryStudent(student.Id));
}
