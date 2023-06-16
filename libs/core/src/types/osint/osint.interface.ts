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

export interface ISelfKeyHref {
  readonly href: string;
}

export interface IGuildRoster {
  readonly members: IGuildMember[];
  updatedAt?: Date;
}

export interface IGuildMember {
  readonly guid: string;
  readonly id: number;
  readonly rank: number;
  readonly level?: number;
}

export interface IRGuildRoster {
  readonly _links: {
    readonly self: ISelfKeyHref;
  };

  readonly guild: {
    readonly key: ISelfKeyHref;
    readonly name: string;

    readonly id: number;

    readonly realm: {
      readonly key: ISelfKeyHref;

      readonly name: string;
      readonly id: number;
      readonly slug: string;
    };
  };

  readonly faction: {
    readonly type: string;
    readonly name: string;
  };

  readonly members: Array<{
    readonly character: {
      readonly key: ISelfKeyHref;

      readonly name: string;
      readonly id: number;
      readonly realm: {
        readonly key: ISelfKeyHref;

        readonly id: number;
        readonly slug: string;
      };
      readonly level: number;
      readonly playable_class: {
        readonly key: ISelfKeyHref;

        readonly id: number;
      };

      readonly playable_race: {
        readonly key: ISelfKeyHref;

        readonly id: number;
      };
    };

    readonly rank: number;
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
  population: {
    type: string;
    name: string;
  };
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

export interface IMedia {
  id: number;
  avatar: string;
  inset: string;
  main: string;
  'main-raw': string;
}

export interface IMountsNameWithId {
  mount: INameWithId;
}

export interface INameWithId {
  id: number;
  name: string;
}

export interface IMounts {
  mounts: INameWithId[];
  mountsNumber: number;
}

export interface IPets {
  pets: INameWithId[];
  petsNumber: number;
  hashB: string;
  hashA: string;
}

export interface IPetType {
  id: number;
  species: { name: string };
  name: string;
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

export interface ICharacterSummary {
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
  lastModified: number;
  averageItemLevel: number;
  equippedItemLevel: number;
  covenantId: string;
  statusCode: number;
  hashT: string;
}

export interface ICharacterStatus {
  id: number;
  is_valid: boolean;
  last_modified: Date;
  status_code: number;
}

export interface IWowProgress {
  battleTag: string;
  transfer: boolean;
  daysFrom: number;
  daysTo: number;
  role: string;
  languages: string[];
}

export interface IWarcraftLog {
  wclMythicPercentile: number;
}

export interface IWarcraftLogsConfig {
  readonly raidTier: number;
  readonly from: number;
  readonly to: number;
  readonly page: number;
  readonly logs: number;
}

export interface ICharactersExported {
  readonly name: string;
  readonly server: string;
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

export interface ICharacterWpLfg {
  readonly name: string;
  readonly guild: string;
  readonly raid: string;
  readonly realm: string;
  readonly ilvl: string;
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
