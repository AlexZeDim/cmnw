import { Account, Entity } from '@app/mongo';
import { ENTITY_NAME } from '@app/core/constants';

export class IAccount implements Pick<Account, 'characters_id' | 'discord_id' | 'battle_tag' | 'cryptonym'> {
  readonly characters_id: string[];

  readonly discord_id: string[];

  readonly battle_tag: string[];

  readonly tags: string[];

  readonly cryptonym: string;
}

export interface IAccounts {
  readonly accounts: IAccount[]
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
