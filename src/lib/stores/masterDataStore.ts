// masterDataStore.ts - In-memory SchaleDB master data (students, items,
// equipment), the gift derivations built from it, and the sorted/filtered
// views over it. Populated by useStudentData's load pipeline; components read
// it through the useStudentData() facade rather than importing it directly.

import { ref, computed } from 'vue';
import { StudentProps } from '../../types/student';
import { GiftProps } from '../../types/gift';
import { studentDataStore } from './studentStore';
import {
  searchQuery,
  pinnedStudentIds,
  currentSort,
  sortDirection,
  isPinnedMode,
  activeFilters,
} from './uiPrefsStore';
import { splitAndSortStudents } from '../utils/sortUtils';
import { filterSecondaryStudents } from '../constants/linkedStudents';
import { resolveLocalized } from '../utils/localizationUtils';

// --- Master data (replaced wholesale by the load pipeline) ---
// Items/equipment (with inventory quantities) deliberately do NOT live here:
// resourceCacheStore is the single source for those, because it's the one that
// gets per-id updates when inventories change. Mirroring them here produced
// stale snapshots with zero consumers.

export const studentData = ref<{ [key: string]: StudentProps }>({});
export const favoredGift = ref<Record<string, GiftProps[]>>({});
export const allGifts = ref<Record<string, GiftProps[]>>({});
export const giftBoxData = ref<Record<string, GiftProps[]>>({});

// --- Load lifecycle flags (written by useStudentData's pipeline) ---

export const isLoading = ref<boolean>(true);
export const isReady = ref<boolean>(false);
// True when there is nothing to show AND the SchaleDB fetch failed (first
// visit offline, blocked, etc.). Drives the retry banner; never set while
// cached data is still on screen.
export const loadError = ref<boolean>(false);

// --- Derived views ---

export const availableSchools = computed(() => {
  const schools = new Set<string>();
  for (const s of Object.values(studentData.value)) {
    if (s.School) schools.add(s.School);
  }
  return [...schools].sort((a, b) =>
    resolveLocalized('School', a).localeCompare(resolveLocalized('School', b))
  );
});

// Join point between the master data above and the uiPrefsStore refs.
const splitStudents = computed(() => {
  return splitAndSortStudents({
    students: filterSecondaryStudents(Object.values(studentData.value)),
    pinnedStudentIds: pinnedStudentIds.value,
    searchQuery: searchQuery.value,
    sortOption: currentSort.value,
    sortDirection: sortDirection.value,
    isPinnedMode: isPinnedMode.value,
    studentStore: studentDataStore.value,
    resolveLocalized,
    filters: activeFilters.value,
  });
});

export const ownedStudentsArray = computed(() => splitStudents.value.owned);
export const unownedStudentsArray = computed(() => splitStudents.value.unowned);

// Concatenated owned + unowned for modal prev/next navigation
export const sortedStudentsArray = computed(() => [
  ...splitStudents.value.owned,
  ...splitStudents.value.unowned,
]);
