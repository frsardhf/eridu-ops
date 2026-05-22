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
