interface ObjectProps {
  [key: string]: any;
}

interface ItemProps extends ObjectProps {
  quality: string,
  item_class: string,
  item_subclass: string,
  inventory_type: string,
  purchase_price: number,
  sell_price: number,
  preview_item: string,
  loot_type: string
}

interface CharacterProps extends ObjectProps {
  _id: string,
  name: string,
  realm: string,
  realm_id?: number,
  realm_name?: string,
  id?: number,
  guild?: string,
  guild_id?: string,
  guild_guid?: number,
  guild_rank?: number,
  level?: number,
  character_class?: string,
  last_modified?: Date,
  created_by?: string,
  updated_by?: string,
  race?: string,
  gender?: string,
  faction?: string,
  avatar?: string,
  inset?: string,
  main?: string,
  updatedAt?: Date,
  createdAt?: Date,
  guildRank?: boolean,
  createOnlyUnique?: boolean,
  forceUpdate?: boolean,
  iteration?: number,
}

interface GuildMemberProps {
  _id: string,
  id: number,
  rank: number
}

interface GuildProps {
  _id: string,
  id: number,
  name: string,
  realm: {
    _id: number,
    name: string,
    slug: string
  },
  members: GuildMemberProps[],
  faction: string,
  achievement_points: number,
  member_count: number,
  lastModified: Date,
  created_timestamp: Date,
  statusCode: number,
  createdBy: string,
  updatedBy: string
}

interface RealmProps extends ObjectProps {
  _id: number,
  slug: string,
  name?: string,
  category?: string,
  race?: string,
  timezone?: string,
  ticker?: string,
  locale?: string,
  name_locale?: string,
  slug_locale?: string,
  has_queue?: boolean,
  wcl_id?: number,
  connected_realm_id?: number,
  population_status?: string,
  status?: string
}

interface Locales {
  en_US: string,
  es_MX: string,
  pt_BR: string,
  de_DE: string,
  en_GB: string,
  es_ES: string,
  fr_FR: string,
  it_IT: string,
  ru_RU: string,
  ko_KR: string,
  zh_TW: string,
  zh_CN: string
}

interface RecipeProps extends ObjectProps {
  id: number,
  name: Locales,
  description: Locales,
  media: { id: number },
  recipe_id: number,
  alliance_crafted_item: {
    name: Locales,
    id: number
  },
  horde_crafted_item: {
    name: Locales,
    id: number
  },
  crafted_item: {
    name: Locales,
    id: number
  },
  reagents: { reagent: ObjectProps, quantity: number }[]
  crafted_quantity: { value: number },
  modified_crafting_slots: { slot_type: ObjectProps, display_order: number }[],
  lastModified: string
}

interface ConnectedRealmProps extends ObjectProps {
  id: string,
  has_queue: boolean,
  status: {
    name: string
  },
  population: {
    name: string
  },
  realms: [{
    slug: string
  }]
}

interface CharactersPopulationRealm {
  _id: string,
  value: number[]
}

interface PopulationRealmProps extends ObjectProps {
  characters_total: number[],
  characters_active: number[],
  characters_active_alliance: number[],
  characters_active_horde: number[],
  characters_active_max_level: number[],
  characters_guild_members: number[],
  characters_guildless: number[],
  players_unique: number[],
  players_active_unique: number[],
  guilds_total: number[],
  guilds_alliance: number[],
  guilds_horde: number[],
  characters_classes: CharactersPopulationRealm[],
  characters_professions: CharactersPopulationRealm[],
  characters_covenants: CharactersPopulationRealm[],
  timestamps: number[]
}

enum ValuationType {
  Vendor = "vendor",
  Derivative = "derivative",
  Reagent = "reagent",
  Market = "market",
  Premium = "premium",
  Funpay = "funpay",
  Otc = "otc",
  Wowtoken = "wowtoken",
}

enum FlagType {
  B = "BUY",
  S = "SELL",
  FIX = "PAY FIX",
  FLOAT = "PAY FLOAT",
}

enum FixFloat {
  FIX = "PAY FIX",
  FLOAT = "PAY FLOAT"
}

enum BuySell {
  B = "BUY",
  S = "SELL"
}

enum AliasKey {
  Discord = "discord",
  Bnet = "battle.tag",
  Twitter = "twitter",
  Name = "name",
  Character = "character",
  Nickname = "nickname",
  Codename = "codename",
}

enum PricingType {
  Primary = "primary",
  Derivative = "derivative",
  Review = "review"
}

const RealmsTicker: Map<string, string> = new Map([
  ['Gordunni', 'GRDNNI'],
  ['Lich King', 'LCHKNG'],
  ['Soulflayer', 'SLFLYR'],
  ['Deathguard', 'DTHGRD'],
  ['Deepholm', 'DEPHLM'],
  ['Greymane', 'GREYMN'],
  ['Galakrond', 'GLKRND'],
  ['Howling Fjord', 'HWFJRD'],
  ['Razuvious', 'RAZUVS'],
  ['Deathweaver', 'DTHWVR'],
  ['Fordragon', 'FRDRGN'],
  ['Borean Tundra', 'BRNTND'],
  ['Azuregos', 'AZURGS'],
  ['Booty Bay', 'BTYBAY'],
  ['Thermaplugg', 'TRMPLG'],
  ['Grom', 'GROM'],
  ['Goldrinn', 'GLDRNN'],
  ['Blackscar', 'BLKSCR'],
]);

const professionsTicker = new Map([
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

const CharactersClasses: string[] = [
  'Death Knight', 'Demon Hunter',
  'Druid',        'Hunter',
  'Mage',         'Monk',
  'Paladin',      'Priest',
  'Rogue',        'Shaman',
  'Warlock',      'Warrior'
];

const ExpansionTicker: Map<string, string> = new Map([
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

const ExpansionIdTicker: Map<number, string> = new Map([
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

const CharactersProfessions: {name: string, id: number}[] = [
  {
    "name": "Blacksmithing",
    "id": 164
  },
  {
    "name": "Leatherworking",
    "id": 165
  },
  {
    "name": "Alchemy",
    "id": 171
  },
  {
    "name": "Herbalism",
    "id": 182
  },
  {
    "name": "Cooking",
    "id": 185
  },
  {
    "name": "Mining",
    "id": 186
  },
  {
    "name": "Tailoring",
    "id": 197
  },
  {
    "name": "Engineering",
    "id": 202
  },
  {
    "name": "Enchanting",
    "id": 333
  },
  {
    "name": "Fishing",
    "id": 356
  },
  {
    "name": "Skinning",
    "id": 393
  },
  {
    "name": "Jewelcrafting",
    "id": 755
  },
  {
    "name": "Inscription",
    "id": 773
  },
  {
    "name": "Archaeology",
    "id": 794
  },
  {
    "name": "Soul Cyphering",
    "id": 2777
  },
  {
    "name": "Abominable Stitching",
    "id": 2787
  },
  {
    "name": "Ascension Crafting",
    "id": 2791
  }
];

export {
  ObjectProps,
  CharacterProps,
  RealmProps,
  GuildProps,
  GuildMemberProps,
  ConnectedRealmProps,
  PopulationRealmProps,
  ValuationType,
  FlagType,
  FixFloat,
  BuySell,
  AliasKey,
  ItemProps,
  PricingType,
  RecipeProps,
  ExpansionIdTicker,
  ExpansionTicker,
  professionsTicker,
  RealmsTicker,
  CharactersClasses,
  CharactersProfessions
}
