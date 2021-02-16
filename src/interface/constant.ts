interface ObjectProps {
  [key: string]: any;
}

interface CharacterProps {
  _id: string,
  guildRank?: boolean,
  createOnlyUnique?: boolean,
  iteration?: number,
  forceUpdate?: boolean
}

interface RealmProps extends ObjectProps {
  _id?: string,
  name?: string,
  category?: string,
  race?: string,
  timezone?: string,
  slug?: string,
  ticker?: string,
  locale?: string,
  name_locale?: string,
  slug_locale?: string,
  has_queue?: boolean,
  connected_realm_id?: number,
  population_status?: string,
  status?: string
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

interface PopulationRealmProps extends ObjectProps {
  characters_total?: number,
  characters_active?: number,
  characters_active_alliance?: number,
  characters_active_horde?: number,
  characters_active_max_level?: number,
  characters_guild_members?: number,
  characters_guildless?: number,
  players_unique?: number,
  players_active_unique?: number,
  guilds_total?: number,
  guilds_alliance?: number,
  guilds_horde?: number,
  characters_classes: {
    _id: string,
    value: number
  }[],
  characters_professions: {
    _id: string,
    value: number
  }[],
  characters_covenants: {
    _id: string,
    value: number
  }[],
}

const RealmsTicker = new Map([
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

const CharactersClasses = [
  'Death Knight', 'Demon Hunter',
  'Druid',        'Hunter',
  'Mage',         'Monk',
  'Paladin',      'Priest',
  'Rogue',        'Shaman',
  'Warlock',      'Warrior'
];

const CharactersProfessions = [
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
  ConnectedRealmProps,
  PopulationRealmProps,
  RealmsTicker,
  CharactersClasses,
  CharactersProfessions
}
