export interface ResourceProps {
  Id: number;
  Name: string;
  Rarity: string;
  Category: string;
  Quality: number;
  ExpValue?: number;
  Recipe?: number[][] | null;
  QuantityOwned?: number;
  Icon: string;
  Tier?: number;
  Tags: string[];
}

export const MATERIAL = {
  'category': ["CharacterExpGrowth"],
  'subcategory': ["Artifact", "CDItem", "BookItem"],
  'id': ['5', '2000', '2001', '2002', '9999']
};

export const EQUIPMENT = {
  'tier': ['0'],
  'recipecost': ['1500', '10000', '25000', '50000', 
    '75000', '100000', '125000', '150000', '175000']
};

export const GENERIC_GIFT_TAGS = ["BC", "Bc", "ew", "DW"];

export const GIFT_BOX_IDS = ['82', '100000', '100008', '100009'];

export const GIFT_BOX_EXP_VALUES = { 'SR': 20, 'SSR': 120 };

export const creditsEntry = {
  Id: 5,
  Name: 'Credits',
  Rarity: 'C',
  Category: 'Currency',
  Quality: 1,
  Tags: ['c'],
  Icon: 'currency_icon_gold',
  Description: 'In-game currency used for various upgrades',
  QuantityOwned: 0
};