import type { ThemeId } from './theme';
import type { StudentFilters } from './filter';

export type SortOption =
  | 'id'
  | 'name'
  | 'default'
  | 'bond'
  | 'level'
  | 'grade'
  | 'school'
  | 'club';

export type SortDirection = 'asc' | 'desc';

export interface HeaderProps {
  searchQuery: string;
  currentTheme: ThemeId;
  currentSort?: SortOption;
  sortDirection?: SortDirection;
  isPinnedMode?: boolean;
  filters?: StudentFilters;
  availableSchools?: string[];
}
