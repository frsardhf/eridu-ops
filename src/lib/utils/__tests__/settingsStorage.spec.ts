// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  updateSetting,
  updateSortSettings,
  type AppSettings,
} from '../settingsStorage';

const SETTINGS_KEY = 'eridu-ops-settings';

function craftingFodder(stage1Crafts: number): NonNullable<AppSettings['craftingFodder']> {
  return {
    thresholds: { Artifact: { SR: 1 } },
    rarityFilter: ['SR'],
    session: {
      version: 4,
      sourceSignature: 'source',
      fullCraftCapacity: 1,
      stage1Capacity: 2,
      stage2Capacity: 2,
      entries: {
        10: {
          materialId: 10,
          craftCapacity: 2,
          excessItems: 0,
          itemsPerCraft: 1,
          stage1Eligible: true,
          stage2Eligible: true,
          stage1Crafts,
          stage2Crafts: 0,
        },
      },
    },
  };
}

function writeFromAnotherTab(settings: Partial<AppSettings>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

beforeEach(() => localStorage.clear());

describe('settings storage', () => {
  it.each([
    { name: 'theme', update: () => updateSetting('theme', 'light'), expected: { theme: 'light' } },
    {
      name: 'sort',
      update: () => updateSortSettings('name', 'desc'),
      expected: { sort: { option: 'name', direction: 'desc' } },
    },
  ])('keeps newer crafting progress when a stale tab writes $name', ({ update, expected }) => {
    writeFromAnotherTab({ craftingFodder: craftingFodder(0) });
    expect(getSettings().craftingFodder).toEqual(craftingFodder(0));
    const newerPlan = craftingFodder(1);
    writeFromAnotherTab({ craftingFodder: newerPlan });

    expect(update()).toBe(true);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({
      craftingFodder: newerPlan,
      ...expected,
    });
  });

  it('keeps a newer theme when a stale tab writes crafting progress', () => {
    writeFromAnotherTab({ theme: 'dark', craftingFodder: craftingFodder(0) });
    expect(getSettings().theme).toBe('dark');
    writeFromAnotherTab({ theme: 'light', craftingFodder: craftingFodder(0) });

    expect(updateSetting('craftingFodder', craftingFodder(1))).toBe(true);
    expect(getSettings()).toMatchObject({ theme: 'light', craftingFodder: craftingFodder(1) });
  });

  it('observes committed changes on a fresh read without creating defaults in storage', () => {
    const initial = getSettings();
    expect(getSettings()).toBe(initial);
    writeFromAnotherTab({ theme: 'ocean' });

    const current = getSettings();
    expect(current).toMatchObject({ theme: 'ocean', sort: DEFAULT_SETTINGS.sort });
    expect(getSettings()).toBe(current);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({ theme: 'ocean' });
  });

  it('prunes legacy keys without persisting default values', () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        theme: 'ocean',
        bond100Layout: 'legacy',
        craftingFodder: craftingFodder(1),
      }),
    );

    expect(getSettings()).toMatchObject({ theme: 'ocean', craftingFodder: craftingFodder(1) });
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({
      theme: 'ocean',
      craftingFodder: craftingFodder(1),
    });
  });

  it('keeps saved values intact if a write fails', () => {
    writeFromAnotherTab({ theme: 'dark' });
    const before = getSettings();
    const failedWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(updateSetting('theme', 'light')).toBe(false);
      expect(getSettings()).toBe(before);
      expect(getSettings().theme).toBe('dark');
    } finally {
      failedWrite.mockRestore();
      log.mockRestore();
    }
  });

  it('supports deliberate full snapshot replacement', () => {
    writeFromAnotherTab({ theme: 'ocean', craftingFodder: craftingFodder(1) });
    expect(getSettings().craftingFodder).toEqual(craftingFodder(1));

    expect(saveSettings({ ...DEFAULT_SETTINGS, theme: 'light' })).toBe(true);
    expect(getSettings().theme).toBe('light');
    expect(getSettings().craftingFodder).toBeUndefined();
  });
});
