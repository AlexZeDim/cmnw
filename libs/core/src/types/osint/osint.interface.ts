import { CharactersProfileEntity } from '@app/pg';

export interface IWarcraftLogsActors {
  type: 'NPC' | 'Player' | 'Pet';
  name: string;
  server: string | null;
}

export interface IWarcraftLogsToken {
  token_type: string;
  expires_in: number;
  access_token: string;
}

export interface ISelfKeyHref {
  href: string;
}

export interface ISelfWithNameAndId {
  key: ISelfKeyHref;
  name: string;
  id: number;
}

export interface ISelfWithId {
  key: ISelfKeyHref;
  id: number;
}

export interface ISelfRealm {
  slug: string;
}

export interface IGuildRoster {
  readonly members: IGuildMember[];
  updatedAt?: Date;
}

export interface IGuildMember {
  guid: string;
  id: number;
  rank: number;
  level?: number;
}

export interface IRGuildRoster {
  _links: {
    self: ISelfKeyHref;
  };

  guild: {
    key: ISelfKeyHref;
    name: string;

    id: number;

    realm: {
      key: ISelfKeyHref;

      name: string;
      id: number;
      slug: string;
    };
  };

  faction: INameWithType;

  members: Array<{
    character: {
      key: ISelfKeyHref;

      name: string;
      id: number;
      realm: {
        key: ISelfKeyHref;

        id: number;
        slug: string;
      };
      level: number;
      playable_class: {
        key: ISelfKeyHref;

        id: number;
      };

      playable_race: {
        key: ISelfKeyHref;

        id: number;
      };
    };

    rank: number;
  }>;
}

export interface Locales {
  en_US: string;
  es_MX: string;
  pt_BR: string;
  de_DE: string;
  en_GB: string;
  es_ES: string;
  fr_FR: string;
  it_IT: string;
  ru_RU: string;
  ko_KR: string;
  zh_TW: string;
  zh_CN: string;
}

export interface IPopulationByClass {
  death_knight: number;
  demon_hunter: number;
  druid: number;
  hunter: number;
  mage: number;
  monk: number;
  paladin: number;
  priest: number;
  rogue: number;
  shaman: number;
  warlock: number;
  warrior: number;
}

export interface IPopulationByCovenants {
  kyrian: number;
  venthyr: number;
  night_fae: number;
  necrolord: number;
}

export interface IPopulationRealm {
  realm_id: number;
  characters_total: number;
  characters_active: number;
  characters_active_alliance: number;
  characters_active_horde: number;
  characters_active_max_level: number;
  characters_guild_members: number;
  characters_guildless: number;
  players_unique: number;
  players_active_unique: number;
  guilds_total: number;
  guilds_alliance: number;
  guilds_horde: number;
  characters_classes: IPopulationByClass;
  characters_covenants: IPopulationByCovenants;
}

export interface IConnectedRealm {
  id: string;
  has_queue: boolean;
  status: {
    name: string;
  };
  population: INameWithType;
  realms: [
    {
      id: number;
      region: {
        key: {
          href: string;
        };
        name: string;
        id: number;
      };
      connected_realm: {
        href: string;
      };
      name: string;
      category: string;
      locale: string;
      timezone: string;
      type: {
        type: string;
        name: string;
      };
      is_tournament: boolean;
      slug: string;
    },
  ];
  mythic_leaderboards: {
    href: string;
  };
  auctions: {
    href: string;
  };
}

export interface Media {
  avatarImage: string;
  insetImage: string;
  mainImage: string;
}

export interface ICharacterMediaAssets {
  key: 'avatar' | 'main-raw' | 'inset';
  value: string;
}

export interface ICharacterMedia {
  character: {
    key: ISelfKeyHref;
    id: number;
    name: string;
    realm: ISelfWithNameAndId & ISelfRealm;
  };
  assets: Array<ICharacterMediaAssets>;
}

export interface IMountsNameWithId {
  mount: INameWithId;
}

export interface INameWithType {
  type: string;
  name: string;
}

export interface INameWithId {
  id: number;
  name: string;
}

export interface IMounts {
  mountsNumber: number;
}

export interface IPets {
  petsNumber: number;
  hashB: string;
  hashA: string;
}

export interface IPetType {
  id: number;
  species: {
    key: ISelfKeyHref;
    id: number;
    name: string;
  };
  stats: { breed_id: number; health: number; speed: number };
  quality: INameWithType;
  creature_display: {
    key: ISelfKeyHref;
    id: number;
  };
  name?: string;
  is_active: boolean;
  level: string | number;
}

export interface IProfession {
  name: string;
  id: number;
  tier: string;
  skillPoints: number;
  maxSkillPoints: number;
}

export interface IProfessions {
  professions: Partial<IProfession>[];
}

export interface IRaidProgressRIO {
  id: string;
  progress: string;
}

export interface IRaiderIO {
  raidProgress: Array<IRaidProgressRIO>;
  rioScore: number;
}

