// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, type App } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import BondsPage from '../BondsPage.vue';

const state = vi.hoisted(() => ({
  layout: 'tabs' as 'tabs' | 'cards',
  saved: new Map<number, number>(),
  fail: false,
  removed: vi.fn(),
}));

vi.mock('@/locales', () => ({ $t: (key: string) => key }));
vi.mock('@/lib/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
vi.mock('@/lib/utils/settingsStorage', () => ({
  getSettings: () => ({ bondsLayout: state.layout }),
  updateSetting: vi.fn(),
}));
vi.mock('@/lib/hooks/useStudentData', async () => {
  const { ref } = await import('vue');
  return {
    useStudentData: () => ({
      studentData: ref({ 1: { Id: 1 }, 2: { Id: 2 } }),
      favoredGift: ref({}),
      giftBoxData: ref({}),
      isReady: ref(true),
    }),
  };
});
vi.mock('@/lib/stores/studentStore', async () => ({
  studentDataStore: (await import('vue')).ref({}),
}));
vi.mock('@/lib/hooks/useBondsTracked', async () => {
  const { ref } = await import('vue');
  return {
    useBondsTracked: () => {
      const trackedIds = ref([1, 2]);
      return {
        trackedIds,
        seedIfNeeded: vi.fn(),
        removeStudent: (id: number) => {
          state.removed(id);
          trackedIds.value = trackedIds.value.filter((value) => value !== id);
        },
      };
    },
  };
});
vi.mock('@/lib/utils/bondExpUtils', () => ({ computeStudentBondExpTotal: () => 0 }));
vi.mock('@/lib/utils/studentDataHydrationUtils', () => ({
  enrichStudentWithGifts: (student: unknown) => student,
}));
vi.mock('@/components/navbar/GlobalNavbar.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/bonds/BondsStudentPicker.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/shared/DataLoadErrorBanner.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/shared/StudentStrip.vue', async () => {
  const { h } = await import('vue');
  return {
    default: {
      emits: ['select-student'],
      setup(
        _: unknown,
        { emit }: { emit: (event: 'select-student', student: { Id: number }) => void },
      ) {
        return () =>
          h('button', { class: 'pick-second', onClick: () => emit('select-student', { Id: 2 }) });
      },
    },
  };
});
vi.mock('@/components/bonds/BondsStudentEditor.vue', async () => {
  const { defineComponent, h, ref } = await import('vue');
  const { useDebouncedFormPersistence } = await import('@/lib/hooks/useDebouncedFormPersistence');
  return {
    default: defineComponent({
      props: { student: { type: Object, required: true } },
      setup(props, { expose }) {
        const quantity = ref(0);
        const { flushPendingNow } = useDebouncedFormPersistence({
          refs: { quantity },
          defaults: { quantity: 0 },
          isVisible: () => true,
          loadFn: async () => {},
          watchSources: [quantity],
          saveFn: async () => {
            if (state.fail) throw new Error('save failed');
            state.saved.set(props.student.Id, quantity.value);
            return quantity.value;
          },
        });
        expose({ saveBeforeClose: flushPendingNow });
        return () =>
          h('input', {
            class: `editor-${props.student.Id}`,
            onInput: (event: Event) => {
              quantity.value = Number((event.target as HTMLInputElement).value);
            },
          });
      },
    }),
  };
});

function find(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Control not found: ${selector}`);
  return element;
}
function edit(root: HTMLElement, id: number, quantity: number) {
  const input = find(root, `.editor-${id}`) as HTMLInputElement;
  input.value = String(quantity);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
async function settle() {
  for (let i = 0; i < 8; i++) await nextTick();
}
let app: App;
async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/bonds', component: BondsPage },
      { path: '/students', component: { render: () => null } },
    ],
  });
  await router.push('/bonds');
  const root = document.createElement('div');
  app = createApp({ render: () => h(RouterView) });
  app.use(router).mount(root);
  await settle();
  return { root, router };
}
beforeEach(() => {
  vi.useFakeTimers();
  state.layout = 'tabs';
  state.saved.clear();
  state.fail = false;
  state.removed.mockClear();
});
afterEach(() => {
  app?.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Bonds save-before-leave', () => {
  it('flushes a pending edit before switching students', async () => {
    const { root } = await mountPage();
    edit(root, 1, 5);
    find(root, '.pick-second').click();
    await settle();
    expect(state.saved.get(1)).toBe(5);
    expect(find(root, '.editor-2')).toBeDefined();
  });

  it('flushes all card editors before switching layouts', async () => {
    state.layout = 'cards';
    const { root } = await mountPage();
    edit(root, 1, 3);
    edit(root, 2, 7);
    find(root, '[role="tab"][aria-selected="false"]').click();
    await settle();
    expect([...state.saved.entries()]).toEqual([
      [1, 3],
      [2, 7],
    ]);
  });

  it('flushes before untracking a student', async () => {
    const { root } = await mountPage();
    edit(root, 1, 4);
    find(root, '[title="untrackTooltip"]').click();
    await settle();
    expect(state.saved.get(1)).toBe(4);
    expect(state.removed).toHaveBeenCalledWith(1);
  });

  it('flushes before route navigation', async () => {
    const { root, router } = await mountPage();
    edit(root, 1, 8);
    await router.push('/students');
    expect(state.saved.get(1)).toBe(8);
    expect(router.currentRoute.value.path).toBe('/students');
  });

  it('keeps the editor and route when saving fails, allowing retry', async () => {
    const { root, router } = await mountPage();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.fail = true;
    edit(root, 1, 9);
    find(root, '.pick-second').click();
    await settle();
    expect(find(root, '.editor-1')).toBeDefined();
    await router.push('/students');
    expect(router.currentRoute.value.path).toBe('/bonds');
    state.fail = false;
    await router.push('/students');
    expect(state.saved.get(1)).toBe(9);
    expect(router.currentRoute.value.path).toBe('/students');
  });
});
