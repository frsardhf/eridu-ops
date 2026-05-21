/**
 * BondsPage tracked-students state.
 *
 * Wraps the `bondsTrackedStudents` AppSetting (localStorage). On first read,
 * if the setting is undefined, auto-seeds from existing gift activity:
 *   1. Students with non-zero giftFormData or boxFormData entries (allocated)
 *   2. Students whose planned materials (gear or skill/level) include any
 *      Category === 'Favor' item (planned demand)
 *
 * After the one-shot seed, the list is under manual control via
 * addStudent/removeStudent/toggleTracked.
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { getSettings, updateSetting, type AppSettings } from '../utils/settingsStorage';
import { studentDataStore } from '../stores/studentStore';
import { getAllGearsData } from '../stores/gearsStore';
import { getAllMaterialsData } from '../stores/materialsStore';
import { isSecondaryStudent, getPrimaryStudentId } from '../constants/linkedStudents';
import type { Material } from '../../types/upgrade';

function hasNonZeroEntries(rec: Record<string, number> | undefined): boolean {
  if (!rec) return false;
  for (const v of Object.values(rec)) {
    if (v > 0) return true;
  }
  return false;
}

function materialsContainFavor(materials: Material[] | undefined): boolean {
  if (!materials?.length) return false;
  return materials.some(m => m.material?.Category === 'Favor');
}

/**
 * Aggregated Favor-category material needs for one student across both their
 * gear and upgrade material plans. Keyed by item ID with the summed quantity.
 *
 * Powers the "Consumed" cards in BondsStudentEditor.
 */
export interface StudentFavorMaterialNeed {
  material: Material['material'];
  quantity: number;
}

export function getStudentFavorMaterialNeeds(studentId: number): StudentFavorMaterialNeed[] {
  const id = getPrimaryStudentId(studentId);
  const byId = new Map<number, StudentFavorMaterialNeed>();

  const collect = (materials: Material[] | undefined) => {
    if (!materials?.length) return;
    for (const m of materials) {
      if (m.material?.Category !== 'Favor') continue;
      const mid = m.material?.Id;
      if (!mid) continue;
      const existing = byId.get(mid);
      if (existing) existing.quantity += m.materialQuantity;
      else byId.set(mid, { material: m.material, quantity: m.materialQuantity });
    }
  };

  collect(getAllGearsData()[id]);
  collect(getAllMaterialsData()[id]);

  return [...byId.values()].sort((a, b) => b.quantity - a.quantity);
}

function computeAutoSeed(): number[] {
  const seed = new Set<number>();

  // Source 1 — bond tab activity (gifts/boxes allocated)
  Object.entries(studentDataStore.value).forEach(([id, form]) => {
    if (!form) return;
    if (form.isOwned === false) return;
    if (hasNonZeroEntries(form.giftFormData) || hasNonZeroEntries(form.boxFormData)) {
      seed.add(getPrimaryStudentId(Number(id)));
    }
  });

  // Source 2 — planned upgrade demand referencing Favor-category items
  const gears = getAllGearsData();
  Object.entries(gears).forEach(([id, materials]) => {
    if (studentDataStore.value[Number(id)]?.isOwned === false) return;
    if (materialsContainFavor(materials as Material[])) {
      seed.add(getPrimaryStudentId(Number(id)));
    }
  });

  const upgradeMaterials = getAllMaterialsData();
  Object.entries(upgradeMaterials).forEach(([id, materials]) => {
    if (studentDataStore.value[Number(id)]?.isOwned === false) return;
    if (materialsContainFavor(materials)) {
      seed.add(getPrimaryStudentId(Number(id)));
    }
  });

  // Strip any secondary IDs (defensive — getPrimaryStudentId should already handle this)
  return [...seed].filter(id => !isSecondaryStudent(id)).sort((a, b) => a - b);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic factory: a settings-backed ID set keyed by primary student ID.
// Used for both tracked-students and gift-planning opt-in — same CRUD shape.
// ─────────────────────────────────────────────────────────────────────────────

interface SettingsBackedSet {
  ids: ComputedRef<number[]>;
  has: (studentId: number) => boolean;
  add: (studentId: number) => void;
  remove: (studentId: number) => void;
  toggle: (studentId: number) => boolean;
  /** Direct ref handle (for first-time seeding paths). */
  raw: Ref<number[]>;
}

// Module-level cache so the singleton survives across `useBondsTracked()` calls.
const _settingsBackedCache = new Map<keyof AppSettings, SettingsBackedSet>();

function createSettingsBackedSet(key: keyof AppSettings): SettingsBackedSet {
  const cached = _settingsBackedCache.get(key);
  if (cached) return cached;

  const initial = (getSettings()[key] as number[] | undefined) ?? [];
  const raw = ref<number[]>(initial);

  const persist = (next: number[]) => {
    updateSetting(key, next as AppSettings[typeof key]);
  };

  const idSet = computed(() => new Set(raw.value));
  const ids = computed(() => raw.value);

  const has = (studentId: number) => idSet.value.has(getPrimaryStudentId(studentId));

  const add = (studentId: number) => {
    const id = getPrimaryStudentId(studentId);
    if (idSet.value.has(id)) return;
    const next = [...raw.value, id].sort((a, b) => a - b);
    raw.value = next;
    persist(next);
  };

  const remove = (studentId: number) => {
    const id = getPrimaryStudentId(studentId);
    if (!idSet.value.has(id)) return;
    const next = raw.value.filter(x => x !== id);
    raw.value = next;
    persist(next);
  };

  const toggle = (studentId: number) => {
    if (has(studentId)) { remove(studentId); return false; }
    add(studentId);
    return true;
  };

  const handle: SettingsBackedSet = { ids, has, add, remove, toggle, raw };
  _settingsBackedCache.set(key, handle);
  return handle;
}

let _seeded = false;

export function useBondsTracked() {
  const tracked = createSettingsBackedSet('bondsTrackedStudents');
  const planning = createSettingsBackedSet('bondsGiftPlanningEnabled');

  // First-call seed (deferred until after data has loaded — call site decides
  // when to invoke). Safe to call multiple times; only runs once per session.
  function seedIfNeeded(): boolean {
    if (_seeded) return false;
    const stored = getSettings().bondsTrackedStudents;
    if (stored !== undefined) {
      _seeded = true;
      return false;
    }
    const seed = computeAutoSeed();
    tracked.raw.value = seed;
    updateSetting('bondsTrackedStudents', seed);
    _seeded = true;
    return true;
  }

  return {
    // Tracked
    trackedIds: tracked.ids,
    isTracked: tracked.has,
    addStudent: tracked.add,
    removeStudent: tracked.remove,
    toggleTracked: tracked.toggle,
    seedIfNeeded,

    // Gift planning opt-in
    isGiftPlanningEnabled: planning.has,
    enableGiftPlanning: planning.add,
    disableGiftPlanning: planning.remove,
  };
}
