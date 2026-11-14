// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createApp, type App } from 'vue';
import CraftingFodderCard from '../CraftingFodderCard.vue';

let app: App | undefined;
let host: HTMLDivElement;

function mountCard() {
  const update = vi.fn();
  host = document.createElement('div');
  document.body.append(host);
  app = createApp(CraftingFodderCard, {
    fieldId: 'test-material',
    item: {
      material: { Name: 'Test material', Rarity: 'SR' },
      iconUrl: '/test.webp',
      plannedCrafts: 12,
      remainingCrafts: 10,
      maxRemainingCrafts: 11,
      recyclableQty: 20,
      excessItems: 0,
      canUndo: true,
      canReset: true,
    },
    'onUpdate:remaining': update,
  });
  app.mount(host);
  const input = host.querySelector('input')!;
  return { input, update };
}

function typeValue(input: HTMLInputElement, value: string) {
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  app?.unmount();
  host?.remove();
});

it('does not record anything while clearing or replacing a count, then commits on Enter', () => {
  const { input, update } = mountCard();
  typeValue(input, '');
  expect(update).not.toHaveBeenCalled();
  typeValue(input, '8');
  expect(update).not.toHaveBeenCalled();

  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(update).toHaveBeenCalledExactlyOnceWith(8);
});

it('restores blank, invalid or unreachable counts and accepts an explicit zero on blur', () => {
  const { input, update } = mountCard();
  expect(input.max).toBe('11');
  for (const invalid of ['', '-1', '2.5', '12']) {
    typeValue(input, invalid);
    input.blur();
    expect(input.value).toBe('10');
  }
  expect(update).not.toHaveBeenCalled();

  typeValue(input, '0');
  input.blur();
  expect(update).toHaveBeenCalledExactlyOnceWith(0);
});

it('leaves the record and undo buttons immediate', () => {
  const { update } = mountCard();
  const buttons = host.querySelectorAll<HTMLButtonElement>('.step-btn');
  buttons[0].click();
  buttons[1].click();
  expect(update.mock.calls).toEqual([[9], [11]]);
});
