import { mquery } from 'mongoose';

export const DMA_TIMEOUT_TOLERANCE = 30 * 1000;

export enum DMA_SOURCE {
  API = 'DMA-API'
}

export enum VALUATION_TYPE {
  VSP = 'vsp',
  VENDOR = 'vendor',
  DERIVATIVE = 'derivative',
  REAGENT = 'reagent',
  MARKET = 'market',
  PREMIUM = 'premium',
  FUNPAY = 'funpay',
  COMMDTY = 'commdty',
  ITEM = 'item',
  OTC = 'otc',
  WOWTOKEN = 'wowtoken',
  GOLD = 'gold',
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

export enum ALIAS_KEY {
  Discord = 'discord',
  Bnet = 'battle.tag',
  Twitter = 'twitter',
  Name = 'name',
  Character = 'character',
  Nickname = 'nickname',
  Codename = 'codename',
}

export enum PRICING_TYPE {
  PRIMARY = 'primary',
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

export const ASSET_EVALUATION_PRIORITY: Map<number, mquery> = new Map([
  // GOLD
  [0, { _id: 1 }],
  // WOWTOKEN
  [1, { asset_class: 'WOWTOKEN' }],
  // ACTUAL NON DERIVATIVE REAGENT & MARKET & COMMDTY
  [2,
    {
      $and: [
        { expansion: 'SHDW' },
        {
          asset_class: {
            $nin: ['DERIVATIVE', 'PREMIUM'],
          },
        },
        {
          asset_class: {
            $all: ['REAGENT', 'MARKET', 'COMMDTY'],
          },
        },
      ],
    },
  ],
  // ACTUAL ALL REAGENT & DERIVATIVE
  [3,
    {
      $and: [
        { expansion: 'SHDW' },
        {
          asset_class: {
            $all: ['REAGENT', 'DERIVATIVE'],
          },
        },
      ],
    },
  ],
  // PURE DERIVATIVE
  [4,
    {
      $and: [
        { expansion: 'SHDW' },
        {
          asset_class: {
            $nin: ['REAGENT'],
          },
        },
        { asset_class: 'DERIVATIVE' },
      ],
    },
  ],
]);
