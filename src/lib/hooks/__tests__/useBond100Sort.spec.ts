import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, type EffectScope } from 'vue';
import type { AppSettings } from '@/lib/utils/settingsStorage';
import { useBond100Sort } from '../useBond100Sort';

const state = vi.hoisted(() => ({ settings: {} as Partial<AppSettings>, update: vi.fn() }));
vi.mock('@/lib/utils/settingsStorage', () => ({
  getSettings: () => state.settings,
  updateSetting: state.update,
}));

let scope: EffectScope;
beforeEach(() => {
  scope = effectScope();
  state.settings = {};
  state.update.mockClear();
});
afterEach(() => scope.stop());
function useSort() {
  return scope.run(() => useBond100Sort())!;
}

describe('Hall sort preferences', () => {
  it('preserves existing count/recent defaults without saved direction', () => {
    state.settings = { bond100Sort: 'bond100' };
    expect(useSort().sortDirection.value).toBe('desc');
  });
  it('restores a saved direction', () => {
    state.settings = { bond100Sort: 'recent', bond100SortDirection: 'asc' };
    expect(useSort().sortDirection.value).toBe('asc');
  });
  it('persists the mode and toggled direction', async () => {
    const sort = useSort();
    sort.toggleDirection();
    await nextTick();
    expect(sort.sortDirection.value).toBe('desc');
    expect(state.update).toHaveBeenCalledWith('bond100Sort', 'default');
    expect(state.update).toHaveBeenCalledWith('bond100SortDirection', 'desc');
  });
  it('chooses the familiar default direction when switching sort keys', async () => {
    const sort = useSort();
    sort.selectSort('bond100');
    expect(sort.sortDirection.value).toBe('desc');
    sort.selectSort('name');
    expect(sort.sortDirection.value).toBe('asc');
    await nextTick();
    expect(state.update).toHaveBeenCalledWith('bond100Sort', 'name');
  });
  it('does not reset direction when picking the selected key', () => {
    const sort = useSort();
    sort.toggleDirection();
    sort.selectSort('default');
    expect(sort.sortDirection.value).toBe('desc');
  });
});
