import { currentLanguage, setLanguage, LANGUAGE_OPTIONS } from '../stores/localizationStore';
import { THEME_OPTIONS } from '../utils/themeUtils';
import { downloadLocalStorageData } from '../services/importExportService';
import { computed } from 'vue';
import { currentGameServer, setGameServer } from '../stores/uiPrefsStore';
import { $t } from '@/locales';
import type { GameServer } from '@/types/server';

/**
 * Hook facade for navbar components: aggregates localization, theme, and
 * export utilities so components stay within the components -> hooks boundary.
 */
export function useNavbarSettings() {
  const serverOptions = computed(() =>
    (['global', 'jp', 'cn'] as GameServer[]).map((value) => ({
      value,
      label: $t(`server.${value}`),
    })),
  );
  async function exportData(): Promise<void> {
    await downloadLocalStorageData();
  }

  return {
    currentLanguage,
    setLanguage,
    languageOptions: LANGUAGE_OPTIONS,
    THEME_OPTIONS,
    exportData,
    currentGameServer,
    setGameServer,
    serverOptions,
  };
}
