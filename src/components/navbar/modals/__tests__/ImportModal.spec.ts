// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, type App } from 'vue';
import { importFromOtherSite } from '@/lib/services/importExportService';
import ImportModal from '../ImportModal.vue';

vi.mock('@/locales', () => ({ $t: (key: string) => key }));
vi.mock('@/lib/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
vi.mock('@/lib/services/importExportService', () => ({
  importLocalStorageData: vi.fn(),
  importFromOtherSite: vi.fn(),
}));

let app: App;
let root: HTMLElement;

async function startTextImport() {
  root = document.createElement('div');
  app = createApp(ImportModal);
  app.mount(root);
  root.querySelectorAll<HTMLButtonElement>('.method-button')[1].click();
  await nextTick();
  const textarea = root.querySelector<HTMLTextAreaElement>('textarea')!;
  textarea.value = 'test import';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  root.querySelector<HTMLButtonElement>('.import-button')!.click();
  await nextTick();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  app?.unmount();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('pasted-text import feedback', () => {
  it('shows pending status and the failure message without switching to file import', async () => {
    let finishImport!: (success: boolean) => void;
    vi.mocked(importFromOtherSite).mockReturnValue(
      new Promise<boolean>((resolve) => {
        finishImport = resolve;
      }),
    );

    await startTextImport();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('importingData');
    expect(root.querySelector<HTMLButtonElement>('.import-button')?.disabled).toBe(true);
    expect(root.querySelector<HTMLTextAreaElement>('textarea')?.disabled).toBe(true);

    finishImport(false);
    await nextTick();
    await nextTick();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('importFailed');
    expect(root.querySelector<HTMLTextAreaElement>('textarea')?.disabled).toBe(false);
    expect(root.querySelector('.dropzone')).toBeNull();
  });

  it('shows the successful import status while waiting for the scheduled reload', async () => {
    vi.mocked(importFromOtherSite).mockResolvedValue(true);
    await startTextImport();
    await nextTick();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('importSuccessful');
    expect(root.querySelector('.dropzone')).toBeNull();
  });
});
