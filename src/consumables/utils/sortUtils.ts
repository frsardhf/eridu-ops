import { SortDirection, SortOption } from '@/types/header';
import { StudentProps } from '@/types/student';

type ResolveCategory = 'School' | 'Club';

interface SortStudentsParams {
  students: StudentProps[];
  pinnedStudentIds: string[];
  searchQuery: string;
  sortOption: SortOption;
  sortDirection: SortDirection;
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
    case 'pinned':
      return 0;
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

export function sortStudentsWithPins({
  students,
  pinnedStudentIds,
  searchQuery,
  sortOption,
  sortDirection,
  studentStore,
  resolveLocalized
}: SortStudentsParams): StudentProps[] {
  const normalizedQuery = normalizeText(searchQuery || '');

  const filteredStudents = normalizedQuery
    ? students.filter(student =>
        normalizeText(student.Name || '').includes(normalizedQuery)
      )
    : students;

  const pinnedSet = new Set(pinnedStudentIds);
  const pinnedMap = new Map<string, StudentProps>();
  const unpinnedStudents: StudentProps[] = [];

  filteredStudents.forEach(student => {
    const id = String(student.Id);
    if (pinnedSet.has(id)) {
      pinnedMap.set(id, student);
      return;
    }
    unpinnedStudents.push(student);
  });

  unpinnedStudents.sort((a, b) =>
    compareStudents(a, b, sortOption, sortDirection, studentStore, resolveLocalized)
  );

  const pinnedStudentsOrdered: StudentProps[] = [];
  pinnedStudentIds.forEach(id => {
    const student = pinnedMap.get(id);
    if (student) {
      pinnedStudentsOrdered.push(student);
    }
  });

  return [...pinnedStudentsOrdered, ...unpinnedStudents];
}
