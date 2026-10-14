import { describe, expect, it } from 'vitest';
import { compareBond100Cards, defaultBond100SortDirection } from '../bond100SortUtils';
import type { Bond100SortMode } from '@/types/bond100';
import type { SortDirection } from '@/types/header';

const cards = [
  {
    student: { Id: 1, Name: 'Aru', DefaultOrder: 30 },
    count: 3,
    summary: { fetchedAt: '2026-10-14' },
  },
  { student: { Id: 2, Name: 'Eimi', DefaultOrder: 10 }, count: 1, summary: null },
  {
    student: { Id: 3, Name: 'Hina', DefaultOrder: 20 },
    count: 2,
    summary: { fetchedAt: '2026-10-10' },
  },
];

function sorted(mode: Bond100SortMode, direction: SortDirection) {
  return [...cards]
    .sort((a, b) => compareBond100Cards(a, b, mode, direction))
    .map((card) => card.student.Name);
}

describe('Hall sorting', () => {
  it('preserves the original default directions', () => {
    expect(defaultBond100SortDirection('default')).toBe('asc');
    expect(defaultBond100SortDirection('name')).toBe('asc');
    expect(defaultBond100SortDirection('bond100')).toBe('desc');
    expect(defaultBond100SortDirection('recent')).toBe('desc');
  });
  it('sorts release in both directions', () => {
    expect(sorted('default', 'asc')).toEqual(['Eimi', 'Hina', 'Aru']);
    expect(sorted('default', 'desc')).toEqual(['Aru', 'Hina', 'Eimi']);
  });
  it('sorts names in both directions', () => {
    expect(sorted('name', 'asc')).toEqual(['Aru', 'Eimi', 'Hina']);
    expect(sorted('name', 'desc')).toEqual(['Hina', 'Eimi', 'Aru']);
  });
  it('sorts visible counts in both directions', () => {
    expect(sorted('bond100', 'asc')).toEqual(['Eimi', 'Hina', 'Aru']);
    expect(sorted('bond100', 'desc')).toEqual(['Aru', 'Hina', 'Eimi']);
  });
  it('sorts recent dates both ways with missing dates last', () => {
    expect(sorted('recent', 'asc')).toEqual(['Hina', 'Aru', 'Eimi']);
    expect(sorted('recent', 'desc')).toEqual(['Aru', 'Hina', 'Eimi']);
  });
  it('uses release order for equal counts and dates in either direction', () => {
    for (const mode of ['bond100', 'recent'] as const) {
      for (const direction of ['asc', 'desc'] as const) {
        const tied = cards.map((card) => ({
          ...card,
          count: 1,
          summary: { fetchedAt: '2026-10-14' },
        }));
        expect(
          tied
            .sort((a, b) => compareBond100Cards(a, b, mode, direction))
            .map((card) => card.student.Name),
        ).toEqual(['Eimi', 'Hina', 'Aru']);
      }
    }
  });
});
