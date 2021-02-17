interface ObjectProps {
  [key: string]: any;
}

interface CharacterProps extends ObjectProps {
  _id: string,
  name: string,
  realm: string,
  realm_id: number,
  realm_name: string,
  id: number,
  guild: string,
  guild_id: string,
  guild_guid: number,
  guild_rank: number,
  level: number,
  character_class: string,
  last_modified: Date,
  created_by: string,
  updated_by: string,
  race: string,
  gender: string,
  faction: string,
  avatar: string,
  inset: string,
  main: string,
  updatedAt: Date,
  createdAt: Date,
  guildRank: boolean,
  createOnlyUnique: boolean,
  forceUpdate: boolean,
  iteration: number,
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
  slug?: string,
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

const CharactersClasses: string[] = [
  'Death Knight', 'Demon Hunter',
  'Druid',        'Hunter',
  'Mage',         'Monk',
  'Paladin',      'Priest',
  'Rogue',        'Shaman',
  'Warlock',      'Warrior'
];

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
  RealmsTicker,
  CharactersClasses,
  CharactersProfessions
}
