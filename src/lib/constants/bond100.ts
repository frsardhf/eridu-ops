import type { Bond100ServerOption, Bond100SortMode } from '@/types/bond100';

export const BOND100_SERVER_OPTIONS: Bond100ServerOption[] = [
  { code: 'global_na', labelKey: 'bond100.serverRegions.global_na', shortLabel: 'NA' },
  { code: 'global_eu', labelKey: 'bond100.serverRegions.global_eu', shortLabel: 'EU' },
  { code: 'global_asia', labelKey: 'bond100.serverRegions.global_asia', shortLabel: 'Asia' },
  { code: 'global_tw', labelKey: 'bond100.serverRegions.global_tw', shortLabel: 'TW/HK' },
  { code: 'global_kr', labelKey: 'bond100.serverRegions.global_kr', shortLabel: 'KR' },
];

export const BOND100_SORT_MODES: Bond100SortMode[] = ['default', 'name', 'bond100', 'recent'];
