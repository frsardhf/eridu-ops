import { describe, expect, it } from 'vitest';
import { filterByProperty, applyFilters } from '../filterUtils';
import type { ResourceProps } from '@/types/resource';

function res(over: Partial<ResourceProps> & { Id: number }): ResourceProps {
  return {
    Name: `item-${over.Id}`,
    Rarity: 'N',
    Category: 'Misc',
    Quality: 1,
    Icon: 'icon',
    Tags: [],
    ...over,
  };
}

const items: Record<string, ResourceProps> = {
  '5': res({ Id: 5, Category: 'Favor' }),
  '23': res({ Id: 23, Category: 'CharacterExpGrowth', SubCategory: 'BookItem' }),
  '100': res({ Id: 100, Category: 'Misc', SubCategory: 'Artifact' }),
  '200': res({ Id: 200, Category: 'Exp' }),
  '1008': res({ Id: 1008, Category: 'Hat', RecipeCost: 150000 }),
};

describe('filterByProperty', () => {
  it('filters by category', () => {
    expect(Object.keys(filterByProperty(items, 'category', 'Favor'))).toEqual(['5']);
  });

  it('filters by subcategory, skipping items without one', () => {
    expect(Object.keys(filterByProperty(items, 'subcategory', ['Artifact', 'BookItem'])).sort())
      .toEqual(['100', '23']);
  });

  it('matches ids numerically even when passed as strings', () => {
    expect(Object.keys(filterByProperty(items, 'id', ['5', '200'])).sort()).toEqual(['200', '5']);
  });

  it('matches gear pieces by numeric RecipeCost (string-coerced)', () => {
    expect(Object.keys(filterByProperty(items, 'recipecost', ['150000']))).toEqual(['1008']);
  });

  it('returns nothing when no item matches', () => {
    expect(filterByProperty(items, 'category', 'Nonexistent')).toEqual({});
  });
});

describe('applyFilters', () => {
  it('unions multiple criteria (inclusive OR)', () => {
    const out = applyFilters(items, { category: ['Favor'], id: ['23'] });
    expect(Object.keys(out).sort()).toEqual(['23', '5']);
  });

  it('dedups items matched by more than one criterion', () => {
    const out = applyFilters(items, { category: ['Favor'], id: ['5'] });
    expect(Object.keys(out)).toEqual(['5']);
  });

  it('ignores empty/undefined criteria', () => {
    const out = applyFilters(items, { category: ['Exp'], id: undefined as unknown as string[] });
    expect(Object.keys(out)).toEqual(['200']);
  });
});
