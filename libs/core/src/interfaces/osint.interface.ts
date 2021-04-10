export interface CharacterInterface {
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
  status_code?: number,
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
  updateRIO?: boolean,
  updateWCL?: boolean,
  updateWP?: boolean,
  iteration?: number,
}

export interface GuildMemberInterface {
  _id: string,
  id: number,
  rank: number
}

export interface GuildRosterInterface {
  members: {
    rank: number,
    character: {
      id: number,
      name: string,
      level: number,
      playable_class: {
        id: number
      }
    }
  }[]
}

export interface GuildInterface {
  _id: string,
  name: string,
  realm: string,
  realm_id?: number,
  realm_name?: string,
  id?: number,
  faction?: string,
  members: GuildMemberInterface[],
  achievement_points?: number,
  member_count?: number,
  last_modified?: Date,
  created_timestamp?: Date,
  status_code?: number,
  created_by?: string,
  updated_by?: string,
  createOnlyUnique?: boolean,
  forceUpdate?: boolean,
  iteration?: number,
  updatedAt?: Date,
  createdAt?: Date,
}

export interface RealmInterface {
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
  population?: boolean,
  status?: string,
  connected_realms?: string[],
  wcl_ids?: { name: string, id: number }[]
}

export interface LogInterface {
  root_id: string,
  root_history: string[],
  original: string,
  updated: string,
  event: string,
  action: string,
  t0: Date,
  t1: Date
}

export interface Locales {
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

export interface CharactersPopulationRealm {
  _id: string,
  value: number[]
}

export interface PopulationRealmInterface {
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

export interface ConnectedRealmInterface {
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
