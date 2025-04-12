export type SortOption = 'id' | 'name' | 'default';

export type SortDirection = 'asc' | 'desc';

export interface HeaderProps {
  searchQuery: string;
  isDarkMode: boolean;
  currentSort?: SortOption;
  sortDirection?: SortDirection;
}