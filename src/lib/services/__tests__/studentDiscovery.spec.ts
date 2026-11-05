import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormRecord, StudentRecord } from '@/lib/db/database';
import { saveStudents } from '../dbService';
import { initializeStudentFormData } from '../studentFormService';

const storage = vi.hoisted(() => ({
  students: new Map<number, StudentRecord>(),
  forms: new Map<number, FormRecord>(),
  transaction: vi.fn(
    async (_mode: string, _table: unknown, formsOrWrite: unknown, write?: () => Promise<unknown>) =>
      (write ?? (formsOrWrite as () => Promise<unknown>))(),
  ),
}));

vi.mock('@/lib/db/database', () => ({
  db: {
    transaction: storage.transaction,
    students: {
      toCollection: () => ({ primaryKeys: async () => [...storage.students.keys()] }),
      bulkPut: async (rows: StudentRecord[]) =>
        rows.forEach((row) => storage.students.set(row.Id, row)),
    },
    forms: {
      get: async (id: number) => storage.forms.get(id),
      put: async (row: FormRecord) => storage.forms.set(row.studentId, row),
      bulkGet: async (ids: number[]) => ids.map((id) => storage.forms.get(id)),
      bulkPut: async (rows: FormRecord[]) =>
        rows.forEach((row) => storage.forms.set(row.studentId, row)),
    },
  },
}));

function student(id: number): StudentRecord {
  return { Id: id, Name: `Student ${id}` } as StudentRecord;
}

beforeEach(() => {
  storage.students.clear();
  storage.forms.clear();
  storage.transaction.mockClear();
});

describe('new-student ownership discovery', () => {
  it('seeds minimal unrecruited records on a fresh installation', async () => {
    expect(await saveStudents([student(1), student(2)])).toBe(true);
    expect([...storage.forms.values()]).toEqual([
      { studentId: 1, isOwned: false },
      { studentId: 2, isOwned: false },
    ]);
    expect(storage.transaction).toHaveBeenCalledOnce();
  });

  it('does not silently migrate known students with missing legacy forms', async () => {
    storage.students.set(1, student(1));
    await saveStudents([student(1), student(2)]);
    expect(storage.forms.has(1)).toBe(false);
    expect(storage.forms.get(2)).toEqual({ studentId: 2, isOwned: false });
  });

  it('does not recruit a discovered student when its modal initializes', async () => {
    await saveStudents([student(1)]);
    const form = await initializeStudentFormData(student(1));
    expect(form).toEqual({ studentId: 1, isOwned: false });
    expect(storage.forms.get(1)?.isOwned).toBe(false);
  });

  it('preserves saved ownership and future targets when master data is missing or refreshed', async () => {
    const form: FormRecord = {
      studentId: 1,
      isOwned: false,
      planEnabled: true,
      characterLevels: { current: 1, target: 80 },
    };
    storage.forms.set(1, form);
    storage.forms.set(2, { studentId: 2, isOwned: true });
    await saveStudents([student(1), student(2)]);
    await saveStudents([{ ...student(1), Name: 'Localized name' }, student(2)]);
    expect(storage.forms.get(1)).toEqual(form);
    expect(storage.forms.get(2)).toEqual({ studentId: 2, isOwned: true });
  });

  it('does not create a separate ownership record for linked secondary styles', async () => {
    await saveStudents([student(10098), student(10099)]);
    expect(storage.forms.get(10098)).toEqual({ studentId: 10098, isOwned: false });
    expect(storage.forms.has(10099)).toBe(false);
  });
});
