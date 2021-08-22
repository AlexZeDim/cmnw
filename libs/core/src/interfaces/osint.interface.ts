import { LFG, OSINT_SOURCE } from '@app/core/constants';
import { BattleNetOptions } from 'blizzapi';

export class CharacterQI implements BattleNetOptions {
  readonly _id: string;

  readonly name: string;

  readonly realm: string;

  readonly guild: string | undefined;

  readonly guild_guid: number | undefined;

  readonly guild_id: string | undefined;

  readonly created_by: string | undefined;

  readonly region: string;

  readonly clientId: string;

  readonly clientSecret: string;

  readonly accessToken: string;

  readonly updated_by: OSINT_SOURCE;

  readonly guildRank: boolean;

  readonly createOnlyUnique: boolean;

  readonly forceUpdate: number;

  readonly iteration: number | undefined;

  readonly looking_for_guild: LFG | undefined;

  readonly updateRIO: boolean | undefined;

  readonly updateWCL: boolean | undefined;

  readonly updateWP: boolean | undefined;

  readonly race: string | undefined;

  readonly level: number | undefined;

  readonly faction: string | undefined;

  readonly gender: string | undefined;

  readonly character_class: string | undefined;

  readonly last_modified: Date | undefined;

  readonly active_spec: string | undefined;
}

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
  looking_for_guild?: LFG,
  created_by?: string,
  updated_by?: string,
  active_spec?: string,
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
  forceUpdate?: number,
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
  forceUpdate?: number,
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
  status?: string,
  connected_realms?: string[],
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

export interface PopulationByClassInterface {
  death_knight: number,
  demon_hunter: number,
  druid: number,
  hunter: number,
  mage: number,
  monk: number,
  paladin: number,
  priest: number,
  rogue: number,
  shaman: number,
  warlock: number,
  warrior: number
}

export interface PopulationByCovenantsInterface {
  kyrian: number,
  venthyr: number,
  night_fae: number,
  necrolord: number
}

export interface PopulationRealmInterface {
  realm_id: number,
  characters_total: number,
  characters_active: number,
  characters_active_alliance: number,
  characters_active_horde: number,
  characters_active_max_level: number,
  characters_guild_members: number,
  characters_guildless: number,
  players_unique: number,
  players_active_unique: number,
  guilds_total: number,
  guilds_alliance: number,
  guilds_horde: number,
  characters_classes: PopulationByClassInterface,
  characters_covenants: PopulationByCovenantsInterface,
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

export interface MediaInterface {
  id: number,
  avatar: string,
  inset: string,
  main: string,
  'main-raw': string
}

export interface IdNameInterface {
  _id: number,
  name: string
}

export interface MountsInterface {
  mounts: IdNameInterface[]
}

export interface PetsInterface {
  pets: IdNameInterface[],
  hash_b: string,
  hash_a: string
}

export interface ProfessionInterface {
  name: string,
  id: number,
  tier: string,
  skill_points: number,
  max_skill_points: number,
}

export interface ProfessionsInterface {
  professions: Partial<ProfessionInterface>[]
}

export interface RaiderIoInterface {
  raid_progress: { _id: string, progress: string }[],
  rio_score: number
}

export interface CharacterSummaryInterface {
  gender: string,
  faction: string,
  race: string,
  character_class: string,
  active_spec: string,
  realm_id: number,
  realm_name: string,
  realm: string,
  guild_id: string,
  guild: string,
  guild_guid: number,
  guild_rank: number,
  level: number,
  achievement_points: number,
  last_modified: number,
  average_item_level: number,
  equipped_item_level: number,
  chosen_covenant: string,
  renown_level: number,
  status_code: number,
  hash_t: string
}

export interface CharacterStatusI {
  id: number;
  last_modified: Date;
  status_code: number;
}

export interface WowProgressInterface {
  battle_tag: string,
  transfer: boolean,
  days_from: number,
  days_to: number,
  role: string,
  languages: string[]
}

export interface WarcraftLogsInterface {
  wcl_percentile: number
}

export interface WarcraftLogsConfigInterface {
  readonly raid_tier: number
  readonly pages_from: number,
  readonly pages_to: number,
  readonly page: number,
  readonly logs: number,
}

export interface ExportedCharactersInterface {
  readonly name: string,
  readonly server: string
}

export interface GuildSummaryInterface {
  id: number
  name: string,
  faction: string,
  achievement_points: number,
  member_count: number,
  realm_id: number,
  realm: string,
  realm_name: string,
  created_timestamp: number,
  status_code: number,
  last_modified: Date,
}
