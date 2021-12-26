import { Account, Entity } from '@app/mongo';
import { ENTITY_NAME } from '@app/core/constants';

export class OraculumChannel {
  id?: string;
  readonly name: string;
  readonly type: 'GUILD_CATEGORY' | 'GUILD_TEXT' | 'GUILD_VOICE';
  readonly mirror: boolean;
  channel?: any;
  channels?: OraculumChannels;
}

export interface IQDelivery {
  readonly text: string;
  readonly channelsId: string[];
}

class OraculumChannels {
  [key: string]: OraculumChannel;
}

export class OraculumCore {

  coreId: string;

  coreName: string;

  roles = {
    A: {
      id: undefined,
      name: 'A',
      mentionable: false,
      position: 3,
      permissions: undefined,
    },
    D: {
      id: undefined,
      name: 'D',
      mentionable: false,
      position: 2,
      permissions: undefined,
    },
    C: {
      id: undefined,
      name: 'C',
      mentionable: false,
      position: 1,
      permissions: undefined,
    },
    V: {
      id: undefined,
      name: 'V',
      mentionable: false,
      position: 4,
      permissions: undefined,
    }
  };

  channels: OraculumChannels = {
    communication: {
      id: undefined,
      name: 'communication',
      type: 'GUILD_CATEGORY',
      channel: undefined,
      mirror: false,
      channels: {
        ['📞']: {
          id: undefined,
          name: '📞',
          type: 'GUILD_VOICE',
          channel: undefined,
          mirror: false,
        },
        ['🏴']: {
          id: undefined,
          name: '🏴',
          type: 'GUILD_VOICE',
          channel: undefined,
          mirror: false,
        },
        ['📠']: {
          id: undefined,
          name: '📠',
          type: 'GUILD_VOICE',
          channel: undefined,
          mirror: false,
        },
        ['🗼']: {
          id: undefined,
          name: '🗼',
          type: 'GUILD_VOICE',
          channel: undefined,
          mirror: false,
        },
      },
    },
    logs: {
      id: undefined,
      name: 'logs',
      type: 'GUILD_CATEGORY',
      channel: undefined,
      mirror: false,
      channels: {
        ingress: {
          id: undefined,
          name: 'ingress',
          type: 'GUILD_TEXT',
          channel: undefined,
          mirror: false,
        },
        egress: {
          id: undefined,
          name: 'egress',
          type: 'GUILD_TEXT',
          channel: undefined,
          mirror: false,
        },
        regress: {
          id: undefined,
          name: 'regress',
          type: 'GUILD_TEXT',
          channel: undefined,
          mirror: false,
        }
      },
    },
    files: {
      id: undefined,
      name: 'files',
      type: 'GUILD_CATEGORY',
      channel: undefined,
      mirror: true,
    },
    oraculum: {
      id: undefined,
      name: 'oraculum',
      type: 'GUILD_CATEGORY',
      channel: undefined,
      mirror: false,
    },
    atlas: {
      id: undefined,
      name: 'atlas',
      type: 'GUILD_CATEGORY',
      channel: undefined,
      mirror: true,
    },
    operations: {
      id: undefined,
      name: 'operations',
      type: 'GUILD_CATEGORY',
      channel: undefined,
      mirror: false,
      channels: {
        flow: {
          id: undefined,
          name: 'flow',
          type: 'GUILD_TEXT',
          channel: undefined,
          mirror: false,
        },
        board: {
          id: undefined,
          name: 'board',
          type: 'GUILD_TEXT',
          channel: undefined,
          mirror: false,
        },
      }
    },
  };

  constructor(core: Pick<OraculumCore, 'coreId' | 'coreName'>) {
    Object.assign(this, core);
  }
}

export class IAccount implements
  Pick<Account, 'discord_id' | 'battle_tag' | 'cryptonym' | 'clearance' | 'is_index'> {
  readonly discord_id: string;

  readonly battle_tag: string;

  readonly tags: string[];

  readonly clearance: string[];

  readonly cryptonym: string;

  readonly is_index: boolean;
}

export class IEntity implements
  Pick<Entity, 'entity' | 'name' | 'languages' | 'tags'> {
  readonly entity: ENTITY_NAME;

  readonly name: string;

  readonly languages: string[];

  readonly tags: string[];
}

export interface IEntities {
  readonly entities: IEntity[]
}

export interface IGuessLanguage {
  readonly alpha3: string;
  readonly alpha2: string;
  readonly language: string;
  readonly score: number;
}

export interface ICastingContext {
  readonly column: number | string;
  readonly empty_lines: number;
  readonly error: Error;
  readonly header: boolean;
  readonly index: number;
  readonly quoting: boolean;
  readonly lines: number;
  readonly records: number;
  readonly invalid_field_length: number;
}

export interface INerProcess {
  readonly locale: string;
  readonly utterance: string;
  readonly settings: any;
  readonly languageGuessed: boolean;
  readonly localeIso2: string;
  readonly language: string;
  readonly nluAnswer: INluAnswer;
  readonly classification: Array<IClassification>;
  readonly intent: string;
  readonly score: number;
  readonly optionalUtterance: string;
  readonly sourceEntities: INerEntity[];
  readonly entities: INerEntity[];
  readonly answers: string[];
  readonly answer: string;
  readonly actions: any[];
  readonly sentiment: ISentiment;
}

interface INerEntity {
  readonly start: number;
  readonly end: number;
  readonly len: number;
  readonly levenshtein: number;
  readonly accuracy: number;
  readonly entity: string;
  readonly type: string;
  readonly option: string;
  readonly sourceText: string;
  readonly utteranceText: string;
}

interface ISentiment {
  readonly score: number;
  readonly numWords: number;
  readonly numHits: number;
  readonly average: number;
  readonly type: string;
  readonly locale: string;
  readonly vote: string;
}

interface INluAnswer {
  readonly classification: IClassification;
  readonly entities: Array<INerEntity> | undefined;
  readonly explanation: any;
}

interface IClassification {
  readonly intent: string;
  readonly score: number;
}
