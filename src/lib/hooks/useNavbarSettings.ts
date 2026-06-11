import { currentLanguage, setLanguage } from '../stores/localizationStore';
import { THEME_OPTIONS } from '../utils/themeUtils';
import { downloadLocalStorageData } from '../services/importExportService';

/**
 * Hook facade for navbar components — aggregates localization, theme, and
 * export utilities so components stay within the components → hooks boundary.
 */
export function useNavbarSettings() {
  async function exportData(): Promise<void> {
    await downloadLocalStorageData();
  }

  return {
    currentLanguage,
    setLanguage,
    THEME_OPTIONS,
    exportData,
  };
}
