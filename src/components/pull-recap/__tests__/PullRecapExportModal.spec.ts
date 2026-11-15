// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApp, type App } from 'vue';
import type { PullRecapPityMark } from '@/types/pullRecap';
import PullRecapExportModal from '../PullRecapExportModal.vue';

const { capturePngBlob } = vi.hoisted(() => ({ capturePngBlob: vi.fn() }));
vi.mock('@/composables/useImageExport', () => ({ useImageExport: () => ({ capturePngBlob }) }));

const lightPng = new Blob(['light'], { type: 'image/png' });
const darkPng = new Blob(['dark'], { type: 'image/png' });
const write = vi.fn();
const createObjectURL = vi.fn((blob: Blob) => (blob === lightPng ? 'blob:light' : 'blob:dark'));
const revokeObjectURL = vi.fn();
let app: App | undefined;

function mountPreview(pullNumber?: number, dupePityMark?: PullRecapPityMark) {
  app = createApp(PullRecapExportModal, {
    sections: [
      {
        kind: 'new',
        cards: [
          {
            id: 1,
            studentId: 1,
            kind: 'new',
            pullNumber,
            pityMark: 'fiftyFifty',
            portrait: '/student.webp',
          },
        ],
      },
      {
        kind: 'dupe',
        cards: [
          {
            id: 2,
            studentId: 1,
            kind: 'dupe',
            pityMark: dupePityMark,
            portrait: '/student.webp',
            elephArtwork: '/eleph.webp',
          },
        ],
      },
    ],
    title: 'Recruitment results',
    pullSummary: '0.5% · 200 pulls',
  });
  app.mount(document.createElement('div'));
  return document.querySelector('dialog')!;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write } });
  vi.stubGlobal(
    'ClipboardItem',
    vi.fn(
      class {
        constructor(readonly data: Record<string, Blob>) {}
      },
    ),
  );
  capturePngBlob.mockImplementation(async (source: HTMLElement) =>
    source.dataset.exportTheme === 'dark' ? darkPng : lightPng,
  );
});

afterEach(() => {
  app?.unmount();
  app = undefined;
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.unstubAllGlobals();
});

it('uses the displayed PNG for download and copy, and reports clipboard rejection', async () => {
  const dialog = mountPreview();
  const link = dialog.querySelector('a[download]')!;
  expect(link.getAttribute('download')).toBe('eridu-ops-pull-recap.png');
  const copy = Array.from(dialog.querySelectorAll('button')).find(
    (button) => button.textContent === 'Copy image',
  )!;
  expect(copy.disabled).toBe(true);
  await vi.waitFor(() => expect(link.getAttribute('href')).toBe('blob:light'));
  expect(dialog.querySelector('.pull-recap-export-image')?.getAttribute('src')).toBe('blob:light');

  write.mockResolvedValueOnce(undefined);
  copy.click();
  expect(write).toHaveBeenCalledWith([{ data: { 'image/png': lightPng } }]);
  await vi.waitFor(() =>
    expect(dialog.querySelector('[role="status"]')?.textContent).toBe('Image copied.'),
  );
  write.mockRejectedValueOnce(new Error('Clipboard denied'));
  copy.click();
  await vi.waitFor(() =>
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('You can still download'),
  );
  expect(link.getAttribute('href')).toBe('blob:light');
});

it('renders a read-only export with the selected palette and revokes the old preview URL', async () => {
  const dialog = mountPreview();
  const link = dialog.querySelector('a[download]')!;
  await vi.waitFor(() => expect(link.getAttribute('href')).toBe('blob:light'));
  dialog.querySelectorAll<HTMLButtonElement>('.pull-recap-export-palettes button')[1].click();
  await vi.waitFor(() => expect(link.getAttribute('href')).toBe('blob:dark'));
  const source = capturePngBlob.mock.lastCall?.[0] as HTMLElement;
  expect(source.dataset.exportTheme).toBe('dark');
  expect(source.hasAttribute('data-theme')).toBe(false);
  expect(dialog.querySelector('.pull-recap-export-stage')?.getAttribute('data-export-theme')).toBe(
    'dark',
  );
  expect(source.querySelector('.pull-recap-preview--export')).not.toBeNull();
  expect(source.querySelector('button')).toBeNull();
  const cards = source.querySelectorAll('.pull-recap-result-card');
  expect(cards[0].querySelector('img')?.getAttribute('src')).toBe('/student.webp');
  expect(cards[1].querySelector('img')?.getAttribute('src')).toBe('/eleph.webp');
  expect(cards[0].querySelector('.pity-badge')?.getAttribute('aria-label')).toBe('50:50 Won');
  expect(cards[1].querySelector('.pity-badge')).toBeNull();
  expect(source.querySelector('.pull-recap-pity-legend')?.textContent?.trim()).toBe('50:50 Won');
  expect(dialog.textContent).not.toContain('Show pull numbers');
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:light');
});

it('falls back to the student portrait if Dupe artwork fails to load', async () => {
  const dialog = mountPreview();
  const images = dialog.querySelectorAll('.pull-recap-export-source .pull-recap-result-card img');
  expect(images[1].getAttribute('src')).toBe('/eleph.webp');
  images[1].dispatchEvent(new Event('error'));
  await vi.waitFor(() => expect(images[1].getAttribute('src')).toBe('/student.webp'));
});

it('includes a marked 50:50 loss in the PNG and legend even when pull numbers are hidden', async () => {
  const dialog = mountPreview(163, 'fiftyFiftyLost');
  await vi.waitFor(() =>
    expect(dialog.querySelector('a[download]')?.getAttribute('href')).toBe('blob:light'),
  );
  const source = capturePngBlob.mock.lastCall?.[0] as HTMLElement;
  expect(source.querySelector('.pity-badge[aria-label="50:50 Lost"] svg')).not.toBeNull();
  expect(source.querySelector('.pull-number-badge')).toBeNull();
  expect(
    Array.from(source.querySelectorAll('.pull-recap-pity-legend li'), (item) =>
      item.textContent?.trim(),
    ),
  ).toEqual(['50:50 Won', '50:50 Lost']);
});

it('includes pull numbers in the captured PNG only when enabled', async () => {
  const capturedNumbers: string[] = [];
  capturePngBlob.mockImplementation(async (source: HTMLElement) => {
    capturedNumbers.push(source.querySelector('.pull-number-badge')?.textContent?.trim() ?? '');
    return lightPng;
  });
  const dialog = mountPreview(163);
  const toggle = Array.from(dialog.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === 'Show pull numbers',
  )!;

  await vi.waitFor(() => expect(toggle.disabled).toBe(false));
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  expect(capturedNumbers).toEqual(['']);

  toggle.click();
  await vi.waitFor(() => expect(capturedNumbers).toEqual(['', '#163']));
  await vi.waitFor(() => expect(toggle.disabled).toBe(false));
  expect(toggle.getAttribute('aria-pressed')).toBe('true');
  expect(dialog.querySelectorAll('.pull-recap-export-source .pull-number-badge')).toHaveLength(1);

  toggle.click();
  await vi.waitFor(() => expect(capturedNumbers).toEqual(['', '#163', '']));
  expect(dialog.querySelector('.pull-recap-export-source')?.textContent).toContain('200 pulls');
  expect(dialog.querySelector('.pull-recap-export-source .pity-badge')).not.toBeNull();
});
