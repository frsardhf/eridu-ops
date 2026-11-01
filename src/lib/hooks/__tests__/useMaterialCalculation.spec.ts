import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { StudentProps } from '@/types/student';
import type { Material } from '@/types/upgrade';
import { studentDataStore } from '@/lib/stores/studentStore';
import { getAllMaterialsData, updateMaterialsData } from '@/lib/stores/materialsStore';
import { getAllGearsData, updateGearsData } from '@/lib/stores/gearsStore';
import { updateItemInCache } from '@/lib/stores/resourceCacheStore';
import { useMaterialCalculation } from '../useMaterialCalculation';

vi.mock('../useStudentData', () => ({
  useStudentData: () => ({
    studentData: ref({
      1: { Id: 1, Name: 'First student' } as StudentProps,
      2: { Id: 2, Name: 'Second student' } as StudentProps,
    }),
  }),
}));

const artifact = {
  Id: 101,
  Name: 'Artifact',
  Rarity: 'N',
  Category: 'Material',
  SubCategory: 'Artifact',
  Quality: 1,
  Icon: 'artifact',
  Tags: [],
  QuantityOwned: 0,
};

function need(quantity: number): Material {
  return { material: artifact, materialQuantity: quantity, type: 'materials' };
}

beforeEach(() => {
  studentDataStore.value = { 1: { studentId: 1 }, 2: { studentId: 2 } };
  for (const id of Object.keys(getAllMaterialsData())) updateMaterialsData(id, []);
  for (const id of Object.keys(getAllGearsData())) updateGearsData(id, []);
  updateItemInCache(artifact.Id, { ...artifact });
});

describe('material usage across upgrades and gear', () => {
  it('adds both sources for the same student and matches the global total', () => {
    updateMaterialsData(1, [need(10)]);
    updateGearsData(1, [need(5)]);
    const calculation = useMaterialCalculation();
    const usage = calculation.getMaterialUsageByStudents(artifact.Id);

    expect(usage.map(({ student, quantity }) => [student.Id, quantity])).toEqual([[1, 15]]);
    expect(
      calculation.totalMaterialsNeeded.value.find((m) => m.material.Id === artifact.Id),
    ).toMatchObject({ materialQuantity: 15 });
  });

  it.each([0, 12, 20])('reconciles missing quantities with %i owned', (owned) => {
    updateMaterialsData(1, [need(10)]);
    updateGearsData(1, [need(5)]);
    updateItemInCache(artifact.Id, { ...artifact, QuantityOwned: owned });
    const calculation = useMaterialCalculation();

    for (const mode of ['missing', 'equipment-missing'] as const) {
      const missing = calculation.getMaterialUsageByStudents(artifact.Id, mode);
      expect(missing.reduce((sum, entry) => sum + entry.quantity, 0)).toBe(Math.max(0, 15 - owned));
    }
  });

  it('includes gear-only students without duplicating their requirements', () => {
    updateMaterialsData(1, [need(10)]);
    updateGearsData(1, [need(5)]);
    updateGearsData(2, [need(7)]);
    updateItemInCache(artifact.Id, { ...artifact, QuantityOwned: 12 });
    const calculation = useMaterialCalculation();

    expect(
      calculation.getMaterialUsageByStudents(artifact.Id).map(({ quantity }) => quantity),
    ).toEqual([15, 7]);
    expect(
      calculation
        .getMaterialUsageByStudents(artifact.Id, 'missing')
        .reduce((sum, entry) => sum + entry.quantity, 0),
    ).toBe(10);
  });

  it('continues excluding unowned students from both sources', () => {
    updateMaterialsData(1, [need(10)]);
    updateGearsData(1, [need(5)]);
    studentDataStore.value = { 1: { studentId: 1, isOwned: false } };
    const calculation = useMaterialCalculation();

    expect(calculation.getMaterialUsageByStudents(artifact.Id)).toEqual([]);
    expect(
      calculation.totalMaterialsNeeded.value.find((m) => m.material.Id === artifact.Id),
    ).toBeUndefined();
  });
});
