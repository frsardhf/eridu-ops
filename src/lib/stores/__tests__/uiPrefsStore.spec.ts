// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { computed } from 'vue';
import {
  activeFilters,
  clearStudentFilters,
  currentGameServer,
  currentSort,
  loadUiPrefs,
  setGameServer,
  setSortOption,
  setStudentFilters,
} from '../uiPrefsStore';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '@/lib/utils/settingsStorage';
import { EMPTY_FILTERS, countActiveFilters } from '@/types/filter';
import { currentLanguage } from '../localizationStore';
import { studentDataStore } from '../studentStore';
import { useStudentCard } from '@/lib/hooks/useStudentCard';
import type { StudentProps } from '@/types/student';

beforeEach(() => {
  saveSettings(structuredClone(DEFAULT_SETTINGS));
  loadUiPrefs();
  currentLanguage.value = 'en';
  studentDataStore.value = {};
});

describe('roster view preferences', () => {
  it('persists and restores the server independently of language and student plans', () => {
    currentLanguage.value = 'kr';
    studentDataStore.value = {
      1: {
        studentId: 1,
        isOwned: false,
        planEnabled: true,
        characterLevels: { current: 1, target: 80 },
      },
    };
    const before = JSON.stringify(studentDataStore.value);
    const card = useStudentCard(
      computed(() => ({ Id: 1, IsReleased: [true, false, false] }) as StudentProps),
    );
    expect(card.isUpcoming.value).toBe(true);
    setGameServer('jp');
    expect(card.isUpcoming.value).toBe(false);
    expect(card.isPlanned.value).toBe(true);
    expect(currentLanguage.value).toBe('kr');
    expect(JSON.stringify(studentDataStore.value)).toBe(before);
    expect(getSettings().gameServer).toBe('jp');
    expect(JSON.parse(localStorage.getItem('eridu-ops-settings')!).gameServer).toBe('jp');
    currentGameServer.value = 'global';
    loadUiPrefs();
    expect(currentGameServer.value).toBe('jp');
  });

  it('persists the future-plan filter without changing sorting and clears it normally', () => {
    setSortOption('name');
    setStudentFilters('planning', ['future']);
    expect(countActiveFilters(activeFilters.value)).toBe(1);
    expect(getSettings().studentFilters?.planning).toEqual(['future']);
    activeFilters.value = structuredClone(EMPTY_FILTERS);
    loadUiPrefs();
    expect(activeFilters.value.planning).toEqual(['future']);
    expect(currentSort.value).toBe('name');
    clearStudentFilters();
    expect(activeFilters.value.planning).toEqual([]);
    expect(countActiveFilters(activeFilters.value)).toBe(0);
    expect(getSettings().studentFilters?.planning).toEqual([]);
  });

  it('loads older preferences without a server or planning filter', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    delete settings.gameServer;
    const legacyFilters = structuredClone(EMPTY_FILTERS);
    delete (legacyFilters as Partial<typeof legacyFilters>).planning;
    settings.studentFilters = legacyFilters;
    saveSettings(settings);
    loadUiPrefs();
    expect(currentGameServer.value).toBe('global');
    expect(activeFilters.value.planning).toEqual([]);
  });
});
