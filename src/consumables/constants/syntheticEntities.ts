/**
 * Synthetic Entities - Objects that don't exist in SchaleDB but are needed by the application
 *
 * This module centralizes the definition and management of synthetic entities
 * to ensure consistency across the codebase and simplify maintenance.
 */

// Define CachedResource interface locally to avoid circular dependency with resource.ts
interface CachedResource {
  Id: number;
  Name: string;
  Rarity: string;
  Category: string;
  Quality: number;
  ExpValue?: number;
  Recipe?: number[][] | null;
  QuantityOwned: number;
  Icon: string;
  Tier?: number;
  Tags: string[];
  Description?: string;
}

/**
 * Synthetic entity definitions
 * These are objects that are created by the application, not fetched from SchaleDB
 */
export const SYNTHETIC_ENTITIES = {
  /**
   * Credits - In-game currency used for various upgrades
   * ID: 5 (reserved, not used by SchaleDB)
   */
  CREDITS: {
    Id: 5,
    Name: 'Credits',
    Rarity: 'C',
    Category: 'Currency',
    Quality: 1,
    Tags: ['c'],
    Icon: 'currency_icon_gold',
    Description: 'In-game currency used for various upgrades',
  } as const,
} as const;

// Type-safe ID constants derived from SYNTHETIC_ENTITIES
export const CREDITS_ID = SYNTHETIC_ENTITIES.CREDITS.Id;

// Array of all synthetic entity IDs for easy checking
export const SYNTHETIC_IDS = Object.values(SYNTHETIC_ENTITIES).map(e => e.Id);

/**
 * Default credits entry with QuantityOwned = 0
 * For backward compatibility with code that expects a constant
 */
export const creditsEntry: CachedResource = {
  ...SYNTHETIC_ENTITIES.CREDITS,
  QuantityOwned: 0,
};

/**
 * Check if an ID belongs to a synthetic entity
 * @param id - The entity ID to check
 * @returns true if the ID is a synthetic entity
 */
export function isSyntheticEntity(id: number): boolean {
  return SYNTHETIC_IDS.includes(id);
}

/**
 * Get the credits entry as a CachedResource with QuantityOwned
 * @param quantityOwned - The quantity owned (default: 0)
 * @returns CachedResource object for credits
 */
export function createCreditsEntry(quantityOwned: number = 0): CachedResource {
  return {
    ...SYNTHETIC_ENTITIES.CREDITS,
    QuantityOwned: quantityOwned,
  };
}

/**
 * Inject synthetic entities into an items record
 * Used during data initialization to ensure synthetic entities exist
 * @param items - The items record to inject into
 * @param existingQuantities - Optional map of existing quantities to preserve
 */
export function injectSyntheticEntities(
  items: Record<number, CachedResource>,
  existingQuantities?: Record<number, number>
): void {
  // Inject credits if not already present
  if (!items[CREDITS_ID]) {
    const quantity = existingQuantities?.[CREDITS_ID] ?? 0;
    items[CREDITS_ID] = createCreditsEntry(quantity);
  }
}

/**
 * Check if synthetic entities are present in an items record
 * @param items - The items record to check
 * @returns true if all synthetic entities are present
 */
export function hasSyntheticEntities(items: Record<number, unknown>): boolean {
  return SYNTHETIC_IDS.every(id => id in items);
}
