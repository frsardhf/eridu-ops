export interface ResourceProps {
  Id: number;
  Name: string;
  Rarity: string;
  Category: string;
  Quality: number;
  CraftQuality?: number;
  ExpValue?: number;
  Recipe?: number[][];
  QuantityOwned?: number;
  Icon: string;
  Tier?: number;
  Tags: string[];
  Description?: string;
  LevelUpFeedExp?: number;
  SubCategory?: string;
  /** Credit cost to craft this item (gear pieces only; absent on exp/weapon items). */
  RecipeCost?: number;
}

/**
 * CachedResource extends ResourceProps with guaranteed QuantityOwned
 * Used in the resource cache store after merging items with inventory
 */
export interface CachedResource extends ResourceProps {
  QuantityOwned: number;
}

export const MATERIAL = {
  'category': ["CharacterExpGrowth", "Favor"],
  'subcategory': ["Artifact", "CDItem", "BookItem"],
  'id': ['5', '23', '2000', '2001', '2002', '9999']
};

// Equipment inventory = the 'Exp' enhancement balls PLUS craftable gear pieces,
// the latter selected by their RecipeCost (each value is a gear-tier credit cost).
export const EQUIPMENT = {
  'category': ['Exp'],
  'recipecost': ['1500', '10000', '25000', '50000',
    '75000', '100000', '125000', '150000', '175000'],
};

export const ALL_RARITIES = ['N', 'R', 'SR', 'SSR'] as const;

export const GENERIC_GIFT_TAGS = ["BC", "Bc", "ew", "DW"];

export const YELLOW_STONE_ID = 82;
export const SR_GIFT_MATERIAL_ID = 100000;
export const SELECTOR_BOX_ID = 100008;
export const SSR_GIFT_MATERIAL_ID = 100009;

export const GIFT_BOX_IDS = ['82', '100000', '100008', '100009'];

export const GIFT_BOX_EXP_VALUES = { 'SR': 20, 'SSR': 120 } as const;

export type GiftRarity = keyof typeof GIFT_BOX_EXP_VALUES;
