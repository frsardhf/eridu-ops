import {
  GIFT_CATEGORY,
  SCHOOL_MATERIAL_SUBCATEGORIES,
  SECRET_TECH_NOTE_ID,
  type ResourceProps,
} from '@/types/resource';

export type InventoryGroupId = 'general' | 'academy' | 'gifts' | 'equipment';
export type InventoryResourceType = 'resource' | 'equipment';

const schoolMaterialSubcategories = new Set<string>(SCHOOL_MATERIAL_SUBCATEGORIES);

/** Returns the inventory group for a source-qualified resource. */
export function getInventoryGroupId(
  resource: ResourceProps,
  source: InventoryResourceType,
): InventoryGroupId {
  if (source === 'equipment') return 'equipment';
  if (resource.Category === GIFT_CATEGORY) return 'gifts';
  if (
    resource.Id !== SECRET_TECH_NOTE_ID &&
    schoolMaterialSubcategories.has(resource.SubCategory ?? '')
  ) {
    return 'academy';
  }
  return 'general';
}
