import { SortDirection, SortOption } from '@/types/header';
import { StudentProps } from '@/types/student';

export interface StudentSplit {
  owned: StudentProps[];
  unowned: StudentProps[];
}

type ResolveCategory = 'School' | 'Club';

interface SortStudentsParams {
  students: StudentProps[];
  pinnedStudentIds: string[];
  searchQuery: string;
  sortOption: SortOption;
  sortDirection: SortDirection;
  isPinnedMode: boolean;
  studentStore: Record<number, any>;
  resolveLocalized?: (category: ResolveCategory, key?: string) => string;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function toComparableValue(
  student: StudentProps,
  option: SortOption,
  studentStore: Record<number, any>,
  resolveLocalized?: (category: ResolveCategory, key?: string) => string
): number | string {
  switch (option) {
    case 'name':
      return student.Name ?? '';
    case 'default':
      return student.DefaultOrder ?? 0;
    case 'bond':
      return studentStore[student.Id]?.bondDetailData?.currentBond ?? 0;
    case 'level':
      return studentStore[student.Id]?.characterLevels?.current ?? 1;
    case 'grade':
      return studentStore[student.Id]?.gradeLevels?.current ?? student.StarGrade ?? 0;
    case 'school':
      return resolveLocalized?.('School', student.School) || student.School || '';
    case 'club':
      return resolveLocalized?.('Club', student.Club) || student.Club || '';
    case 'id':
    default:
      return Number(student.Id) || 0;
  }
}

function compareStudents(
  a: StudentProps,
  b: StudentProps,
  option: SortOption,
  direction: SortDirection,
  studentStore: Record<number, any>,
  resolveLocalized?: (category: ResolveCategory, key?: string) => string
): number {
  const aValue = toComparableValue(a, option, studentStore, resolveLocalized);
  const bValue = toComparableValue(b, option, studentStore, resolveLocalized);

  let comparison = 0;
  if (typeof aValue === 'string' || typeof bValue === 'string') {
    comparison = String(aValue).localeCompare(String(bValue));
  } else {
    comparison = aValue - bValue;
  }

  return direction === 'asc' ? comparison : -comparison;
}

function byBondDesc(studentStore: Record<number, any>) {
  return (a: StudentProps, b: StudentProps) =>
    (studentStore[b.Id]?.bondDetailData?.currentBond ?? 0) -
    (studentStore[a.Id]?.bondDetailData?.currentBond ?? 0);
}

export function sortStudentsWithPins({
  students,
  pinnedStudentIds,
  searchQuery,
  sortOption,
  sortDirection,
  isPinnedMode,
  studentStore,
  resolveLocalized,
}: SortStudentsParams): StudentProps[] {
  const normalizedQuery = normalizeText(searchQuery || '');

  const filtered = normalizedQuery
    ? students.filter(s => normalizeText(s.Name || '').includes(normalizedQuery))
    : students;

  if (isPinnedMode) {
    // Pinned mode: pinned group first then unpinned, both sorted by bond desc.
    const pinnedSet = new Set(pinnedStudentIds);
    const pinned: StudentProps[] = [];
    const unpinned: StudentProps[] = [];
    filtered.forEach(s => (pinnedSet.has(String(s.Id)) ? pinned : unpinned).push(s));
    const cmp = byBondDesc(studentStore);
    return [...pinned.sort(cmp), ...unpinned.sort(cmp)];
  }

  // Normal mode: flat list sorted by the selected option — no pinned priority.
  return filtered
    .slice()
    .sort((a, b) => compareStudents(a, b, sortOption, sortDirection, studentStore, resolveLocalized));
}

/**
 * Splits students into owned/unowned groups then sorts each independently.
 */
export function splitAndSortStudents(params: SortStudentsParams): StudentSplit {
  const allOwned: StudentProps[] = [];
  const allUnowned: StudentProps[] = [];
  for (const s of params.students) {
    if (params.studentStore[s.Id]?.isOwned === false) {
      allUnowned.push(s);
    } else {
      allOwned.push(s);
    }
  }

  return {
    owned:   sortStudentsWithPins({ ...params, students: allOwned }),
    unowned: sortStudentsWithPins({ ...params, students: allUnowned }),
  };
}
