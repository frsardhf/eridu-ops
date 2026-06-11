/**
 * Utility functions for filtering resources and equipment by SchaleDB fields.
 * Used by the inventory grids and the data-load pipeline.
 */

import type { ResourceProps } from '@/types/resource';

/** Filterable SchaleDB property. `id`/`recipecost` are numeric fields; the
 *  others are string fields. (`tier` was dropped: no filter constant uses it.) */
type FilterProperty = 'category' | 'subcategory' | 'id' | 'recipecost';

const NUMERIC_FIELD = { id: 'Id', recipecost: 'RecipeCost' } as const;
const STRING_FIELD = { category: 'Category', subcategory: 'SubCategory' } as const;

/**
 * Filter items by a specific property and value(s). Numeric properties (`id`,
 * `recipecost`) coerce the values to numbers since callers pass them as strings.
 */
export function filterByProperty(
  items: Record<string, ResourceProps>,
  type: FilterProperty,
  value: string | string[]
): Record<string, ResourceProps> {
  const rawValues = Array.isArray(value) ? value : [value];
  const filtered: Record<string, ResourceProps> = {};

  if (type === 'id' || type === 'recipecost') {
    const field = NUMERIC_FIELD[type];
    const wanted = new Set(rawValues.map(Number));
    for (const key in items) {
      const v = items[key][field];
      if (v != null && wanted.has(v)) filtered[key] = items[key];
    }
    return filtered;
  }

  const field = STRING_FIELD[type];
  const wanted = new Set(rawValues);
  for (const key in items) {
    const v = items[key][field];
    if (v != null && wanted.has(v)) filtered[key] = items[key];
  }
  return filtered;
}

/**
 * Apply multiple filter criteria (inclusive OR): an item is kept if it matches
 * any criterion. e.g. `{ category: ['Favor'], id: ['5', '23'] }`.
 */
export function applyFilters(
  items: Record<string, ResourceProps>,
  filterObj: Partial<Record<FilterProperty, string[]>>
): Record<string, ResourceProps> {
  const merged: Record<string, ResourceProps> = {};
  for (const [type, value] of Object.entries(filterObj)) {
    if (!value) continue;
    Object.assign(merged, filterByProperty(items, type as FilterProperty, value));
  }
  return merged;
}
