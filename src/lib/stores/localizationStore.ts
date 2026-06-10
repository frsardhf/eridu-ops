import { ref, watch } from 'vue';
import { getSettings, updateSetting } from '../utils/settingsStorage';
import { fetchLocalizationData, localizationData } from '../utils/localizationUtils';

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

// Re-exported so consumers don't need to import from localizationUtils directly.
export { localizationData };

// Used only for the initial load. Language *switches* are handled by the
// coordinated loader in useStudentData, which fetches localization together with
// the student data and applies both atomically (no separate watcher here, so the
// two can't update out of sync).
export async function initializeLocalizationData(lang?: string): Promise<void> {
  const target = lang ?? currentLanguage.value;
  localizationData.value = await fetchLocalizationData(target);
}