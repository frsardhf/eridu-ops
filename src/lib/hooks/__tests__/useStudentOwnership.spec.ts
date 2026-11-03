import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormRecord } from '@/lib/db/database';
import { studentDataStore } from '@/lib/stores/studentStore';
import { useStudentOwnership } from '../useStudentOwnership';

const storage = vi.hoisted(() => ({
  save: vi.fn<
    (id: number, data: Partial<FormRecord>, source: string) => Promise<FormRecord | null>
  >(),
}));
vi.mock('@/lib/services/studentPersistenceService', () => ({ saveFormData: storage.save }));

beforeEach(() => {
  studentDataStore.value = {
    10098: {
      studentId: 10098,
      isOwned: false,
      characterLevels: { current: 1, target: 90 },
      equipmentLevels: { Hat: { current: 1, target: 10 } },
    },
  };
  storage.save.mockReset();
  storage.save.mockImplementation(async (id, data) => ({
    ...studentDataStore.value[id],
    ...data,
    studentId: id,
  }));
});

describe('future student planning', () => {
  it('persists a linked student plan under the primary ID without changing ownership', async () => {
    const ownership = useStudentOwnership();
    expect(await ownership.setPlanEnabled(10099, true)).toBe(true);
    expect(storage.save).toHaveBeenCalledWith(10098, { planEnabled: true }, 'students');
    expect(ownership.isStudentOwned(10099)).toBe(false);
    expect(ownership.isStudentPlanned(10099)).toBe(true);
    expect(ownership.isStudentPlanActive(10099)).toBe(true);
  });

  it('excludes a stopped plan without deleting upgrade targets', async () => {
    const ownership = useStudentOwnership();
    await ownership.setPlanEnabled(10098, true);
    await ownership.setPlanEnabled(10098, false);
    expect(ownership.isStudentPlanActive(10098)).toBe(false);
    expect(studentDataStore.value[10098].characterLevels?.target).toBe(90);
    expect(studentDataStore.value[10098].equipmentLevels?.Hat?.target).toBe(10);
  });

  it('preserves targets on recruitment and no longer displays the future-plan state', async () => {
    const ownership = useStudentOwnership();
    await ownership.setPlanEnabled(10098, true);
    await ownership.setOwned(10098, true);
    expect(ownership.isStudentOwned(10098)).toBe(true);
    expect(ownership.isStudentPlanned(10098)).toBe(false);
    expect(ownership.isStudentPlanActive(10098)).toBe(true);
    expect(studentDataStore.value[10098].characterLevels?.target).toBe(90);
  });

  it('does not change the cached state when persistence fails', async () => {
    storage.save.mockResolvedValue(null);
    const ownership = useStudentOwnership();
    expect(await ownership.setPlanEnabled(10098, true)).toBe(false);
    expect(ownership.isStudentPlanned(10098)).toBe(false);
  });
});
