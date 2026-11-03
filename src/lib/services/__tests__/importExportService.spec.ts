// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FormRecord } from '@/lib/db/database';
import { downloadLocalStorageData, importLocalStorageData } from '../importExportService';

const storage = vi.hoisted(() => ({
  forms: {} as Record<number, FormRecord>,
  put: vi.fn<(forms: FormRecord[]) => Promise<void>>(),
}));
vi.mock('../dbService', () => ({
  getAllFormData: async () => storage.forms,
  getAllItemsInventories: async () => ({}),
  getAllEquipmentInventories: async () => ({}),
  getAllStudentsAsRecord: async () => ({}),
}));
vi.mock('@/lib/utils/settingsStorage', () => ({ getSettings: () => ({}), saveSettings: vi.fn() }));
vi.mock('../planHistoryService', () => ({ clearPlanHistory: vi.fn() }));
vi.mock('@/lib/db/database', () => ({
  db: {
    transaction: async (_mode: string, _tables: unknown[], write: () => Promise<void>) => write(),
    forms: { clear: vi.fn(), bulkPut: storage.put },
    items_inventory: { clear: vi.fn(), bulkPut: vi.fn() },
    equipment_inventory: { clear: vi.fn(), bulkPut: vi.fn() },
  },
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('native future-plan backups', () => {
  it('preserves ownership, planning opt-in, and targets through export and import', async () => {
    storage.forms = {
      1: {
        studentId: 1,
        isOwned: false,
        planEnabled: true,
        characterLevels: { current: 1, target: 90 },
      },
      2: { studentId: 2, isOwned: false, planEnabled: false },
    };
    let exportedBlob!: Blob;
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL(blob: Blob) {
          exportedBlob = blob;
          return 'blob:test';
        }
        static revokeObjectURL() {}
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();
    await downloadLocalStorageData();
    vi.runAllTimers();
    vi.useRealTimers();

    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(exportedBlob);
    });
    expect(
      await importLocalStorageData(new File([text], 'backup.json', { type: 'application/json' })),
    ).toBe(true);
    expect(storage.put).toHaveBeenCalledWith(Object.values(storage.forms));
  });
});
