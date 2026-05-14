import { currentLanguage, setLanguage } from '../stores/localizationStore';
import { THEME_OPTIONS } from '../utils/themeUtils';
import { downloadLocalStorageData } from '../utils/studentStorage';

export type { Language } from '../stores/localizationStore';

/**
 * Hook facade for StudentNavbar — aggregates localization, theme, and export
 * utilities so the component stays within the components → hooks boundary.
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
