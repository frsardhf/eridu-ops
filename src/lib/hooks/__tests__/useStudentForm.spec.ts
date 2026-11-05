// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref, type App } from 'vue';
import type { StudentProps } from '@/types/student';
import type { FormRecord } from '@/lib/db/database';
import { updateEquipmentInCache } from '@/lib/stores/resourceCacheStore';
import { useStudentForm } from '../useStudentForm';
import { buildDefaultFormData } from '@/lib/services/studentFormService';
import { DEFAULT_SKILL_LEVELS, DEFAULT_POTENTIAL_LEVELS } from '@/types/upgrade';

const storage = vi.hoisted(() => ({
  get: vi.fn<(id: number) => Promise<FormRecord | undefined>>(),
}));
vi.mock('@/lib/db/database', () => ({ db: { forms: { get: storage.get } } }));
vi.mock('../useStudentData', () => ({ useStudentData: () => ({}) }));

function student(
  id: number,
  starGrade: number,
  equipment: StudentProps['Equipment'],
): StudentProps {
  return {
    Id: id,
    Name: `Student ${id}`,
    DefaultOrder: id,
    WeaponImg: '',
    ElephIcon: '',
    StarGrade: starGrade,
    Equipment: equipment,
    Gifts: [],
    Boxes: [],
    Gear: {
      Released: [],
      StatType: [],
      StatValue: [],
      TierUpMaterial: [],
      TierUpMaterialAmount: [],
      Name: '',
      Desc: '',
      Icon: '',
    },
    FavorItemUniqueTags: [],
    FavorItemTags: [],
    PotentialMaterial: 0,
    SkillExMaterial: [],
    SkillMaterial: [],
    SkillExMaterialAmount: [],
    SkillMaterialAmount: [],
    School: 'Abydos',
    CollectionBG: '',
    Club: '',
    SquadType: 'Main',
    TacticRole: '',
    BulletType: '',
    ArmorType: '',
    IsLimited: [0],
    Skills: {},
  };
}

const firstStudent = student(1, 3, ['Hat', 'Hairpin', 'Watch']);
const secondStudent = student(2, 1, ['Shoes', 'Bag', 'Charm']);
let app: App | undefined;

function mountForm() {
  const selected = ref(firstStudent);
  let form!: ReturnType<typeof useStudentForm>;
  app = createApp({
    setup() {
      form = useStudentForm(selected);
      return () => h('div');
    },
  });
  app.mount(document.createElement('div'));
  return { selected, form };
}

beforeEach(() => {
  storage.get.mockReset();
  storage.get.mockImplementation(async (id) => ({ studentId: id, isOwned: false }));
  for (let tier = 2; tier <= 7; tier++) {
    updateEquipmentInCache(1000 + tier, {
      Id: 1000 + tier,
      Name: `Shoes tier ${tier}`,
      Category: 'Shoes',
      Tier: tier,
      Rarity: 'N',
      Quality: 1,
      Icon: '',
      Tags: [],
      QuantityOwned: 0,
      Recipe: [],
    });
  }
});

afterEach(() => {
  app?.unmount();
  app = undefined;
});

describe('student form hydration when navigating students', () => {
  it('creates independent nested defaults without adding upgrade requirements', async () => {
    const first = buildDefaultFormData(firstStudent);
    const second = buildDefaultFormData(secondStudent);
    first.skillLevels.Ex.target = 5;
    first.potentialLevels.attack.target = 10;
    expect(second.skillLevels.Ex).toEqual({ current: 1, target: 1 });
    expect(second.potentialLevels.attack).toEqual({ current: 0, target: 0 });
    expect(DEFAULT_SKILL_LEVELS.Ex).toEqual({ current: 1, target: 1 });
    expect(DEFAULT_POTENTIAL_LEVELS.attack).toEqual({ current: 0, target: 0 });
    const { form } = mountForm();
    await form.loadFromIndexedDB();
    expect(form.allMaterialsNeeded.value).toEqual([]);
    expect(form.equipmentMaterialsNeeded.value).toEqual([]);
  });

  it('isolates fallback pairs when hydrating partially populated skill and potential slices', async () => {
    storage.get.mockImplementation(async (id) =>
      id === firstStudent.Id
        ? {
            studentId: id,
            skillLevels: { Ex: { current: 2, target: 3 } } as FormRecord['skillLevels'],
            potentialLevels: { attack: { current: 1, target: 2 } } as FormRecord['potentialLevels'],
          }
        : undefined,
    );
    const { selected, form } = mountForm();
    await form.loadFromIndexedDB();
    form.handleSkillUpdate('Public', 2, 4);
    form.handlePotentialUpdate('maxhp', 2, 5);
    selected.value = secondStudent;
    await form.loadFromIndexedDB();
    expect(form.skillLevels.value.Public).toEqual({ current: 1, target: 1 });
    expect(form.potentialLevels.value.maxhp).toEqual({ current: 0, target: 0 });
    expect(DEFAULT_SKILL_LEVELS.Public).toEqual({ current: 1, target: 1 });
    expect(DEFAULT_POTENTIAL_LEVELS.maxhp).toEqual({ current: 0, target: 0 });
  });

  it('uses the active student defaults for ownership-only records', async () => {
    const { selected, form } = mountForm();
    await form.loadFromIndexedDB();
    expect(form.gradeLevels.value).toEqual({ current: 3, target: 3 });

    selected.value = secondStudent;
    await form.loadFromIndexedDB();
    expect(form.gradeLevels.value).toEqual({ current: 1, target: 1 });
    expect(form.equipmentLevels.value).toEqual({
      Shoes: { current: 1, target: 1 },
      Bag: { current: 1, target: 1 },
      Charm: { current: 1, target: 1 },
    });

    form.handleEquipmentUpdate('Shoes', 1, 2);
    expect(form.equipmentLevels.value.Shoes).toEqual({ current: 1, target: 2 });
  });

  it('uses the active student defaults when no stored form exists', async () => {
    storage.get.mockResolvedValue(undefined);
    const { selected, form } = mountForm();
    await form.loadFromIndexedDB();
    selected.value = secondStudent;
    await form.loadFromIndexedDB();

    expect(form.gradeLevels.value).toEqual({ current: 1, target: 1 });
    expect(Object.keys(form.equipmentLevels.value)).toEqual(secondStudent.Equipment);
  });

  it('preserves stored upgrades while filling missing fields for the active student', async () => {
    storage.get.mockImplementation(async (id) => ({
      studentId: id,
      characterLevels: { current: 30, target: 60 },
      gradeLevels: { current: 2, target: 4 },
      equipmentLevels: { Shoes: { current: 4, target: 7 } },
    }));
    const { selected, form } = mountForm();
    selected.value = secondStudent;
    await form.loadFromIndexedDB();

    expect(form.characterLevels.value).toEqual({ current: 30, target: 60 });
    expect(form.gradeLevels.value).toEqual({ current: 2, target: 4 });
    expect(form.equipmentLevels.value).toEqual({
      Shoes: { current: 4, target: 7 },
      Bag: { current: 1, target: 1 },
      Charm: { current: 1, target: 1 },
    });
    await nextTick();
    expect(storage.get).toHaveBeenCalledWith(secondStudent.Id);
  });
});
