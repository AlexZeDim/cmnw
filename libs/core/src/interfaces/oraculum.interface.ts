import { Account, Entity } from '@app/mongo';
import { ENTITY_NAME } from '@app/core/constants';

export class IAccount implements Pick<Account, 'discord_id' | 'battle_tag' | 'cryptonym' | 'clearance' | 'is_index'> {
  readonly discord_id: string[];

  readonly battle_tag: string[];

  readonly tags: string[];

  readonly clearance: string[];

  readonly cryptonym: string;

  readonly is_index: boolean;
}

export class IEntity implements Pick<Entity, 'entity' | 'name' | 'languages' | 'tags'> {
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
