import type { Bond100SortMode, Bond100StudentSummary } from '@/types/bond100';
import type { SortDirection } from '@/types/header';
import type { StudentProps } from '@/types/student';

interface SortableCard {
  student: Pick<StudentProps, 'Id' | 'Name' | 'DefaultOrder'>;
  summary: Pick<Bond100StudentSummary, 'fetchedAt'> | null;
  count: number;
}

export function defaultBond100SortDirection(mode: Bond100SortMode): SortDirection {
  return mode === 'bond100' || mode === 'recent' ? 'desc' : 'asc';
}

/** Missing freshness dates stay last in either direction; ties use release order. */
export function compareBond100Cards(
  a: SortableCard,
  b: SortableCard,
  mode: Bond100SortMode,
  direction: SortDirection,
): number {
  const byOrder =
    (a.student.DefaultOrder ?? a.student.Id) - (b.student.DefaultOrder ?? b.student.Id);
  let comparison = byOrder;
  if (mode === 'name') comparison = a.student.Name.localeCompare(b.student.Name);
  if (mode === 'bond100') comparison = a.count - b.count;
  if (mode === 'recent') {
    const fa = a.summary?.fetchedAt ?? '';
    const fb = b.summary?.fetchedAt ?? '';
    if (!fa && fb) return 1;
    if (fa && !fb) return -1;
    comparison = fa.localeCompare(fb);
  }
  if (comparison === 0) return byOrder || a.student.Id - b.student.Id;
  return direction === 'asc' ? comparison : -comparison;
}
