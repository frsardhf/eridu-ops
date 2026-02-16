export const THEME_IDS = [
  'dark',
  'light',
  'ocean',
  'forest',
  'sunset',
  'rose',
  'violet'
] as const;

export type ThemeId = (typeof THEME_IDS)[number];
