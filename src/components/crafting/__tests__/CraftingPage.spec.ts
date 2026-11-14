// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { computed, createApp, nextTick, ref, type App } from 'vue';
import CraftingPage from '@/pages/CraftingPage.vue';
import { $t } from '@/locales';

const isReady = ref(false);
const isLoading = ref(true);
const loadError = ref(false);
const hasSession = ref(false);
const needsRefresh = ref(false);
const hasProgress = ref(false);
const retryDataLoad = vi.fn(() => {
  isLoading.value = true;
  loadError.value = false;
});
const refreshSession = vi.fn(() => {
  hasSession.value = true;
  needsRefresh.value = false;
  hasProgress.value = false;
  return true;
});
const resetProgress = vi.fn(() => {
  hasProgress.value = false;
});

vi.mock('@/lib/hooks/useStudentData', () => ({
  useStudentData: () => ({ isReady, isLoading, loadError, retryDataLoad }),
}));
vi.mock('@/lib/hooks/useCraftingFodder', () => ({
  useCraftingFodder: () => ({
    thresholds: ref({}),
    rarityFilter: ref([]),
    allRarities: [],
    subcategories: [],
    hasSession,
    needsRefresh,
    stage1Materials: ref([]),
    stage2Materials: ref([]),
    summary: computed(() => ({
      remaining: 3,
      completed: 0,
      stage1Capacity: 3,
      stage2Capacity: 3,
      stage1Planned: 3,
      stage2Planned: 3,
      hasProgress: hasProgress.value,
    })),
    refreshSession,
    resetProgress,
  }),
}));
vi.mock('@/lib/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
vi.mock('@/components/navbar/GlobalNavbar.vue', () => ({ default: { render: () => null } }));
vi.mock('@/components/crafting/CraftingFodderCard.vue', () => ({
  default: { render: () => null },
}));

let app: App | undefined;

function mountPage() {
  const host = document.createElement('div');
  app = createApp(CraftingPage);
  app.mount(host);
  return host;
}

function buttonsByLabel(container: ParentNode, label: string) {
  return Array.from(container.querySelectorAll('button')).filter(
    (button) => button.textContent?.trim() === $t(label),
  );
}

function buttonByLabel(container: ParentNode, label: string) {
  const buttons = buttonsByLabel(container, label);
  expect(buttons).toHaveLength(1);
  return buttons[0];
}

function confirmation(container: ParentNode, message: string) {
  const status = Array.from(container.querySelectorAll('[role="status"]')).find(
    (element) => element.textContent?.trim() === $t(message),
  );
  const group = status?.closest('[role="group"]');
  expect(group).toBeTruthy();
  return group!;
}

beforeEach(() => {
  isReady.value = false;
  isLoading.value = true;
  loadError.value = false;
  hasSession.value = false;
  needsRefresh.value = false;
  hasProgress.value = false;
  vi.clearAllMocks();
});

afterEach(() => {
  app?.unmount();
  app = undefined;
});

it('creates no session after initial load failure and waits for a successful retry', async () => {
  const host = mountPage();
  const refresh = buttonByLabel(host, 'craftingFodder.refreshPlan');
  expect(refresh.disabled).toBe(true);
  expect(refreshSession).not.toHaveBeenCalled();

  isReady.value = true;
  isLoading.value = false;
  loadError.value = true;
  await nextTick();
  expect(host.querySelector('[role="alert"]')).toBeTruthy();
  expect(refresh.disabled).toBe(true);
  expect(refreshSession).not.toHaveBeenCalled();

  buttonByLabel(host, 'retry').click();
  await nextTick();
  expect(retryDataLoad).toHaveBeenCalledOnce();
  expect(refresh.disabled).toBe(true);
  expect(refreshSession).not.toHaveBeenCalled();

  isLoading.value = false;
  await nextTick();
  expect(refreshSession).toHaveBeenCalledOnce();
  expect(host.querySelector('h2')?.textContent).toBe($t('craftingFodder.stage1'));
});

it('protects an existing snapshot during catalog loading and errors', async () => {
  hasSession.value = true;
  needsRefresh.value = true;
  isReady.value = true;
  const host = mountPage();
  const refresh = buttonByLabel(host, 'craftingFodder.refreshPlan');
  expect(refresh.disabled).toBe(true);
  expect(host.querySelector('h2')?.textContent).toBe($t('craftingFodder.stage1'));
  expect(host.textContent).not.toContain($t('craftingFodder.refreshNotice'));

  isLoading.value = false;
  loadError.value = true;
  await nextTick();
  expect(refresh.disabled).toBe(true);
  expect(host.textContent).not.toContain($t('craftingFodder.refreshNotice'));

  loadError.value = false;
  await nextTick();
  expect(refresh.disabled).toBe(false);
  expect(buttonsByLabel(host, 'craftingFodder.refreshPlan')).toHaveLength(2);
  expect(refreshSession).not.toHaveBeenCalled();
});

it('disables refresh for an unchanged snapshot without discarding progress', () => {
  isReady.value = true;
  isLoading.value = false;
  hasSession.value = true;
  hasProgress.value = true;
  const host = mountPage();
  const refresh = buttonByLabel(host, 'craftingFodder.refreshPlan');

  expect(refresh.disabled).toBe(true);
  refresh.click();
  expect(refreshSession).not.toHaveBeenCalled();
});

it('confirms before replacing a stale plan with unpaired progress', async () => {
  isReady.value = true;
  isLoading.value = false;
  hasSession.value = true;
  needsRefresh.value = true;
  hasProgress.value = true;
  const host = mountPage();
  const refreshButtons = buttonsByLabel(host, 'craftingFodder.refreshPlan');
  expect(refreshButtons).toHaveLength(2);
  const [toolbarRefresh, staleRefresh] = refreshButtons;

  staleRefresh.click();
  await nextTick();
  const message = 'craftingFodder.startNewPlanConfirm';
  expect(refreshSession).not.toHaveBeenCalled();
  buttonByLabel(confirmation(host, message), 'cancel').click();
  await nextTick();
  expect(host.textContent).not.toContain($t(message));
  expect(refreshSession).not.toHaveBeenCalled();

  toolbarRefresh.click();
  await nextTick();
  buttonByLabel(confirmation(host, message), 'craftingFodder.startNewPlan').click();
  await nextTick();
  expect(host.textContent).not.toContain($t(message));
  expect(refreshSession).toHaveBeenCalledOnce();
  expect(toolbarRefresh.disabled).toBe(true);
});

it('asks before resetting recorded progress without refreshing the plan', async () => {
  isReady.value = true;
  isLoading.value = false;
  hasSession.value = true;
  hasProgress.value = true;
  const host = mountPage();
  buttonByLabel(host, 'craftingFodder.planSettings').click();
  await nextTick();

  const resetLabel = 'craftingFodder.resetProgress';
  buttonByLabel(host, resetLabel).click();
  await nextTick();
  expect(resetProgress).not.toHaveBeenCalled();
  buttonByLabel(confirmation(host, 'craftingFodder.resetProgressConfirm'), resetLabel).click();
  await nextTick();
  expect(resetProgress).toHaveBeenCalledOnce();
  expect(refreshSession).not.toHaveBeenCalled();
  expect(buttonByLabel(host, resetLabel).disabled).toBe(true);
});
