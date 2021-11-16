import { LFG, OSINT_SOURCE } from '@app/core/constants';
import { BattleNetOptions } from 'blizzapi';
import { Guild } from '@app/mongo';

export interface IWarcraftLogsActors {
  readonly type: 'NPC' | 'Player' | 'Pet';

  readonly name: string;

  readonly server: string | null;
}

export interface IWarcraftLogsToken {
  readonly token_type: string;

  readonly expires_in: number;

  readonly access_token: string;
}

export class IQOptionsOsintIndex {
  readonly forceUpdate: number;

  readonly createOnlyUnique: boolean;

  readonly iteration?: number;

  readonly guildRank: boolean;

  readonly created_by?: OSINT_SOURCE;

  readonly updated_by: OSINT_SOURCE;
}

export interface ISelfKeyHref {
  readonly href: string;
}

export interface IGuildRoster {
  readonly members: IGuildMember[]
}

export class IGuildMember {
  readonly _id: string;

  readonly id: number;

  readonly rank: number;
}


export interface IRGuildRoster {
  readonly _links: {
    readonly self: ISelfKeyHref
  }

  readonly guild: {
    readonly key: ISelfKeyHref
    readonly name: string;

    readonly id: number;

    readonly realm: {
      readonly key: ISelfKeyHref

      readonly name: string;
      readonly id: number;
      readonly slug: string;
    };
  }

  readonly faction: {
    readonly type: string;
    readonly name: string;
  }

  readonly members: Array<{
    readonly character: {
      readonly key: ISelfKeyHref

      readonly name: string;
      readonly id: number;
      readonly realm: {
        readonly key: ISelfKeyHref

        readonly id: number;
        readonly slug: string;
      };
      readonly level: number;
      readonly playable_class: {
        readonly key: ISelfKeyHref

        readonly id: number;
      }

      readonly playable_race: {
        readonly key: ISelfKeyHref

        readonly id: number;
      }
    }

    readonly rank: number;
  }>
}

export class IQGuild implements Pick<Guild, '_id' | 'name'>, IQOptionsOsintIndex, BattleNetOptions {
  readonly _id: string;

  readonly id?: number;

  readonly name: string;

  readonly realm: string;

  readonly realm_id?: number;

  readonly realm_name?: string;

  readonly faction?: string;

  readonly region: string;

  readonly clientId: string;

  readonly clientSecret: string;

  readonly accessToken: string;

  readonly created_by?: OSINT_SOURCE;

  readonly updated_by: OSINT_SOURCE;

  readonly forceUpdate: number;

  readonly createOnlyUnique: boolean;

  readonly iteration?: number;

  readonly last_modified?: Date;

  readonly guildRank: boolean;
}

export class IQCharacter implements BattleNetOptions, IQOptionsOsintIndex {
  readonly _id: string;

  readonly name: string;

  readonly realm: string;

  readonly guild?: string;

  readonly guild_guid?: number;

  readonly guild_id?: string;

  readonly created_by?: OSINT_SOURCE;

  readonly region: string;

  readonly clientId: string;

  readonly clientSecret: string;

  readonly accessToken: string;

  readonly updated_by: OSINT_SOURCE;

  readonly guildRank: boolean;

  readonly createOnlyUnique: boolean;

  readonly forceUpdate: number;

  readonly iteration?: number;

  readonly looking_for_guild?: LFG;

  readonly updateRIO?: boolean;

  readonly updateWCL?: boolean;

  readonly updateWP?: boolean;

  readonly race?: string;

  readonly level?: number;

  readonly faction?: string;

  readonly gender?: string;

  readonly character_class?: string;

  readonly last_modified?: Date;

  readonly active_spec?: string;
}

export interface IRealm {
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

export interface IPopulationByClass {
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

export interface IPopulationByCovenants {
  kyrian: number,
  venthyr: number,
  night_fae: number,
  necrolord: number
}

export interface IPopulationRealm {
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
  characters_classes: IPopulationByClass,
  characters_covenants: IPopulationByCovenants,
}

export interface IConnectedRealm {
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

export interface IMedia {
  id: number,
  avatar: string,
  inset: string,
  main: string,
  'main-raw': string
}

export interface IidName {
  _id: number,
  name: string
}

export interface IMounts {
  mounts: IidName[],
  mounts_score: number
}

export interface IPets {
  pets: IidName[],
  pets_score: number,
  hash_b: string,
  hash_a: string
}

export interface IProfession {
  name: string,
  id: number,
  tier: string,
  skill_points: number,
  max_skill_points: number,
}

export interface IProfessions {
  professions: Partial<IProfession>[]
}

export interface IRaiderIO {
  raid_progress: { _id: string, progress: string }[],
  rio_score: number
}

export interface ICharacterSummary {
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

export interface ICharacterStatus {
  id: number;
  is_valid: boolean;
  last_modified: Date;
  status_code: number;
}

export interface IWowProgress {
  battle_tag: string,
  transfer: boolean,
  days_from: number,
  days_to: number,
  role: string,
  languages: string[]
}

export interface IWarcraftLogs {
  wcl_percentile: number
}

export interface IWarcraftLogsConfig {
  readonly raid_tier: number
  readonly from: number,
  readonly to: number,
  readonly page: number,
  readonly logs: number,
}

export interface ICharactersExported {
  readonly name: string,
  readonly server: string
}

export interface IGuildSummary {
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

export interface ICharacterWpLfg {
  readonly name: string,
  readonly guild: string,
  readonly raid: string,
  readonly realm: string,
  readonly ilvl: string,
  readonly timestamp: string;
}

export interface IExpansionSet {
  name: string;
  id: number;
}

export interface IExpansionList {
  readonly CLSC: IExpansionSet;
  readonly TBC: IExpansionSet;
  readonly WOTLK: IExpansionSet;
  readonly CATA: IExpansionSet;
  readonly MOP: IExpansionSet;
  readonly WOD: IExpansionSet;
  readonly LGN: IExpansionSet;
  readonly BFA: IExpansionSet;
  readonly SHDW: IExpansionSet;
}
