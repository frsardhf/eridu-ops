import { ref, watch } from 'vue';
import { getSettings, updateSetting } from '../utils/settingsStorage';
import { fetchLocalizationData, localizationData } from '../utils/localizationUtils';

export type Language = 'en' | 'jp';

// Function to detect the user's browser language
function detectBrowserLanguage(): Language {
  // Get the browser language from navigator
  const browserLang = navigator.language || (navigator as any).userLanguage;

  // Check if it starts with 'ja' (Japanese)
  if (browserLang.toLowerCase().startsWith('ja')) {
    return 'jp';
  }

  // Default to English for all other languages
  return 'en';
}

// Create a reactive reference for the current language
// Priority: 1. Stored preference, 2. Browser language, 3. Default (en)
export const currentLanguage = ref<Language>(
  getSettings().language || detectBrowserLanguage()
);

// Set default language if not already set in settings
if (!getSettings().language) {
  updateSetting('language', currentLanguage.value);
}

// Save language preference whenever it changes
watch(currentLanguage, (newLanguage) => {
  updateSetting('language', newLanguage);
}, { immediate: true });

// Function to change the current language
export function setLanguage(language: Language) {
  currentLanguage.value = language;
}

// Re-export the shared localization data ref for consumers
export { localizationData };

// Fetch and populate the shared localization data
export async function initializeLocalizationData(lang?: string): Promise<void> {
  await fetchLocalizationData(lang ?? currentLanguage.value);
}

// Re-fetch when language changes
watch(currentLanguage, (newLang) => {
  initializeLocalizationData(newLang);
});