import { ThemeId, THEME_IDS } from '@/types/theme';

export const DEFAULT_THEME: ThemeId = 'dark';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  colors: [string, string];
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'dark', label: 'Dark', colors: ['#111827', '#6366f1'] },
  { id: 'light', label: 'Light', colors: ['#f8fafc', '#4f46e5'] },
  { id: 'ocean', label: 'Ocean', colors: ['#8fd4ff', '#0096ff'] },
  { id: 'forest', label: 'Forest', colors: ['#9fe2b2', '#16b364'] },
  { id: 'sunset', label: 'Sunset', colors: ['#ffbf98', '#ff6a00'] },
  { id: 'rose', label: 'Rose', colors: ['#ffb5ce', '#e61b72'] },
  { id: 'violet', label: 'Violet', colors: ['#ccb8ff', '#7c3aed'] }
];

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value);
}

export function normalizeTheme(value?: string): ThemeId {
  if (!value) return DEFAULT_THEME;
  return isThemeId(value) ? value : DEFAULT_THEME;
}
