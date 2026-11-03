// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { StudentProps } from '@/types/student';
import type { CachedResource } from '@/types/resource';
import type { Material } from '@/types/upgrade';
import { studentDataStore } from '@/lib/stores/studentStore';
import { updateMaterialsData } from '@/lib/stores/materialsStore';
import { updateGearsData } from '@/lib/stores/gearsStore';
import {
  updateItemInCache,
  updateEquipmentInCache,
  getAllItemsFromCache,
} from '@/lib/stores/resourceCacheStore';
import { useResourceSummary } from '@/composables/useResourceSummary';
import { useMaterialCalculation } from '../useMaterialCalculation';
import { useGearCalculation } from '../useGearCalculation';
import { useGiftCalculation, getAllocatedGifts } from '../useGiftCalculation';

vi.mock('../useStudentData', () => ({
  useStudentData: () => ({
    studentData: ref({ 1: { Id: 1, Name: 'Future student' } as StudentProps }),
  }),
}));

function resource(Id: number, Category = 'Material', SubCategory = 'Artifact'): CachedResource {
  return {
    Id,
    Name: `resource-${Id}`,
    Category,
    SubCategory,
    Rarity: 'SR',
    Quality: 3,
    Icon: '',
    Tags: [],
    QuantityOwned: 0,
  };
}
function need(
  item: CachedResource,
  materialQuantity: number,
  type: Material['type'] = 'materials',
): Material {
  return { material: item, materialQuantity, type };
}
const artifact = resource(101);
const gift = resource(5001, 'Favor', '');
const blueprint = { ...resource(1002, 'Hat', ''), RecipeCost: 1500 };

beforeEach(() => {
  studentDataStore.value = {
    1: {
      studentId: 1,
      isOwned: false,
      planEnabled: true,
      characterLevels: { current: 1, target: 10 },
      equipmentLevels: { Hat: { current: 1, target: 3 } },
      giftFormData: { 5001: 99 },
      nonFavorGiftsMap: { 5001: 10 },
    },
  };
  updateMaterialsData(1, [need(artifact, 10), need(resource(5), 100, 'credits')]);
  updateGearsData(1, [
    need(artifact, 5),
    need(gift, 4),
    need(blueprint, 8, 'equipments'),
    need(resource(23), 20),
  ]);
  for (const item of [
    artifact,
    gift,
    resource(5),
    resource(23),
    resource(10, 'CharacterExpGrowth', ''),
  ]) {
    updateItemInCache(item.Id, item);
  }
  updateEquipmentInCache(blueprint.Id, blueprint);
  updateEquipmentInCache(1, resource(1, 'Exp', ''));
});

describe('unowned upgrade plans across inventory consumers', () => {
  it('includes items, credits, eligma, equipment, and both EXP budgets', () => {
    const materials = useMaterialCalculation();
    const gears = useGearCalculation();
    const summary = useResourceSummary(ref('missing'));

    expect(
      materials.totalMaterialsNeeded.value.find((m) => m.material.Id === 101)?.materialQuantity,
    ).toBe(15);
    expect(
      materials.totalMaterialsNeeded.value.find((m) => m.material.Id === 5)?.materialQuantity,
    ).toBe(100);
    expect(
      materials.totalMaterialsNeeded.value.find((m) => m.material.Id === 23)?.materialQuantity,
    ).toBe(20);
    expect(
      gears.totalEquipmentsNeeded.value.find((m) => m.material.Id === blueprint.Id)
        ?.materialQuantity,
    ).toBe(8);
    expect(materials.calculateExpNeeds().totalXpNeeded).toBeGreaterThan(0);
    expect(gears.calculateExpNeeds().totalXpNeeded).toBeGreaterThan(0);
    expect(summary.allStudentMaterialRows.value.map((row) => row.student.Id)).toEqual([1]);
    expect(
      summary.materialResourcesForMode.value.find((m) => m.material.Id === 101)?.remaining,
    ).toBe(-15);
    expect(
      summary.equipmentResourcesForMode.value.find((m) => m.material.Id === blueprint.Id)
        ?.remaining,
    ).toBe(-8);
  });

  it('counts exclusive-gear gifts but excludes stored bond allocations', () => {
    const gifts = useGiftCalculation();
    expect(gifts.getGiftNeededById()[gift.Id]).toBe(4);
    expect(gifts.getStudentsWithGifts()[0].totalGifts).toBe(4);
    expect(gifts.getGiftsForStudent(1)).toMatchObject([{ quantity: 4 }]);
    expect(getAllocatedGifts()).toEqual({});
  });

  it('removes costs reactively when stopped and restores them without double counting on recruitment', () => {
    const materials = useMaterialCalculation();
    const gears = useGearCalculation();
    const summary = useResourceSummary(ref('needed'));
    studentDataStore.value = { 1: { ...studentDataStore.value[1], planEnabled: false } };

    expect(materials.getMaterialUsageByStudents(artifact.Id)).toEqual([]);
    expect(gears.getEquipmentUsageByStudents(blueprint.Id)).toEqual([]);
    expect(materials.calculateExpNeeds().totalXpNeeded).toBe(0);
    expect(gears.calculateExpNeeds().totalXpNeeded).toBe(0);
    expect(summary.allStudentMaterialRows.value).toEqual([]);
    expect(useGiftCalculation().getGiftNeededById()[gift.Id]).toBeUndefined();

    studentDataStore.value = {
      1: { ...studentDataStore.value[1], isOwned: true, planEnabled: true },
    };
    expect(materials.getMaterialUsageByStudents(artifact.Id)[0].quantity).toBe(15);
    expect(gears.getEquipmentUsageByStudents(blueprint.Id)[0].quantity).toBe(8);
    expect(summary.allStudentMaterialRows.value).toHaveLength(1);
    expect(getAllItemsFromCache()[artifact.Id].QuantityOwned).toBe(0);
  });
});
