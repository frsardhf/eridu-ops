// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, reactive, type App } from 'vue';
import type { ResourceProps } from '@/types/resource';
import type { Material, SectionId } from '@/types/upgrade';
import type { StudentProps } from '@/types/student';
import { computeUpgradePreview } from '../useApplyUpgrade';
import ApplyUpgradeModal from '@/components/students/modal/ApplyUpgradeModal.vue';

const data = vi.hoisted(() => ({
  costs: {} as Partial<Record<SectionId, Material[]>>,
  items: {} as Record<number, ResourceProps>,
  equipment: {} as Record<number, ResourceProps>,
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
vi.mock('@/composables/useStudentGearDisplay', () => ({
  getEquipmentTypeName: (type: string) => type,
}));
vi.mock('@/lib/stores/resourceCacheStore', () => ({
  getAllEquipmentFromCache: () => data.equipment,
  getEquipmentDataByIdSync: (id: number) => data.equipment[id],
  getResourceDataByIdSync: (id: number) => data.items[id],
}));
vi.mock('@/lib/utils/upgradeMaterialUtils', () => ({
  calculateLevelMaterials: () => data.costs.level ?? [],
  calculateSkillMaterials: () => data.costs.skills ?? [],
  calculatePotentialMaterials: () => data.costs.potential ?? [],
  computeCharacterXpCost: (current: number, target: number) => (current < target ? 100 : 0),
  getCharXpItems: (owned: (id: number) => number) => [{ id: 10, xpValue: 50, owned: owned(10) }],
}));
vi.mock('@/lib/utils/gearMaterialUtils', () => ({
  calculateEquipmentMaterials: () => data.costs.equipment ?? [],
  calculateEquipmentCredits: () => [],
  calculateGradeMaterials: () => data.costs.grade ?? [],
  calculateGradeCredits: () => [],
  calculateExclusiveGearMaterials: () => data.costs.exclusive ?? [],
  computeEquipmentXpCost: (levels: { Hat?: { current: number; target: number } }) =>
    levels.Hat && levels.Hat.current < levels.Hat.target ? 100 : 0,
  getEquipXpItems: (owned: (id: number) => number) => [{ id: 1, xpValue: 50, owned: owned(1) }],
}));

function resource(id: number, category = 'Material', tier = 0): ResourceProps {
  return {
    Id: id,
    Name: `resource-${id}`,
    Category: category,
    Tier: tier,
    Rarity: 'N',
    Quality: 1,
    Icon: `icon-${id}`,
    Tags: [],
  };
}
function need(
  item: ResourceProps,
  quantity: number,
  type: Material['type'] = 'materials',
): Material {
  return { material: item, materialQuantity: quantity, type };
}
function makeState(): Parameters<typeof computeUpgradePreview>[1] {
  return {
    student: { Id: 10000, Equipment: ['Hat'] } as StudentProps,
    characterLevels: { current: 1, target: 1 },
    skillLevels: {
      Ex: { current: 1, target: 2 },
      Public: { current: 1, target: 1 },
      Passive: { current: 1, target: 1 },
      ExtraPassive: { current: 1, target: 1 },
    },
    potentialLevels: {
      attack: { current: 0, target: 0 },
      maxhp: { current: 0, target: 0 },
      healpower: { current: 0, target: 0 },
    },
    equipmentLevels: {},
    gradeLevels: { current: 1, target: 1 },
    exclusiveGearLevel: { current: 0, target: 0 },
    gradeInfos: {},
    itemFormData: {},
    equipmentFormData: {},
  };
}
let app: App | undefined;
beforeEach(() => {
  data.costs = {};
  data.items = { 10: resource(10) };
  data.equipment = { 1: resource(1, 'Exp') };
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.replaceChildren();
});

describe('selected upgrade preview and affordability', () => {
  it.each<SectionId>(['level', 'skills', 'potential', 'equipment', 'grade', 'exclusive'])(
    'excludes unselected costs when only %s is selected',
    (section) => {
      const state = makeState();
      const sections: SectionId[] = [
        'level',
        'skills',
        'potential',
        'equipment',
        'grade',
        'exclusive',
      ];
      sections.forEach((id, index) => {
        data.costs[id] = [need(resource(100 + index), 5)];
      });
      const preview = computeUpgradePreview([section], state);
      expect(preview.items).toHaveLength(1);
      expect(preview.insufficientList).toEqual([data.costs[section]![0].material.Name]);
    },
  );

  it('combines shared material costs across selected sections', () => {
    const state = makeState();
    data.costs.skills = [need(resource(5), 8, 'credits')];
    data.costs.equipment = [need(resource(5), 4, 'credits')];
    state.itemFormData[5] = 10;
    expect(computeUpgradePreview(['skills'], state).insufficientList).toEqual([]);
    const combined = computeUpgradePreview(['skills', 'equipment'], state);
    expect(combined.insufficientList).toEqual(['resource-5']);
    expect(combined.items[0]).toMatchObject({ needed: 12, remaining: -2 });
  });

  it('detects EXP shortages even when no owned EXP items appear in the preview', () => {
    const state = makeState();
    state.characterLevels.target = 2;
    state.equipmentLevels.Hat = { current: 1, target: 2 };
    const preview = computeUpgradePreview(['level', 'equipment'], state);
    expect(preview.items).toEqual([]);
    expect(preview.insufficientList).toEqual(['activityReport', 'equipmentXp']);
    expect(computeUpgradePreview(['skills'], state).insufficientList).toEqual([]);
    state.itemFormData[10] = 2;
    state.equipmentFormData[1] = 2;
    expect(computeUpgradePreview(['level', 'equipment'], state).insufficientList).toEqual([]);
  });

  it('uses general blueprints and current form quantities for affordability', () => {
    const state = makeState();
    const hat = resource(1003, 'Hat', 4);
    data.equipment[hat.Id] = hat;
    data.equipment[501000] = resource(501000, 'Hat');
    data.costs.equipment = [need(hat, 5, 'equipments')];
    state.equipmentFormData = { 1003: 3, 501000: 10 };
    const preview = computeUpgradePreview(['equipment'], state);
    expect(preview.insufficientList).toEqual([]);
    expect(preview.items.map((item) => [item.material.Id, item.needed])).toEqual([
      [1003, 3],
      [501000, 10],
    ]);
    state.equipmentFormData[501000] = 9;
    expect(computeUpgradePreview(['equipment'], state).insufficientList).toEqual(['resource-1003']);
  });

  it('keeps item and equipment IDs separate', () => {
    const state = makeState();
    data.costs.skills = [need(resource(101), 2)];
    data.equipment[101] = resource(101, 'Hat', 1);
    data.costs.equipment = [need(data.equipment[101], 3, 'equipments')];
    state.itemFormData[101] = 2;
    state.equipmentFormData[101] = 3;
    const preview = computeUpgradePreview(['skills', 'equipment'], state);
    expect(preview.insufficientList).toEqual([]);
    expect(preview.items).toHaveLength(2);
  });

  it('enables Apply after deselecting unaffordable equipment and reacts to inventory edits', async () => {
    const state = reactive(makeState());
    state.equipmentLevels.Hat = { current: 1, target: 2 };
    data.costs.skills = [need(resource(101), 2)];
    state.itemFormData[101] = 2;
    const onApply = vi.fn();
    app = createApp({
      render: () =>
        h(ApplyUpgradeModal, {
          student: state.student,
          characterLevels: state.characterLevels,
          skillLevels: state.skillLevels,
          potentialLevels: state.potentialLevels,
          equipmentLevels: state.equipmentLevels,
          gradeLevels: state.gradeLevels,
          exclusiveGearLevel: state.exclusiveGearLevel,
          computePreview: (ids: SectionId[]) => computeUpgradePreview(ids, state),
          onApply,
        }),
    });
    app.mount(document.createElement('div'));
    const apply = document.querySelector<HTMLButtonElement>('.modal-btn-primary')!;
    expect(apply.disabled).toBe(true);
    document.querySelector<HTMLInputElement>('#pill-equipment')!.click();
    await nextTick();
    expect(apply.disabled).toBe(false);
    expect(document.querySelector('.insufficient-warning')).toBeNull();
    state.itemFormData[101] = 1;
    await nextTick();
    expect(apply.disabled).toBe(true);
    state.itemFormData[101] = 2;
    await nextTick();
    apply.click();
    expect(onApply).toHaveBeenCalledWith(['skills']);
    document.querySelector<HTMLInputElement>('#pill-skills')!.click();
    await nextTick();
    expect(apply.disabled).toBe(true);
  });
});
