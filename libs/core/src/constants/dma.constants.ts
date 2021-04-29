export enum ValuationType {
  Vendor = 'vendor',
  Derivative = 'derivative',
  Reagent = 'reagent',
  Market = 'market',
  Premium = 'premium',
  Funpay = 'funpay',
  Otc = 'otc',
  Wowtoken = 'wowtoken',
}

export enum FlagType {
  B = 'BUY',
  S = 'SELL',
  FIX = 'PAY FIX',
  FLOAT = 'PAY FLOAT',
}

export enum FixFloat {
  FIX = 'PAY FIX',
  FLOAT = 'PAY FLOAT',
}

export enum BuySell {
  B = 'BUY',
  S = 'SELL',
}

export enum AliasKey {
  Discord = 'discord',
  Bnet = 'battle.tag',
  Twitter = 'twitter',
  Name = 'name',
  Character = 'character',
  Nickname = 'nickname',
  Codename = 'codename',
}

export enum PricingType {
  Primary = 'primary',
  Derivative = 'derivative',
  Review = 'review',
}

export const ExpansionTicker: Map<string, string> = new Map([
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
