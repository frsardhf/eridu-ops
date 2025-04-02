import { SortOption, SortDirection } from '../consumables/hooks/useStudentData';

export interface HeaderProps {
  searchQuery: string;
  isDarkMode: boolean;
  currentSort?: SortOption;
  sortDirection?: SortDirection;
}