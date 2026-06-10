import { ref, watch } from 'vue';
import { getSettings, updateSetting } from '../utils/settingsStorage';
import { fetchLocalizationData } from '../services/schaleDbFetchService';
import type { SchaleLocalization } from '@/types/schaledb';

export type Language = 'en' | 'jp';

function detectBrowserLanguage(): Language {
  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (browserLang.toLowerCase().startsWith('ja')) {
    return 'jp';
  }
  return 'en';
}

// Priority: stored preference > browser language > 'en'.
export const currentLanguage = ref<Language>(
  getSettings().language || detectBrowserLanguage()
);

if (!getSettings().language) {
  updateSetting('language', currentLanguage.value);
}

watch(currentLanguage, (newLanguage) => {
  updateSetting('language', newLanguage);
}, { immediate: true });

export function setLanguage(language: Language) {
  currentLanguage.value = language;
}

// Reactive cache of SchaleDB localization strings for the active language.
// Read by the pure helpers in localizationUtils (resolveLocalized etc.).
export const localizationData = ref<SchaleLocalization | null>(null);

// Used only for the initial load. Language *switches* are handled by the
// coordinated loader in useStudentData, which fetches localization together with
// the student data and applies both atomically (no separate watcher here, so the
// two can't update out of sync).
export async function initializeLocalizationData(lang?: string): Promise<void> {
  const target = lang ?? currentLanguage.value;
  localizationData.value = await fetchLocalizationData(target);
}