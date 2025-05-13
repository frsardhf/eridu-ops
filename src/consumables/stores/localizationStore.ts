import { ref, watch } from 'vue';
import { setStorageData, getStorageData, STORAGE_KEYS } from '../utils/studentStorage';

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
  getStorageData<Language>(STORAGE_KEYS.LANGUAGE) || detectBrowserLanguage()
);

// Set default language if not already set
if (!getStorageData(STORAGE_KEYS.LANGUAGE)) {
  setStorageData(STORAGE_KEYS.LANGUAGE, currentLanguage.value);
}

// Save language preference whenever it changes
watch(currentLanguage, (newLanguage) => {
  setStorageData(STORAGE_KEYS.LANGUAGE, newLanguage);
}, { immediate: true });

// Function to change the current language
export function setLanguage(language: Language) {
  currentLanguage.value = language;
}