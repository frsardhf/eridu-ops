import { ref, watch } from 'vue';
import type { Bond100SortMode } from '@/types/bond100';
import type { SortDirection } from '@/types/header';
import { getSettings, updateSetting } from '../utils/settingsStorage';
import { compareBond100Cards, defaultBond100SortDirection } from '../utils/bond100SortUtils';

export function useBond100Sort() {
  const settings = getSettings();
  const sortMode = ref<Bond100SortMode>(settings.bond100Sort ?? 'default');
  const savedDirection = settings.bond100SortDirection;
  const sortDirection = ref<SortDirection>(
    savedDirection === 'asc' || savedDirection === 'desc'
      ? savedDirection
      : defaultBond100SortDirection(sortMode.value),
  );

  watch([sortMode, sortDirection], ([mode, direction]) => {
    updateSetting('bond100Sort', mode);
    updateSetting('bond100SortDirection', direction);
  });

  function selectSort(mode: Bond100SortMode) {
    if (mode === sortMode.value) return;
    sortMode.value = mode;
    sortDirection.value = defaultBond100SortDirection(mode);
  }

  function toggleDirection() {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  }

  function compareCards(
    a: Parameters<typeof compareBond100Cards>[0],
    b: Parameters<typeof compareBond100Cards>[1],
  ) {
    return compareBond100Cards(a, b, sortMode.value, sortDirection.value);
  }

  return { sortMode, sortDirection, selectSort, toggleDirection, compareCards };
}
