import { Account, Entity } from '@app/mongo';

export class AccountMock implements Pick<Account, 'characters_id' | 'discord_id' | 'battle_tag' | 'cryptonym'> {
  readonly characters_id: string[];

  readonly discord_id: string[];

  readonly battle_tag: string[];

  readonly tags: string[];

  readonly cryptonym: string;
}

export interface AccountsMock {
  readonly accounts: AccountMock[]
}

export class EntityMock implements Pick<Entity, 'entity' | 'name' | 'languages' | 'tags'> {
  readonly parentId: string;

  readonly entity: string;

  readonly name: string;

  readonly languages: string[];

  readonly tags: string[];
}

export interface EntityMocks {
  readonly entities: EntityMock[]
}
