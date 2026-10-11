// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, type App } from 'vue';
import InventoryScreenshotModal from '../InventoryScreenshotModal.vue';

vi.mock('@/locales', () => ({ $t: (key: string) => key }));
vi.mock('@/lib/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
vi.mock('@/lib/services/studentPersistenceService', () => ({
  saveItemsInventory: vi.fn(),
  saveEquipmentInventory: vi.fn(),
}));
vi.mock('@/lib/stores/resourceCacheStore', () => ({
  getAllItemsFromCache: () => ({}),
  getAllEquipmentFromCache: () => ({}),
  updateItemInCache: vi.fn(),
  updateEquipmentInCache: vi.fn(),
  getResourceDataByIdSync: () => null,
  getEquipmentDataByIdSync: () => null,
}));
vi.mock('@/lib/utils/filterUtils', () => ({ applyFilters: () => [] }));
vi.mock('@/components/inventory/ResourceCard.vue', () => ({ default: { render: () => null } }));

const reportId = 'a'.repeat(32);
let app: App;
let root: HTMLElement;
let fetchMock: ReturnType<typeof vi.fn>;

async function settle() {
  for (let i = 0; i < 15; i++) await nextTick();
}

function control<T extends HTMLElement>(selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

async function mount() {
  root = document.createElement('div');
  app = createApp(InventoryScreenshotModal);
  app.mount(root);
  control<HTMLButtonElement>('.type-btn').click();
  await settle();
}

async function scan(share = false) {
  const checkbox = control<HTMLInputElement>('.debug-consent input');
  checkbox.checked = share;
  checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  const input = control<HTMLInputElement>('.file-input');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [new File(['test image'], 'screenshot.png', { type: 'image/png' })],
  });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await settle();
}

beforeEach(async () => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL() {
        return 'blob:test';
      }
      static revokeObjectURL() {}
    },
  );
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 1920;
      naturalHeight = 1080;
      onload?: () => void;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  await mount();
});

afterEach(() => {
  app?.unmount();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Scanner diagnostic consent', () => {
  it('defaults off and does not send consent', async () => {
    expect(control<HTMLInputElement>('.debug-consent input').checked).toBe(false);
    await scan();
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.has('shareDebug')).toBe(false);
    expect(root.querySelector('.debug-report')).toBeNull();
  });

  it('sends explicit consent and displays the returned report ID', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], debugReportId: reportId }),
    });
    await scan(true);
    expect((fetchMock.mock.calls[0][1].body as FormData).get('shareDebug')).toBe('true');
    expect(root.textContent).toContain(reportId);
    expect(root.textContent).toContain('scanModal.debugReference');
  });

  it('keeps results usable when capture is unavailable', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], debugCaptureUnavailable: true }),
    });
    await scan(true);
    expect(root.textContent).toContain('scanModal.debugUnavailable');
    expect(root.textContent).toContain('parseResults');
  });

  it('does not claim an older backend saved the report', async () => {
    await scan(true);
    expect(root.textContent).toContain('scanModal.debugUnavailable');
    expect(root.querySelector('.debug-report code')).toBeNull();
  });

  it('shows a saved report ID even when parsing failed', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'parse failed', debugReportId: reportId }),
    });
    await scan(true);
    expect(root.textContent).toContain(reportId);
    expect(root.textContent).toContain('parseFailed');
  });

  it('does not persist consent when the modal reopens', async () => {
    const checkbox = control<HTMLInputElement>('.debug-consent input');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    app.unmount();
    await mount();
    expect(control<HTMLInputElement>('.debug-consent input').checked).toBe(false);
  });
});
