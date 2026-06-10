import { describe, expect, it } from 'vitest';
import { sortStudentsWithPins, splitAndSortStudents } from '../sortUtils';
import type { SortDirection, SortOption } from '@/types/header';
import type { StudentProps } from '@/types/student';
import { EMPTY_FILTERS } from '@/types/filter';

function makeStudent(overrides: Partial<StudentProps>): StudentProps {
  return {
    Id: 0,
    Name: '',
    DefaultOrder: 0,
    StarGrade: 1,
    School: 'Abydos',
    Club: 'Countermeasure',
    SquadType: 'Main',
    BulletType: 'Explosion',
    ArmorType: 'LightArmor',
    Equipment: ['Hat', 'Shoes', 'Bag'],
    IsLimited: [0],
    ...overrides,
  } as StudentProps;
}

const aru = makeStudent({ Id: 1, Name: 'Aru', DefaultOrder: 30, StarGrade: 3 });
const eimi = makeStudent({ Id: 2, Name: 'Eimi', DefaultOrder: 10, StarGrade: 2 });
const hina = makeStudent({ Id: 3, Name: 'Hina', DefaultOrder: 20, StarGrade: 3 });
const students = [aru, eimi, hina];

// Shape mirrors FormRecord; sortUtils only reads these slices.
const store: Record<number, any> = {
  1: {
    bondDetailData: { currentBond: 5 },
    characterLevels: { current: 40, target: 40 },
    gradeLevels: { current: 5, target: 5 },
    skillLevels: {
      Ex: { current: 3, target: 3 },
      Public: { current: 4, target: 4 },
      Passive: { current: 1, target: 1 },
      ExtraPassive: { current: 1, target: 1 },
    },
    potentialLevels: {
      attack: { current: 10, target: 10 },
      maxhp: { current: 5, target: 5 },
      healpower: { current: 0, target: 0 },
    },
    equipmentLevels: {
      Hat: { current: 8, target: 8 },
      Shoes: { current: 5, target: 5 },
      Bag: { current: 2, target: 2 },
    },
  },
  2: {
    bondDetailData: { currentBond: 20 },
    characterLevels: { current: 10, target: 10 },
    skillLevels: {
      Ex: { current: 5, target: 5 },
      Public: { current: 10, target: 10 },
      Passive: { current: 10, target: 10 },
      ExtraPassive: { current: 10, target: 10 },
    },
    potentialLevels: {
      attack: { current: 0, target: 0 },
      maxhp: { current: 0, target: 0 },
      healpower: { current: 0, target: 0 },
    },
    equipmentLevels: {
      Hat: { current: 1, target: 1 },
      Shoes: { current: 1, target: 1 },
      Bag: { current: 1, target: 1 },
    },
    isOwned: false,
  },
  // Student 3 has no form record at all: investment sorts treat it as 0.
};

function sortBy(
  option: SortOption,
  direction: SortDirection = 'asc',
  extra: Partial<Parameters<typeof sortStudentsWithPins>[0]> = {},
): string[] {
  return sortStudentsWithPins({
    students,
    pinnedStudentIds: [],
    searchQuery: '',
    sortOption: option,
    sortDirection: direction,
    isPinnedMode: false,
    studentStore: store,
    ...extra,
  }).map(s => s.Name);
}

