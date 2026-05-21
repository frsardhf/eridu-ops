/**
 * Shared sets of gift-related IDs used across the bond-planning surface.
 *
 * The underlying numeric IDs (YELLOW_STONE_ID, SR_GIFT_MATERIAL_ID, etc.) live
 * in `types/resource.ts`. This module groups them into semantic sets so callers
 * can express intent ("is this a gift-box item?", "should this be hidden from
 * the BondsPage favored grid?") instead of comparing IDs ad hoc.
 */

import {
  SELECTOR_BOX_ID,
  SR_GIFT_MATERIAL_ID,
  SSR_GIFT_MATERIAL_ID,
  YELLOW_STONE_ID,
} from '@/types/resource';

/**
 * Every item ID that represents a "gift box" entry — used to distinguish box
 * inputs from regular gift-item inputs in `useStudentGifts`.
 */
export const BOX_ITEM_IDS: ReadonlySet<number> = new Set([
  YELLOW_STONE_ID,
  SR_GIFT_MATERIAL_ID,
  SSR_GIFT_MATERIAL_ID,
  SELECTOR_BOX_ID,
]);

/**
 * Box IDs the BondsPage hides from its favored grid:
 *   - Yellow stone is conversion fuel (rendered as a separate Conversion card).
 *   - SR/SSR_GIFT_MATERIAL_ID are aggregate stand-ins for non-favor gifts; the
 *     bonds page shows the individual non-favor gifts in the "Other gifts"
 *     section instead, so the aggregate row would duplicate the data.
 * The selector box is intentionally NOT hidden — it's a real giftable box.
 */
export const HIDDEN_BOX_IDS: ReadonlySet<number> = new Set([
  YELLOW_STONE_ID,
  SR_GIFT_MATERIAL_ID,
  SSR_GIFT_MATERIAL_ID,
]);
