/**
 * Synthetic Entities — application-defined entities that don't exist in SchaleDB.
 *
 * `studentStorage.getItems` unions these in at read time so they appear in the
 * items cache with metadata + user-tracked QuantityOwned from `items_inventory`.
 * They are deliberately NOT persisted to the items master table.
 */

export const SYNTHETIC_ENTITIES = {
  /**
   * Credits — in-game currency used for upgrades.
   * ID 5 is reserved (not used by SchaleDB).
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
  },
};

export const CREDITS_ID = SYNTHETIC_ENTITIES.CREDITS.Id;
