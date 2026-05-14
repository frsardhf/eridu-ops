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

export async function initializeLocalizationData(lang?: string): Promise<void> {
  await fetchLocalizationData(lang ?? currentLanguage.value);
}

watch(currentLanguage, (newLang) => {
  initializeLocalizationData(newLang);
});