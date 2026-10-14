// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, type App } from 'vue';
import SelectMenu from '../SelectMenu.vue';

let app: App;
afterEach(() => app?.unmount());

function mount(split = false) {
  const root = document.createElement('div');
  const toggle = vi.fn();
  const select = vi.fn();
  app = createApp({
    render: () =>
      h(SelectMenu<string>, {
        modelValue: 'default',
        options: [
          { value: 'default', label: 'Release' },
          { value: 'name', label: 'Name' },
        ],
        ...(split ? { sortDirection: 'asc' as const, directionLabel: 'Switch to Descending' } : {}),
        onToggleDirection: toggle,
        'onUpdate:modelValue': select,
      }),
  });
  app.mount(root);
  return { root, toggle, select };
}

describe('SelectMenu split sort trigger', () => {
  it('leaves ordinary menus unchanged', async () => {
    const { root } = mount();
    expect(root.querySelectorAll('button')).toHaveLength(1);
    root.querySelector('button')!.click();
    await nextTick();
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  });
  it('toggles direction without opening the menu', async () => {
    const { root, toggle } = mount(true);
    const arrow = root.querySelector<HTMLButtonElement>('.select-direction')!;
    expect(arrow.getAttribute('aria-label')).toBe('Switch to Descending');
    arrow.click();
    await nextTick();
    expect(toggle).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });
  it('opens the menu from the label and still selects an option', async () => {
    const { root, select, toggle } = mount(true);
    root.querySelector<HTMLButtonElement>('.select-label')!.click();
    await nextTick();
    const options = document.querySelectorAll<HTMLButtonElement>('[role="option"]');
    expect(options).toHaveLength(2);
    options[1].click();
    await nextTick();
    expect(select).toHaveBeenCalledWith('name');
    expect(toggle).not.toHaveBeenCalled();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });
});
