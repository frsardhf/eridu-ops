import { ref, watch } from 'vue';
import { getSettings, updateSetting } from '../utils/settingsStorage';
import { loadLocalizationData } from '../services/schaleDbFetchService';
import type { SchaleLocalization } from '@/types/schaledb';

export type Language = 'en' | 'jp' | 'kr';

/** Selectable UI languages with native-name labels; drives the navbar picker. */
export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'jp', label: '日本語' },
  { value: 'kr', label: '한국어' },
];

function detectBrowserLanguage(): Language {
  const browserLang = (
    navigator.language ||
    (navigator as Navigator & { userLanguage?: string }).userLanguage ||
    'en'
  ).toLowerCase();
  if (browserLang.startsWith('ja')) return 'jp';
  if (browserLang.startsWith('ko')) return 'kr';
  return 'en';
}

// Deep-link override so localized landings / shared links open in the right
// language. Accepts ISO codes (ja/ko, used in URLs + hreflang) or the internal
// codes (jp/kr); anything else is ignored so a bad param can't blank the UI.
function detectUrlLanguage(): Language | null {
  const raw = new URLSearchParams(window.location.search).get('lang')?.toLowerCase();
  if (raw === 'en') return 'en';
  if (raw === 'ja' || raw === 'jp') return 'jp';
  if (raw === 'ko' || raw === 'kr') return 'kr';
  return null;
}

// Priority: `?lang=` deep-link > stored preference > browser language > 'en'.
export const currentLanguage = ref<Language>(
  detectUrlLanguage() || getSettings().language || detectBrowserLanguage(),
);

if (!getSettings().language) {
  updateSetting('language', currentLanguage.value);
}

watch(
  currentLanguage,
  (newLanguage) => {
    updateSetting('language', newLanguage);
  },
  { immediate: true },
);

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
//
// Cache-first (IndexedDB) and non-fatal: a failure must never block the data
// pipeline. With a warm student cache and no localization, resolveLocalized
// falls back to raw keys, which beats an empty screen.
export async function initializeLocalizationData(lang?: string): Promise<void> {
  const target = lang ?? currentLanguage.value;
  try {
    localizationData.value = await loadLocalizationData(target);
  } catch (error) {
    console.error('Localization load failed:', error);
  }
}
