/**
 * Utility functions for filtering resources and equipment
 * Used by grid components to filter items based on criteria
 */

/**
 * Filter items by a specific property and value(s)
 * @param items - Record of items to filter
 * @param type - Property type to filter by (category, subcategory, id, tier, recipecost)
 * @param value - Value(s) to match (string or array of strings)
 * @returns Filtered items as a Record
 */
export function filterByProperty(
  items: Record<string, any>,
  type: string,
  value: string | string[]
): Record<string, any> {
  let valueArray: (string | number)[] = Array.isArray(value) ? value : [value];
  const filteredItems: Record<string, any> = {};

  // Convert to numbers for numeric properties
  if (type === 'id' || type === 'tier' || type === 'recipecost') {
    valueArray = valueArray.map(val => Number(val));
  }

  for (const itemId in items) {
    if (isItemMatch(items[itemId], type, valueArray)) {
      filteredItems[itemId] = items[itemId];
    }
  }

  return filteredItems;
}

/**
 * Check if an item matches the filter criteria
 * @param item - Item to check
 * @param type - Property type to check
 * @param valueArray - Array of values to match against
 * @returns True if item matches criteria
 */
function isItemMatch(
  item: any,
  type: string,
  valueArray: (string | number)[]
): boolean {
  switch (type) {
    case 'category':
      return valueArray.includes(item.Category);
    case 'subcategory':
      return valueArray.includes(item.SubCategory);
    case 'id':
      return valueArray.includes(item.Id);
    case 'tier':
      return valueArray.includes(item.Tier);
    case 'recipecost':
      return valueArray.includes(item.RecipeCost);
    default:
      return false;
  }
}

/**
 * Merge multiple filtered item records into one
 * @param objects - Array of item records to merge
 * @returns Merged record of all items
 */
function mergeFilteredItems(...objects: Record<string, any>[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const obj of objects) {
    for (const key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Apply multiple filter criteria to items (inclusive OR logic)
 * @param items - Record of items to filter
 * @param filterObj - Object with filter criteria (e.g., { category: ['Exp'], id: ['5', '23'] })
 * @returns Filtered items matching any of the criteria
 */
export function applyFilters(
  items: Record<string, any>,
  filterObj: Record<string, any>
): Record<string, any> {
  const results: Record<string, any>[] = [];

  for (const [type, value] of Object.entries(filterObj)) {
    if (value) {
      const filtered = filterByProperty(items, type, value);
      results.push(filtered);
    }
  }

  return mergeFilteredItems(...results);
}
