// studentFormService.ts - Centralized student form data initialization and management
// This service ensures atomic initialization of student form defaults to prevent race conditions

import { db, type FormRecord } from '../db/database';
import type { StudentProps } from '../../types/student';
import type { EquipmentType } from '../../types/gear';
import {
  DEFAULT_CHARACTER_LEVELS,
  DEFAULT_SKILL_LEVELS,
  DEFAULT_POTENTIAL_LEVELS
} from '../../types/upgrade';
import { DEFAULT_BOND_DETAIL } from '../../types/gift';

// Track which students have been initialized this session to avoid redundant checks
const initializedStudents = new Set<number>();

/**
 * Build the complete default form data for a student
 * This consolidates all default values from all composables into one place
 */
export function buildDefaultFormData(student: StudentProps): FormRecord {
  // Build equipment levels based on student's equipment types
  const equipmentLevels: Record<string, { current: number; target: number }> = {};
  if (student.Equipment) {
    student.Equipment.forEach(type => {
      equipmentLevels[type as EquipmentType] = { current: 1, target: 1 };
    });
  }

  const starGrade = student.StarGrade ?? 1;

  return {
    studentId: student.Id,
    // From useStudentGifts
    bondDetailData: { ...DEFAULT_BOND_DETAIL },
    giftFormData: {},
    boxFormData: {},
    // From useStudentUpgrade
    characterLevels: { ...DEFAULT_CHARACTER_LEVELS },
    skillLevels: { ...DEFAULT_SKILL_LEVELS },
    potentialLevels: { ...DEFAULT_POTENTIAL_LEVELS },
    // From useStudentGear
    equipmentLevels,
    gradeLevels: { current: starGrade, target: starGrade },
    gradeInfos: { owned: 0, price: 1, purchasable: 20 }
  };
}

/**
 * Initialize student form data if it doesn't exist
 * This is the ONLY place where default data should be written to IndexedDB
 *
 * @param student The student to initialize defaults for
 * @returns The form data (either existing or newly created defaults)
 */
export async function initializeStudentFormData(student: StudentProps): Promise<FormRecord> {
  const studentId = student.Id;

  // Quick check: if already initialized this session, just fetch and return
  if (initializedStudents.has(studentId)) {
    const existing = await db.forms.get(studentId);
    if (existing) return existing;
    // If somehow deleted, fall through to re-initialize
  }

  // Use a Dexie transaction to ensure atomicity
  return await db.transaction('rw', db.forms, async () => {
    // Check if data already exists
    const existing = await db.forms.get(studentId);

    if (existing) {
      // Data exists - mark as initialized and return
      initializedStudents.add(studentId);
      return existing;
    }

    // No data exists - create defaults atomically
    const defaults = buildDefaultFormData(student);
    await db.forms.put(defaults);

    initializedStudents.add(studentId);
    return defaults;
  });
}

/**
 * Check if a student has form data in IndexedDB
 * Does NOT initialize - use initializeStudentFormData for that
 */
export async function hasStudentFormData(studentId: number): Promise<boolean> {
  const existing = await db.forms.get(studentId);
  return existing !== undefined;
}

/**
 * Clear the session initialization cache
 * Useful for testing or when user clears data
 */
export function clearInitializationCache(): void {
  initializedStudents.clear();
}

/**
 * Remove a student from the initialization cache
 * Call this if student data is deleted
 */
export function removeFromInitializationCache(studentId: number): void {
  initializedStudents.delete(studentId);
}
