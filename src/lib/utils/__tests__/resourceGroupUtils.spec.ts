import { describe, expect, it } from 'vitest';
import type { ResourceProps } from '@/types/resource';
import { getInventoryGroupId } from '../resourceGroupUtils';

function resource(overrides: Partial<ResourceProps> & { Id: number }): ResourceProps {
  return {
    Name: `resource-${overrides.Id}`,
    Rarity: 'N',
    Category: 'Material',
    Quality: 1,
    Icon: 'icon',
    Tags: [],
    ...overrides,
  };
}

describe('getInventoryGroupId', () => {
  it('uses the source to keep overlapping equipment ids separate', () => {
    const item = resource({ Id: 1, SubCategory: 'Artifact' });

    expect(getInventoryGroupId(item, 'resource')).toBe('general');
    expect(getInventoryGroupId(item, 'equipment')).toBe('equipment');
  });

  it('groups gifts by category', () => {
    expect(getInventoryGroupId(resource({ Id: 10, Category: 'Favor' }), 'resource')).toBe('gifts');
  });

  it('groups school books and discs together', () => {
    expect(getInventoryGroupId(resource({ Id: 20, SubCategory: 'BookItem' }), 'resource')).toBe(
      'academy',
    );
    expect(getInventoryGroupId(resource({ Id: 21, SubCategory: 'CDItem' }), 'resource')).toBe(
      'academy',
    );
  });

  it('keeps the secret tech note in general resources', () => {
    expect(getInventoryGroupId(resource({ Id: 9999, SubCategory: 'BookItem' }), 'resource')).toBe(
      'general',
    );
  });
});
