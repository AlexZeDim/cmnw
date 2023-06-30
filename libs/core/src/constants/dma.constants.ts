import { mquery } from 'mongoose';
import { IItem, IItemFieldMap } from '@app/core/types';

export const DMA_TIMEOUT_TOLERANCE = 30 * 1000;

export const DMA_SOURCE_GOLD = 'https://funpay.ru/chips/2/';

export enum DMA_SOURCE {
  API = 'DMA-API',
  LAB = 'DMA-LAB',
}

export enum VALUATION_TYPE {
  VSP = 'VSP',
  VENDOR = 'VENDOR',
  DERIVATIVE = 'DERIVATIVE',
  REAGENT = 'REAGENT',
  MARKET = 'MARKET',
  PREMIUM = 'PREMIUM',
  FUNPAY = 'FUNPAY',
  COMMDTY = 'COMMDTY',
  ITEM = 'ITEM',
  OTC = 'OTC',
  WOWTOKEN = 'WOWTOKEN',
  GOLD = 'GOLD',
}

export enum ORDER_FLOW {
  C = 'created',
  R = 'removed',
}

export enum MARKET_TYPE {
  A = 'AUCTION',
  C = 'COMMDTY',
  G = 'GOLD',
  T = 'TOKEN',
}

export enum FLAG_TYPE {
  B = 'BUY',
  S = 'SELL',
  FIX = 'PAY FIX',
  FLOAT = 'PAY FLOAT',
}

export enum FIX_FLOAT {
  FIX = 'PAY FIX',
  FLOAT = 'PAY FLOAT',
}

export enum PRICING_TYPE {
  PRIMARY = 'primary',
  REVERSE = 'reverse',
  DERIVATIVE = 'derivative',
  REVIEW = 'review',
}

export const EXPANSION_TICKER: Map<string, string> = new Map([
  ['Shadowlands', 'SHDW'],
  ['Kul', 'BFA'],
  ['Zandalari', 'BFA'],
  ['Legion', 'LGN'],
  ['Draenor', 'WOD'],
  ['Pandaria', 'MOP'],
  ['Cataclysm', 'CATA'],
  ['Northrend', 'WOTLK'],
  ['Outland', 'TBC'],
]);

export const EXPANSION_TICKER_ID: Map<number, string> = new Map([
  [8, 'SHDW'],
  [7, 'BFA'],
  [6, 'LGN'],
  [5, 'WOD'],
  [4, 'MOP'],
  [3, 'CATA'],
  [2, 'WOTLK'],
  [1, 'TBC'],
  [0, 'CLSC'],
]);

export const PROFESSION_TICKER: Map<number, string> = new Map([
  [164, 'BSMT'],
  [165, 'LTHR'],
  [171, 'ALCH'],
  [182, 'HRBS'],
  [185, 'COOK'],
  [186, 'ORE'],
  [197, 'CLTH'],
  [202, 'ENGR'],
  [333, 'ENCH'],
  [356, 'FISH'],
  [393, 'SKIN'],
  [755, 'JWLC'],
  [773, 'INSC'],
  [794, 'ARCH'],
]);

export const GOLD_ITEM_ENTITY = {
  id: 1,
  name: 'Gold',
  quality: 'Currency',
  itemClass: 'Currency',
  itemSubClass: 'Currency',
  hasContracts: true,
  assetClass: [VALUATION_TYPE.GOLD],
  ticker: VALUATION_TYPE.GOLD,
  tags: ['gold', 'currency', 'funpay'],
  indexBy: DMA_SOURCE.LAB,
};

export const ITEM_FIELD_MAPPING = new Map<keyof Partial<IItem>, IItemFieldMap>([
  ['name', { key: 'name', path: 'name' }],
  ['quality', { key: 'quality', path: 'quality.name' }],
  ['level', { key: 'itemLevel', path: 'level' }],
  ['item_class', { key: 'itemClass', path: 'item_class.name' }],
  ['item_subclass', { key: 'itemSubClass', path: 'item_subclass.name' }],
  ['purchase_price', { key: 'purchasePrice', path: 'purchase_price' }],
  ['purchase_quantity', { key: 'purchaseQuantity', path: 'purchase_quantity' }],
  ['sell_price', { key: 'vendorSellPrice', path: 'sell_price' }],
  ['is_equippable', { key: 'isEquip', path: 'is_equippable' }],
  ['is_stackable', { key: 'isStackable', path: 'is_stackable' }],
  ['inventory_type', { key: 'inventoryType', path: 'inventory_type.name' }],
  ['required_level', { key: 'level', path: 'required_level' }],
  ['preview_item', { key: 'lootType', path: 'preview_item.binding.type' }],
]);

export const ASSET_EVALUATION_PRIORITY: Map<number, mquery> = new Map([
  // GOLD
  [1, { _id: 1 }],
  // WOWTOKEN
  [2, { asset_class: VALUATION_TYPE.WOWTOKEN }],
  // ACTUAL NON DERIVATIVE REAGENT & MARKET & COMMDTY
  [
    3,
    {
      $and: [
        { expansion: 'SHDW' },
        {
          asset_class: {
            $nin: [VALUATION_TYPE.DERIVATIVE, VALUATION_TYPE.PREMIUM],
          },
        },
        {
          asset_class: {
            $all: [
              VALUATION_TYPE.REAGENT,
              VALUATION_TYPE.MARKET,
              VALUATION_TYPE.COMMDTY,
            ],
          },
        },
      ],
    },
  ],
  // ACTUAL ALL REAGENT & DERIVATIVE
  [
    4,
    {
      $and: [
        { expansion: 'SHDW' },
        {
          asset_class: {
            $all: [VALUATION_TYPE.REAGENT, VALUATION_TYPE.DERIVATIVE],
          },
        },
      ],
    },
  ],
  // PURE DERIVATIVE
  [
    5,
    {
      $and: [
        { expansion: 'SHDW' },
        {
          asset_class: {
            $nin: [VALUATION_TYPE.REAGENT],
          },
        },
        { asset_class: VALUATION_TYPE.DERIVATIVE },
      ],
    },
  ],
]);
