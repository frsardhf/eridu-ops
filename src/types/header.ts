import type { ThemeId } from './theme';

export type SortOption =
  | 'id'
  | 'name'
  | 'default'
  | 'bond'
  | 'level'
  | 'grade'
  | 'school'
  | 'club'
  | 'pinned';

export type SortDirection = 'asc' | 'desc';

export interface HeaderProps {
  searchQuery: string;
  currentTheme: ThemeId;
  currentSort?: SortOption;
  sortDirection?: SortDirection;
}