export interface CharacterSummary {
  guid: string;
  name: string;
  gender: string;
  faction: string;
  race: string;
  class: string;
  specialization: string;
  realmId: number;
  realmName: string;
  realm: string;
  guildId: number;
  guild: string;
  guildGuid: string;
  guildRank: number;
  level: number;
  achievementPoints: number;
  lastModified: Date;
  averageItemLevel: number;
  equippedItemLevel: number;
  covenantId: string;
  statusCode: number;
  hashT: string;
}

export interface ICharacterSummary {
  id: number;
  name: string;
  gender: INameWithType;
  faction: INameWithType;
  race: ISelfWithNameAndId;
  character_class: ISelfWithNameAndId;
  active_spec: ISelfWithNameAndId;
  realm: ISelfWithNameAndId & ISelfRealm;
  guild?: ISelfWithNameAndId & {
    realm: ISelfWithNameAndId & ISelfRealm;
    faction: INameWithType;
  };
  level: number;
  experience: number;
  achievement_points: number;
  achievements: ISelfKeyHref;
  titles: ISelfKeyHref;
  pvp_summary: ISelfKeyHref;
  encounters: ISelfKeyHref;
  media: ISelfKeyHref;
  last_login_timestamp: number;
  average_item_level: number;
  equipped_item_level: number;
  specializations: ISelfKeyHref;
  statistics: ISelfKeyHref;
  mythic_keystone_profile: ISelfKeyHref;
  equipment: ISelfKeyHref;
  appearance: ISelfKeyHref;
  collections: ISelfKeyHref;
  reputations: ISelfKeyHref;
  quests: ISelfKeyHref;
  achievements_statistics: ISelfKeyHref;
  professions: ISelfKeyHref;
  covenant_progress?: {
    chosen_covenant: ISelfWithNameAndId;
    renown_level: number;
    soulbinds: ISelfKeyHref;
  };
}

export interface ICharacterRaiderIo {
  name: string;
  race: string;
  class: string;
  active_spec_name: string;
  active_spec_role: string;
  gender: string;
  faction: string;
  achievement_points: number;
  honorable_kills: number;
  thumbnail_url: string;
  region: string;
  realm: string;
  last_crawled_at: string;
  profile_url: string;
  profile_banner: string;
  mythic_plus_scores_by_season: Array<IRaiderIoMythicPlus>;
  raid_progression: IRaiderIORaidProgress;
}

export interface IRaiderIoRaid {
  summary: string;
  total_bosses: number;
  normal_bosses_killed: number;
  heroic_bosses_killed: number;
  mythic_bosses_killed: number;
}

export interface IRaiderIORaidProgress {
  [key: string]: IRaiderIoRaid;
}

export interface IRaiderIoMythicPlusScores {
  all: number;
  dps: number;
  healer: number;
  tank: number;
  spec_0: number;
  spec_1: number;
  spec_2: number;
  spec_3: number;
}

export interface IRaiderIoMythicPlusSegmentsValue {
  score: number;
  color: string;
}

export interface IRaiderIoMythicPlus {
  season: string;
  scores: IRaiderIoMythicPlusScores;
  segments: Record<
    keyof IRaiderIoMythicPlusScores,
    IRaiderIoMythicPlusSegmentsValue
  >;
}

export interface ICharacterStatus {
  id: number;
  is_valid: boolean;
  last_modified: Date;
  status_code: number;
}

export interface IWowProgress {
  battleTag: string;
  readyToTransfer: boolean;
  raidDays: string[];
  playRole: string;
  languages: string[];
}

export interface IWarcraftLogsMap {
  wclId: number;
  fieldName: keyof Pick<CharactersProfileEntity, 'heroicLogs' | 'mythicLogs'>;
}

export interface IWarcraftLog {
  normalLogs: number;
  heroicLogs: number;
  mythicLogs: number;
}

export interface IWarcraftLogsConfig {
  raidTier: number;
  from: number;
  to: number;
  page: number;
  logs: number;
}

export interface ICharacterGuildMember {
  guid: string;
  id: number;
  name: string;
  guildNameSlug: string;
  rank: number;
  level: number | null;
  class: string | null;
}

export interface IGuildSummary {
  id: number;
  name: string;
  faction: string;
  achievementPoints: number;
  membersCount: number;
  realmId: number;
  realm: string;
  realmName: string;
  createdTimestamp: number;
  statusCode: number;
  lastModified: Date;
}

export interface ICharacterQueueWP {
  guid: string;
  name: string;
  guild: string;
  raid: string;
  realm: string;
  itemLevel: string;
  timestamp: string;
}

export interface IExpansionSet {
  name: string;
  id: number;
}

export interface IExpansionList {
  CLSC: IExpansionSet;
  TBC: IExpansionSet;
  WOTLK: IExpansionSet;
  CATA: IExpansionSet;
  MOP: IExpansionSet;
  WOD: IExpansionSet;
  LGN: IExpansionSet;
  BFA: IExpansionSet;
  SHDW: IExpansionSet;
}