describe('sortStudentsWithPins', () => {
  it('sorts by id ascending and descending', () => {
    expect(sortBy('id', 'asc')).toEqual(['Aru', 'Eimi', 'Hina']);
    expect(sortBy('id', 'desc')).toEqual(['Hina', 'Eimi', 'Aru']);
  });

  it('sorts by name and by default order', () => {
    expect(sortBy('name', 'asc')).toEqual(['Aru', 'Eimi', 'Hina']);
    expect(sortBy('default', 'asc')).toEqual(['Eimi', 'Hina', 'Aru']);
  });

  it('sorts by store-backed bond and level', () => {
    // bond: Aru 5, Eimi 20, Hina missing (0)
    expect(sortBy('bond', 'desc')).toEqual(['Eimi', 'Aru', 'Hina']);
    // level: Aru 40, Eimi 10, Hina missing (defaults to 1)
    expect(sortBy('level', 'desc')).toEqual(['Aru', 'Eimi', 'Hina']);
  });

  it('falls back to StarGrade for grade when no form data exists', () => {
    // grade: Aru 5 (form), Eimi missing gradeLevels -> StarGrade 2, Hina -> StarGrade 3
    expect(sortBy('grade', 'desc')).toEqual(['Aru', 'Hina', 'Eimi']);
  });

  it('sorts by total skill investment', () => {
    // skills: Aru 3+4+1+1=9, Eimi 5+10+10+10=35, Hina no form -> 0
    expect(sortBy('skill', 'desc')).toEqual(['Eimi', 'Aru', 'Hina']);
  });

  it('sorts by total equipment tier investment', () => {
    // equipment: Aru 8+5+2=15, Eimi 1+1+1=3, Hina no form -> 0
    expect(sortBy('equipment', 'desc')).toEqual(['Aru', 'Eimi', 'Hina']);
  });

  it('sorts by total potential investment', () => {
    // potential: Aru 10+5+0=15, Eimi 0, Hina no form -> 0; stable tie keeps input order
    expect(sortBy('potential', 'desc')).toEqual(['Aru', 'Eimi', 'Hina']);
    expect(sortBy('potential', 'asc')).toEqual(['Eimi', 'Hina', 'Aru']);
  });

  it('sorts by school through resolveLocalized when provided', () => {
    const localized = sortBy('school', 'asc', {
      students: [
        makeStudent({ Id: 1, Name: 'A', School: 'Gehenna' }),
        makeStudent({ Id: 2, Name: 'B', School: 'Abydos' }),
      ],
      resolveLocalized: (_cat, key) => (key === 'Gehenna' ? 'AAA-first' : 'ZZZ-last'),
    });
    expect(localized).toEqual(['A', 'B']);
  });

  it('filters by the search query before sorting', () => {
    expect(sortBy('id', 'asc', { searchQuery: 'hi' })).toEqual(['Hina']);
  });

  it('pinned mode groups pinned first, both groups by bond descending', () => {
    const names = sortStudentsWithPins({
      students,
      pinnedStudentIds: ['3', '1'],
      searchQuery: '',
      sortOption: 'name', // ignored while pinned
      sortDirection: 'asc',
      isPinnedMode: true,
      studentStore: store,
    }).map(s => s.Name);
    // pinned: Aru(bond 5) > Hina(0); unpinned: Eimi
    expect(names).toEqual(['Aru', 'Hina', 'Eimi']);
  });
});

describe('splitAndSortStudents', () => {
  const baseParams = {
    students,
    pinnedStudentIds: [] as string[],
    searchQuery: '',
    sortOption: 'id' as SortOption,
    sortDirection: 'asc' as SortDirection,
    isPinnedMode: false,
    studentStore: store,
  };

  it('splits owned and unowned (isOwned === false) groups', () => {
    const split = splitAndSortStudents(baseParams);
    expect(split.owned.map(s => s.Name)).toEqual(['Aru', 'Hina']);
    expect(split.unowned.map(s => s.Name)).toEqual(['Eimi']);
  });

  it('applies star-grade filters before splitting', () => {
    const split = splitAndSortStudents({
      ...baseParams,
      filters: { ...EMPTY_FILTERS, starGrade: [3] },
    });
    expect(split.owned.map(s => s.Name)).toEqual(['Aru', 'Hina']);
    expect(split.unowned).toEqual([]);
  });

  it('treats Unarmed and SpecialArmor as the same armor filter category', () => {
    const unarmed = makeStudent({ Id: 9, Name: 'Unarmed-kun', ArmorType: 'Unarmed' });
    const special = makeStudent({ Id: 10, Name: 'Special-chan', ArmorType: 'SpecialArmor' });
    const split = splitAndSortStudents({
      ...baseParams,
      students: [aru, unarmed, special],
      filters: { ...EMPTY_FILTERS, armorType: ['Unarmed'] },
    });
    expect(split.owned.map(s => s.Name)).toEqual(['Unarmed-kun', 'Special-chan']);
  });
});
